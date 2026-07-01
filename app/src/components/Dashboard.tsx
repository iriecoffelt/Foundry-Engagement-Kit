import { Calendar, CalendarDays, FolderKanban, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadDashboardSnapshot, type DashboardSnapshot } from "../lib/dashboardSnapshot";
import type { ProjectMeta, Section } from "../types";
import { CadenceAlerts } from "./CadenceAlerts";
import { InsightsPanel } from "./insights/InsightsPanel";
import { PrimaryButton } from "./forms/FormField";
import { RecentActivity } from "./RecentActivity";
import { StatusBadge } from "./StatusBadge";
import { ShortcutKbd } from "./ShortcutKbd";
import { Tooltip } from "./Tooltip";

import { TodayPanel } from "./today/TodayPanel";
import { TodayMeetingsPanel } from "./today/TodayMeetings";

interface DashboardProps {
  projects: ProjectMeta[];
  refreshKey?: number;
  onNavigate: (section: Section) => void;
  onStartStandup: () => void;
  onStartWeekly: () => void;
  onStartCustomerSync: () => void;
  onNewProject: () => void;
  onOpenRecent: (path: string) => void;
  onOpenProject?: (slug: string, tab?: string) => void;
}

export function Dashboard({
  projects,
  refreshKey = 0,
  onNavigate,
  onStartStandup,
  onStartWeekly,
  onStartCustomerSync,
  onNewProject,
  onOpenRecent,
  onOpenProject,
}: DashboardProps) {
  const projectKey = useMemo(
    () => projects.map((p) => p.slug).sort().join(","),
    [projects],
  );
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projects.length) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadDashboardSnapshot(projects).then((data) => {
      setSnapshot(data);
      setLoading(false);
    });
  }, [projectKey, projects, refreshKey]);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-400">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-fg-primary">Good to see you</h2>
            <p className="mt-1 text-fg-secondary">
              Guided workflows for your Foundry engagements — press{" "}
              <ShortcutKbd keys="K" /> to jump anywhere.
            </p>
          </div>
        </div>

        <CadenceAlerts
          alerts={snapshot?.cadenceAlerts ?? []}
          onStartStandup={onStartStandup}
          onStartWeekly={onStartWeekly}
        />

        <TodayPanel
          projects={projects}
          items={snapshot?.todayItems}
          loading={loading}
          onOpenProject={onOpenProject}
        />

        <TodayMeetingsPanel />

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            icon={Calendar}
            title="Today's standup"
            description="Pick a project and walk through your day"
            onClick={onStartStandup}
            accent="from-blue-600/20 to-blue-900/10"
            tooltip="Track blockers, priorities, and customer touchpoints"
          />
          <ActionCard
            icon={CalendarDays}
            title="Weekly review"
            description="Reflect on wins, risks, and next week"
            onClick={onStartWeekly}
            accent="from-violet-600/20 to-violet-900/10"
            tooltip="Saves to weekly/ with export options for PDF/DOCX"
          />
          <ActionCard
            icon={Users}
            title="Customer sync"
            description="Prep agenda, demo, and decisions"
            onClick={onStartCustomerSync}
            accent="from-amber-600/20 to-amber-900/10"
            tooltip="Generate shareable summaries for stakeholder meetings"
          />
          <ActionCard
            icon={FolderKanban}
            title="New engagement"
            description="Step-by-step project setup"
            onClick={onNewProject}
            accent="from-emerald-600/20 to-emerald-900/10"
            tooltip="Creates folder structure, engagement.json, and starter docs"
          />
        </div>

        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-fg-primary">Active engagements</h3>
            <button
              onClick={() => onNavigate("projects")}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              View all
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="card-kit border-dashed p-10 text-center">
              <p className="text-fg-secondary">You don't have any projects yet.</p>
              <PrimaryButton onClick={onNewProject}>
                <span className="mt-4 inline-block">Set up your first engagement</span>
              </PrimaryButton>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.slice(0, 4).map((p) => (
                <button
                  key={p.path}
                  onClick={() => onNavigate("projects")}
                  className="card-kit-interactive p-4 text-left"
                >
                  <p className="font-medium text-fg-primary">{p.display_name}</p>
                  <p className="mt-1 text-sm text-fg-secondary">{p.customer}</p>
                  <StatusBadge status={p.status} className="mt-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        <InsightsPanel
          projects={projects}
          insights={snapshot?.insights ?? null}
          onOpenProject={onOpenProject}
        />

        <RecentActivity onOpen={onOpenRecent} />
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  accent,
  tooltip,
}: {
  icon: typeof Calendar;
  title: string;
  description: string;
  onClick: () => void;
  accent: string;
  tooltip?: string;
}) {
  const card = (
    <button
      onClick={onClick}
      className={`card-kit-interactive bg-gradient-to-br p-5 text-left ${accent}`}
    >
      <Icon size={22} className="text-brand-400" />
      <p className="mt-3 font-semibold text-fg-primary">{title}</p>
      <p className="mt-1 text-sm text-fg-secondary">{description}</p>
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip} position="bottom">{card}</Tooltip>;
  }
  return card;
}
