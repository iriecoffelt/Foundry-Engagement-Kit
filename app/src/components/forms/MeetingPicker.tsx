import { Calendar, Check, Clock, RefreshCw, Users, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { calendarApi } from "../../lib/calendarApi";
import type { CalendarAccessStatus, CalendarEvent } from "../../lib/calendarTypes";
import { formatEventTime, getMeetingPlatform } from "../../lib/calendarTypes";

interface MeetingPickerProps {
  value: CalendarEvent | null;
  onChange: (event: CalendarEvent | null, formData: MeetingFormData) => void;
}

export interface MeetingFormData {
  meetingName: string;
  attendees: string;
  duration: string;
  meetingUrl: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Meet",
  teams: "Teams",
  webex: "Webex",
};

function formatDuration(event: CalendarEvent): string {
  if (event.is_all_day) return "All day";
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

function eventToFormData(event: CalendarEvent): MeetingFormData {
  return {
    meetingName: event.title,
    attendees: event.attendees.join(", "),
    duration: formatDuration(event),
    meetingUrl: event.meeting_url,
  };
}

export function MeetingPicker({ value, onChange }: MeetingPickerProps) {
  const [status, setStatus] = useState<CalendarAccessStatus | null>(null);
  const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const accessStatus = await calendarApi.getAccessStatus();
      setStatus(accessStatus);

      if (accessStatus.has_access) {
        const events = await calendarApi.getTodaysMeetings();
        const upcomingMeetings = events.filter((e) => {
          const start = new Date(e.start_time).getTime();
          return start >= Date.now() - 30 * 60 * 1000;
        });
        setMeetings(upcomingMeetings);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleRequestAccess = async () => {
    setRequesting(true);
    try {
      const granted = await calendarApi.requestAccess();
      if (granted) {
        await loadMeetings();
      } else {
        const newStatus = await calendarApi.getAccessStatus();
        setStatus(newStatus);
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleSelect = (event: CalendarEvent) => {
    if (value?.id === event.id) {
      onChange(null, { meetingName: "", attendees: "", duration: "30 min", meetingUrl: null });
    } else {
      onChange(event, eventToFormData(event));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-fg-muted">
        <RefreshCw size={14} className="animate-spin" />
        Loading calendar…
      </div>
    );
  }

  if (!status?.has_access) {
    if (status?.can_request) {
      return (
        <div className="rounded-lg border border-dashed border-surface-border bg-surface-raised/50 p-4 text-center">
          <Calendar size={20} className="mx-auto text-fg-muted" />
          <p className="mt-2 text-sm text-fg-secondary">
            Connect your calendar to auto-fill meeting details
          </p>
          <button
            type="button"
            onClick={handleRequestAccess}
            disabled={requesting}
            className="mt-2 inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 disabled:opacity-50"
          >
            {requesting ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Calendar size={12} />
                Connect Calendar
              </>
            )}
          </button>
        </div>
      );
    }

    return null;
  }

  if (meetings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border bg-surface-raised/50 p-4 text-center">
        <Calendar size={20} className="mx-auto text-fg-muted" />
        <p className="mt-2 text-sm text-fg-secondary">
          No upcoming meetings found
        </p>
        <p className="mt-1 text-xs text-fg-faint">
          Fill in the details manually below
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-2 text-sm text-fg-secondary">
        Select from today's calendar or fill in manually:
      </p>
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {meetings.map((meeting) => {
          const isSelected = value?.id === meeting.id;
          const platform = getMeetingPlatform(meeting.meeting_url);

          return (
            <button
              key={meeting.id}
              type="button"
              onClick={() => handleSelect(meeting)}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? "border-brand-500 bg-brand-600/10 ring-1 ring-brand-500/30"
                  : "border-surface-border bg-surface-raised hover:border-surface-border-hover"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg-primary">{meeting.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} />
                      {formatEventTime(meeting)}
                    </span>
                    {meeting.attendees.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Users size={11} />
                        {meeting.attendees.length} attendees
                      </span>
                    )}
                    {platform && (
                      <span className="inline-flex items-center gap-1 text-brand-400">
                        <Video size={11} />
                        {PLATFORM_LABELS[platform]}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
