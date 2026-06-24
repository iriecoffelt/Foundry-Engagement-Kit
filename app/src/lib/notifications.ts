import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { CadenceAlert } from "./cadence";

const NOTIFIED_KEY = "fek-notified-alerts";
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
