import { invoke } from "@tauri-apps/api/core";
import type { CalendarEvent, CalendarInfo, CalendarAccessStatus } from "./calendarTypes";

function isTauriApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getCalendarAccessStatus(): Promise<CalendarAccessStatus> {
  if (!isTauriApp()) {
    return {
      has_access: false,
      status: "unsupported_platform",
      can_request: false,
    };
  }

  try {
    return await invoke<CalendarAccessStatus>("calendar_get_access_status");
  } catch (e) {
    console.error("Failed to get calendar access status:", e);
    return {
      has_access: false,
      status: "unknown",
      can_request: false,
    };
  }
}

export async function requestCalendarAccess(): Promise<boolean> {
  if (!isTauriApp()) {
    return false;
  }

  try {
    return await invoke<boolean>("calendar_request_access");
  } catch (e) {
    console.error("Failed to request calendar access:", e);
    return false;
  }
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  if (!isTauriApp()) {
    return [];
  }

  try {
    return await invoke<CalendarInfo[]>("calendar_list_calendars");
  } catch (e) {
    console.error("Failed to list calendars:", e);
    return [];
  }
}

export async function getEventsForDate(date: string): Promise<CalendarEvent[]> {
  if (!isTauriApp()) {
    return [];
  }

  try {
    return await invoke<CalendarEvent[]>("calendar_get_events_for_date", { date });
  } catch (e) {
    console.error("Failed to get events for date:", e);
    return [];
  }
}

export async function getTodaysEvents(): Promise<CalendarEvent[]> {
  if (!isTauriApp()) {
    return [];
  }

  try {
    return await invoke<CalendarEvent[]>("calendar_get_todays_events");
  } catch (e) {
    console.error("Failed to get today's events:", e);
    return [];
  }
}

export async function getTodaysMeetings(): Promise<CalendarEvent[]> {
  const events = await getTodaysEvents();
  return events.filter((e) => !e.is_all_day);
}

export async function getUpcomingMeetings(
  events?: CalendarEvent[],
): Promise<CalendarEvent[]> {
  const allEvents = events ?? (await getTodaysMeetings());
  const now = Date.now();

  return allEvents.filter((e) => {
    if (e.is_all_day) return false;
    const start = new Date(e.start_time).getTime();
    return start > now;
  });
}

export async function getCurrentMeeting(
  events?: CalendarEvent[],
): Promise<CalendarEvent | null> {
  const allEvents = events ?? (await getTodaysMeetings());
  const now = Date.now();

  return (
    allEvents.find((e) => {
      if (e.is_all_day) return false;
      const start = new Date(e.start_time).getTime();
      const end = new Date(e.end_time).getTime();
      return now >= start && now <= end;
    }) ?? null
  );
}

export function openMeetingUrl(url: string): void {
  window.open(url, "_blank");
}

export const calendarApi = {
  getAccessStatus: getCalendarAccessStatus,
  requestAccess: requestCalendarAccess,
  listCalendars,
  getEventsForDate,
  getTodaysEvents,
  getTodaysMeetings,
  getUpcomingMeetings,
  getCurrentMeeting,
  openMeetingUrl,
};
