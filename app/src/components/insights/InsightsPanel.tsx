import type { ReactNode } from "react";
import { AlertTriangle, Ban, CalendarClock, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { loadWorkspaceInsights, type WorkspaceInsights } from "../../lib/insights";
import type { ProjectMeta } from "../../types";

interface InsightsPanelProps {
  projects: ProjectMeta[];
  onOpenPath: (path: string) => void;
}

export function InsightsPanel({ projects, onOpenPath }: InsightsPanelProps) {
  const [insights, setInsights] = useState<WorkspaceInsights | null>(null);

  useEffect(() => {
    if (!projects.length) return;
    loadWorkspaceInsights(projects).then(setInsights);
  }, [projects]);

  if (!insights || !projects.length) return null;

  const hasContent =
    insights.blockers.length > 0 || insights.risks.length > 0 || insights.lastSyncs.length > 0;
  if (!hasContent) return null;

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-brand-500" />
        <h3 className="text-lg font-semibold text-fg-primary">Insights</h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {insights.blockers.length > 0 && (
          <InsightCard title="Open blockers" icon={Ban} count={insights.blockers.length}>
            <ul className="space-y-2">
              {insights.blockers.slice(0, 4).map((b, i) => (
                <li key={i}>
                  <button
                    onClick={() => onOpenPath(b.path)}
                    className="w-full text-left text-sm hover:text-brand-500"
                  >
                    <span className="font-medium text-fg-body">{b.project}</span>
                    <span className="text-fg-muted"> — {b.blocker}</span>
                    {b.escalate && (
                      <span className="ml-1 text-xs text-amber-500">escalate</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </InsightCard>
        )}

        {insights.risks.length > 0 && (
          <InsightCard title="Recent risks" icon={AlertTriangle} count={insights.risks.length}>
            <ul className="space-y-2">
              {insights.risks.slice(0, 4).map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => onOpenPath(r.path)}
                    className="w-full text-left text-sm hover:text-brand-500"
                  >
                    <span className="font-medium text-fg-body">{r.project}</span>
                    <span className="text-fg-muted"> — {r.risk}</span>
                    <span className="block text-xs text-fg-faint">
                      {r.likelihood} / {r.impact}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </InsightCard>
        )}

        {insights.lastSyncs.length > 0 && (
          <InsightCard title="Last customer sync" icon={CalendarClock} count={insights.lastSyncs.length}>
            <ul className="space-y-2">
              {insights.lastSyncs.map((s, i) => (
                <li key={i}>
                  <button
                    onClick={() => onOpenPath(s.path)}
                    className="w-full text-left text-sm hover:text-brand-500"
                  >
                    <span className="font-medium text-fg-body">{s.project}</span>
                    <span className="block text-xs text-fg-muted">
                      {s.date || "No date"}
                      {s.meetingName ? ` · ${s.meetingName}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </InsightCard>
        )}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof Ban;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="card-kit p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-fg-muted" />
          <h4 className="text-sm font-medium text-fg-body">{title}</h4>
        </div>
        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-fg-muted">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}
