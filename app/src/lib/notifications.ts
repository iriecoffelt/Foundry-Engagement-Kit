import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { CadenceAlert } from "./cadence";
import type { CalendarEvent } from "./calendarTypes";

const NOTIFIED_KEY = "fek-notified-alerts";
const NOTIFIED_MEETINGS_KEY = "fek-notified-meetings";
const PERMISSION_KEY = "fek-notifications-enabled";

export function notificationsEnabled(): boolean {
  return localStorage.getItem(PERMISSION_KEY) === "true";
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(PERMISSION_KEY, enabled ? "true" : "false");
}

export async function requestNotificationPermission(): Promise<"granted" | "denied" | "unsupported"> {
  try {
    if (await isPermissionGranted()) {
      setNotificationsEnabled(true);
      return "granted";
    }
    const result = await requestPermission();
    const ok = result === "granted";
    setNotificationsEnabled(ok);
    return ok ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

function notifiedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markNotified(id: string): void {
  const set = notifiedIds();
  set.add(id);
  const arr = [...set].slice(-50);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

export async function notifyCadenceAlerts(alerts: CadenceAlert[]): Promise<void> {
  if (!notificationsEnabled()) return;
  if (!(await isPermissionGranted())) return;

  const today = new Date().toISOString().slice(0, 10);
  for (const alert of alerts.slice(0, 3)) {
    const id = `${today}-${alert.type}-${alert.projectSlug}`;
    if (notifiedIds().has(id)) continue;
    sendNotification({
      title: "Foundry Engagement Kit",
      body: alert.message,
    });
    markNotified(id);
  }
}

export function startCadenceNotificationPoller(
  getAlerts: () => Promise<CadenceAlert[]>,
  intervalMs = 30 * 60 * 1000,
): () => void {
  const tick = async () => {
    try {
      const alerts = await getAlerts();
      await notifyCadenceAlerts(alerts);
    } catch {
      /* ignore */
    }
  };
  tick();
  const handle = window.setInterval(tick, intervalMs);
  return () => window.clearInterval(handle);
}

// Meeting reminder notifications

const REMINDER_MINUTES = [30, 15] as const;

function notifiedMeetingIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_MEETINGS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markMeetingNotified(id: string): void {
  const set = notifiedMeetingIds();
  set.add(id);
  const arr = [...set].slice(-100);
  localStorage.setItem(NOTIFIED_MEETINGS_KEY, JSON.stringify(arr));
}

function getMinutesUntilEvent(event: CalendarEvent): number {
  if (event.is_all_day) return Infinity;
  const start = new Date(event.start_time).getTime();
  const now = Date.now();
  return Math.round((start - now) / 60000);
}

function formatReminderTime(minutes: number): string {
  if (minutes <= 1) return "now";
  if (minutes < 60) return `in ${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  return `in ${hours}h ${mins}m`;
}

export async function checkMeetingReminders(events: CalendarEvent[]): Promise<void> {
  if (!notificationsEnabled()) return;
  if (!(await isPermissionGranted())) return;

  const today = new Date().toISOString().slice(0, 10);
  const notified = notifiedMeetingIds();

  for (const event of events) {
    if (event.is_all_day) continue;
    
    const minutesUntil = getMinutesUntilEvent(event);
    if (minutesUntil < 0) continue; // Already started
    
    for (const reminderMinutes of REMINDER_MINUTES) {
      const id = `${today}-${event.id}-${reminderMinutes}`;
      if (notified.has(id)) continue;
      
      // Check if we're within the reminder window (±2 minutes tolerance)
      if (minutesUntil <= reminderMinutes && minutesUntil >= reminderMinutes - 2) {
        sendNotification({
          title: `Meeting ${formatReminderTime(minutesUntil)}`,
          body: event.title,
        });
        markMeetingNotified(id);
        break; // Only one notification per check cycle per event
      }
    }
  }
}

export function startMeetingReminderPoller(
  getEvents: () => Promise<CalendarEvent[]>,
  intervalMs = 60 * 1000, // Check every minute
): () => void {
  const tick = async () => {
    try {
      const events = await getEvents();
      await checkMeetingReminders(events);
    } catch {
      /* ignore */
    }
  };
  tick();
  const handle = window.setInterval(tick, intervalMs);
  return () => window.clearInterval(handle);
}
