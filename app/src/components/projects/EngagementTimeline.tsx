import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import {
  loadEngagementTimeline,
  TIMELINE_KIND_LABELS,
  type TimelineEvent,
} from "../../lib/timeline";
import type { ProjectTab } from "./ProjectWorkspaceHeader";

interface EngagementTimelineProps {
  projectPath: string;
  projectSlug: string;
  onOpenTab?: (tab: ProjectTab) => void;
}

const KIND_COLORS: Record<string, string> = {
  start: "bg-brand-500",
  milestone: "bg-violet-500",
  standup: "bg-blue-500",
  weekly: "bg-indigo-500",
  sync: "bg-amber-500",
  decision: "bg-emerald-500",
  blocker: "bg-red-500",
  risk: "bg-orange-500",
  uat: "bg-teal-500",
};

export function EngagementTimeline({
  projectPath,
  projectSlug,
  onOpenTab,
}: EngagementTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = () => {
      loadEngagementTimeline(projectPath, projectSlug)
        .then((data) => {
          if (!cancelled) setEvents(data);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 1200 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const id = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [projectPath, projectSlug]);

  return (
    <div className="card-kit p-5">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-brand-400" />
        <h3 className="font-semibold text-fg-primary">Engagement timeline</h3>
      </div>
      <p className="mt-1 text-sm text-fg-secondary">
        Milestones, standups, syncs, decisions, and register activity.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-fg-muted">Loading timeline…</p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">No timeline events yet.</p>
      ) : (
        <ol className="mt-5 space-y-0">
          {events.slice(0, 24).map((event, i) => (
            <li key={event.id} className="relative flex gap-3 pb-4">
              {i < Math.min(events.length, 24) - 1 && (
                <span
                  className="absolute left-[7px] top-4 h-full w-px bg-surface-border"
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ${KIND_COLORS[event.kind] || "bg-surface-subtle"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <time className="text-xs text-fg-muted">{event.date}</time>
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg-muted">
                    {TIMELINE_KIND_LABELS[event.kind]}
                  </span>
                </div>
                {event.tab && onOpenTab ? (
                  <button
                    type="button"
                    onClick={() => onOpenTab(event.tab as ProjectTab)}
                    className="mt-0.5 text-left text-sm font-medium text-fg-body hover:text-brand-400"
                  >
                    {event.title}
                  </button>
                ) : (
                  <p className="mt-0.5 text-sm font-medium text-fg-body">{event.title}</p>
                )}
                {event.detail && (
                  <p className="mt-0.5 text-xs text-fg-muted">{event.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {events.length > 24 && (
        <p className="text-xs text-fg-faint">Showing 24 of {events.length} events</p>
      )}
    </div>
  );
}
