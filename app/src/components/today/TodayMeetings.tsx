import {
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Users,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  calendarApi,
} from "../../lib/calendarApi";
import type { CalendarAccessStatus, CalendarEvent } from "../../lib/calendarTypes";
import {
  formatEventTime,
  getMeetingPlatform,
  isEventNow,
  isEventUpcoming,
} from "../../lib/calendarTypes";
import { Skeleton } from "../Skeleton";
import { Tooltip } from "../Tooltip";

interface TodayMeetingsProps {
  onSelectMeeting?: (event: CalendarEvent) => void;
  compact?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Teams",
  webex: "Webex",
};

function MeetingPlatformBadge({ url }: { url: string | null }) {
  const platform = getMeetingPlatform(url);
  if (!platform) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-600/20 px-2 py-0.5 text-xs text-brand-300">
      <Video size={10} />
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

function MeetingCard({
  event,
  onSelect,
  compact,
}: {
  event: CalendarEvent;
  onSelect?: (event: CalendarEvent) => void;
  compact?: boolean;
}) {
  const isNow = isEventNow(event);
  const isUpcoming = isEventUpcoming(event, 15);

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.meeting_url) {
      calendarApi.openMeetingUrl(event.meeting_url);
    }
  };

  const handleClick = () => {
    onSelect?.(event);
  };

  const cardClasses = [
    "card-kit-interactive w-full text-left transition-all",
    compact ? "p-3" : "p-4",
    isNow && "ring-2 ring-brand-500/50 border-brand-500/30",
    isUpcoming && !isNow && "border-amber-500/30",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" onClick={handleClick} className={cardClasses}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isNow && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-600/30 px-2 py-0.5 text-xs font-medium text-brand-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
                Now
              </span>
            )}
            {isUpcoming && !isNow && (
              <span className="inline-flex items-center rounded-full bg-amber-600/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                Soon
              </span>
            )}
            <MeetingPlatformBadge url={event.meeting_url} />
          </div>

          <p className="mt-1 font-medium text-fg-primary">{event.title}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {formatEventTime(event)}
            </span>
            {event.calendar_name && (
              <span
                className="inline-flex items-center gap-1"
                style={{
                  color: event.calendar_color || undefined,
                }}
              >
                <Calendar size={12} />
                {event.calendar_name}
              </span>
            )}
            {event.attendees.length > 0 && (
              <Tooltip
                content={event.attendees.slice(0, 10).join(", ") + (event.attendees.length > 10 ? "…" : "")}
              >
                <span className="inline-flex items-center gap-1">
                  <Users size={12} />
                  {event.attendees.length}
                </span>
              </Tooltip>
            )}
          </div>

          {!compact && event.location && !event.meeting_url && (
            <p className="mt-1.5 text-xs text-fg-faint">{event.location}</p>
          )}
        </div>

        {event.meeting_url && (
          <Tooltip content="Join meeting">
            <button
              type="button"
              onClick={handleJoin}
              className="shrink-0 rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-500"
            >
              <ExternalLink size={16} />
            </button>
          </Tooltip>
        )}
      </div>
    </button>
  );
}

function CalendarAccessPrompt({
  status,
  onRequest,
  requesting,
}: {
  status: CalendarAccessStatus;
  onRequest: () => void;
  requesting: boolean;
}) {
  if (status.status === "unsupported_platform") {
    return (
      <div className="card-kit border-dashed p-6 text-center">
        <ShieldAlert size={24} className="mx-auto text-fg-muted" />
        <p className="mt-2 text-sm text-fg-secondary">
          Calendar integration is only available on macOS
        </p>
      </div>
    );
  }

  if (status.status === "denied") {
    return (
      <div className="card-kit border-dashed border-amber-900/30 bg-amber-950/10 p-6 text-center">
        <ShieldAlert size={24} className="mx-auto text-amber-400" />
        <p className="mt-2 text-sm text-fg-secondary">
          Calendar access was denied. Please enable it in System Settings → Privacy & Security → Calendars.
        </p>
        <button
          type="button"
          onClick={() => calendarApi.openMeetingUrl("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")}
          className="mt-3 text-sm text-brand-400 hover:text-brand-300"
        >
          Open System Settings
        </button>
      </div>
    );
  }

  if (status.can_request) {
    return (
      <div className="card-kit border-dashed p-6 text-center">
        <Calendar size={24} className="mx-auto text-brand-400" />
        <p className="mt-2 text-sm text-fg-secondary">
          Connect your calendar to see today's meetings
        </p>
        <button
          type="button"
          onClick={onRequest}
          disabled={requesting}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {requesting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Requesting access…
            </>
          ) : (
            <>
              <Calendar size={14} />
              Connect Calendar
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="card-kit border-dashed p-6 text-center">
      <ShieldAlert size={24} className="mx-auto text-fg-muted" />
      <p className="mt-2 text-sm text-fg-secondary">
        Unable to access calendar
      </p>
    </div>
  );
}

export function TodayMeetings({ onSelectMeeting, compact = false }: TodayMeetingsProps) {
  const [status, setStatus] = useState<CalendarAccessStatus | null>(null);
  const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessStatus = await calendarApi.getAccessStatus();
      setStatus(accessStatus);

      if (accessStatus.has_access) {
        const events = await calendarApi.getTodaysMeetings();
        setMeetings(events);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();

    const interval = setInterval(loadMeetings, 5 * 60 * 1000);
    return () => clearInterval(interval);
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

  if (loading && !status) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-kit border-dashed border-red-900/30 bg-red-950/10 p-4 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <button
          type="button"
          onClick={loadMeetings}
          className="mt-2 text-sm text-brand-400 hover:text-brand-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!status?.has_access) {
    return (
      <CalendarAccessPrompt
        status={status!}
        onRequest={handleRequestAccess}
        requesting={requesting}
      />
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="card-kit border-dashed p-6 text-center">
        <Calendar size={24} className="mx-auto text-fg-muted" />
        <p className="mt-2 text-sm text-fg-secondary">No meetings today</p>
        <p className="mt-1 text-xs text-fg-faint">Time for deep work!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          event={meeting}
          onSelect={onSelectMeeting}
          compact={compact}
        />
      ))}
    </div>
  );
}

export function TodayMeetingsPanel({ onSelectMeeting }: TodayMeetingsProps) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-brand-500" />
        <h3 className="text-lg font-semibold text-fg-primary">Today's Meetings</h3>
      </div>
      <TodayMeetings onSelectMeeting={onSelectMeeting} />
    </div>
  );
}
