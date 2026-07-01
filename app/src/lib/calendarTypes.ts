export interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string | null;
  notes: string | null;
  calendar_name: string;
  calendar_color: string | null;
  meeting_url: string | null;
  organizer: string | null;
  attendees: string[];
}

export interface CalendarInfo {
  id: string;
  title: string;
  color: string | null;
  source_name: string;
  is_subscribed: boolean;
}

export interface CalendarAccessStatus {
  has_access: boolean;
  status:
    | "authorized"
    | "write_only"
    | "denied"
    | "restricted"
    | "not_determined"
    | "unsupported_platform"
    | "unknown";
  can_request: boolean;
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.is_all_day) {
    return "All day";
  }

  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function getEventDurationMinutes(event: CalendarEvent): number {
  if (event.is_all_day) return 0;
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function isEventNow(event: CalendarEvent): boolean {
  if (event.is_all_day) return false;
  const now = Date.now();
  const start = new Date(event.start_time).getTime();
  const end = new Date(event.end_time).getTime();
  return now >= start && now <= end;
}

export function isEventUpcoming(event: CalendarEvent, withinMinutes = 30): boolean {
  if (event.is_all_day) return false;
  const now = Date.now();
  const start = new Date(event.start_time).getTime();
  return start > now && start <= now + withinMinutes * 60000;
}

export function getMeetingPlatform(
  url: string | null,
): "zoom" | "google_meet" | "teams" | "webex" | null {
  if (!url) return null;
  if (url.includes("zoom.us")) return "zoom";
  if (url.includes("meet.google.com")) return "google_meet";
  if (url.includes("teams.microsoft.com")) return "teams";
  if (url.includes("webex.com")) return "webex";
  return null;
}
