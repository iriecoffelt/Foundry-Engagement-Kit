import { BarChart3, CalendarX, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPortfolioSummary, type PortfolioSummary } from "../../lib/portfolio";
import { PHASE_LABELS, PHASE_ORDER } from "../../lib/phaseChecklist";
import type { EngagementStatus, ProjectMeta } from "../../types";
import { StatusBadge } from "../StatusBadge";

interface PortfolioHubProps {
  projects: ProjectMeta[];
  onOpenProject: () => void;
}

export function PortfolioHub({ projects, onOpenProject }: PortfolioHubProps) {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    if (!projects.length) return;
    loadPortfolioSummary(projects).then(setSummary);
  }, [projects]);

  if (!projects.length) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-fg-muted">
        Create an engagement to see portfolio metrics.
      </div>
    );
  }

  if (!summary) {
    return <div className="p-8 text-fg-muted">Loading portfolio…</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-brand-500" />
          <div>
            <h2 className="text-2xl font-bold text-fg-primary">Portfolio</h2>
            <p className="text-sm text-fg-secondary">
              Cross-engagement health — {projects.length} active
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PHASE_ORDER.map((phase) => (
            <div key={phase} className="card-kit p-3 text-center">
              <p className="text-2xl font-bold text-fg-primary">
                {summary.phaseCounts[phase] || 0}
              </p>
              <p className="mt-1 text-xs text-fg-muted">{PHASE_LABELS[phase as EngagementStatus]}</p>
            </div>
          ))}
        </div>

        {summary.overdueMilestones.length > 0 && (
          <div className="mt-6 card-kit border-amber-500/30 p-4">
            <div className="flex items-center gap-2 text-amber-500">
              <CalendarX size={18} />
              <h3 className="font-medium">Overdue milestones</h3>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {summary.overdueMilestones.map((m, i) => (
                <li key={i} className="text-fg-body">
                  <span className="font-medium">{m.project}</span> — {m.name}{" "}
                  <span className="text-fg-muted">(due {m.date})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.lowHandoff.length > 0 && (
          <div className="mt-6 card-kit border-red-500/20 p-4">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert size={18} />
              <h3 className="font-medium">Low handoff readiness</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {summary.lowHandoff.map((row) => (
                <li key={row.project.path} className="flex items-center justify-between text-sm">
                  <span className="text-fg-body">{row.project.display_name}</span>
                  <span className="font-medium text-red-400">{row.handoffScore}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold text-fg-primary">All engagements</h3>
          <div className="space-y-2">
            {summary.projects.map((row) => (
              <button
                key={row.project.path}
                onClick={onOpenProject}
                className="card-kit-interactive flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-medium text-fg-primary">{row.project.display_name}</p>
                  <p className="text-sm text-fg-muted">{row.project.customer}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-fg-muted">
                    <p>{row.phaseProgress}% checklist</p>
                    <p>{row.handoffScore}% handoff</p>
                    {row.overdueMilestones > 0 && (
                      <p className="text-amber-500">{row.overdueMilestones} overdue</p>
                    )}
                  </div>
                  <StatusBadge status={row.project.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
