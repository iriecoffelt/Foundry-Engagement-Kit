import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Copy,
  FileDown,
  FileText,
  Gavel,
  Handshake,
  Kanban,
  Layers,
  Network,
  ShieldAlert,
  TestTube2,
  UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EngagementType, ProjectMeta } from "../../types";
import {
  formatStatusLabel,
  normalizeStatus,
  statusRingStrokeClass,
} from "../../lib/engagementStatus";
import { PrimaryButton, SecondaryButton } from "../forms/FormField";
import { StatusBadge } from "../StatusBadge";
import { EngagementTypeBadge } from "../EngagementTypeBadge";

export type ProjectTab =
  | "overview"
  | "delivery"
  | "register"
  | "uat"
  | "decisions"
  | "stakeholders"
  | "ontology"
  | "architecture"
  | "documents"
  | "library"
  | "users";

const TABS: { id: ProjectTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "delivery", label: "Delivery", icon: Kanban },
  { id: "register", label: "Register", icon: ShieldAlert },
  { id: "uat", label: "UAT", icon: TestTube2 },
  { id: "decisions", label: "Decisions", icon: Gavel },
  { id: "stakeholders", label: "Stakeholders", icon: Handshake },
  { id: "ontology", label: "Ontology", icon: Layers },
  { id: "architecture", label: "Architecture", icon: Network },
  { id: "documents", label: "Documents", icon: ClipboardList },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "users", label: "Users", icon: UserCircle },
];

export const PROJECT_TAB_LABELS = Object.fromEntries(
  TABS.map((t) => [t.id, t.label]),
) as Record<ProjectTab, string>;

function ProgressRing({ progress, status }: { progress: number; status: string }) {
  const size = 44;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, progress)) / 100) * c;
  const strokeClass = statusRingStrokeClass(status);

  return (
    <div className="relative shrink-0" title={`${progress}% checklist complete`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-surface-border"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={strokeClass}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-fg-body">
        {progress}%
      </span>
    </div>
  );
}

interface ProjectWorkspaceHeaderProps {
  project: ProjectMeta;
  tab: ProjectTab;
  phaseProgress: number;
  message: string;
  backLabel?: string;
  engagementType?: EngagementType;
  onBack: () => void;
  onTabChange: (tab: ProjectTab) => void;
  onCopySummary: () => void;
  onCopyWeeklyRollup: () => void;
  onExport: () => void;
  onJiraExport: () => void;
}

export function ProjectWorkspaceHeader({
  project,
  tab,
  phaseProgress,
  message,
  backLabel,
  engagementType,
  onBack,
  onTabChange,
  onCopySummary,
  onCopyWeeklyRollup,
  onExport,
  onJiraExport,
}: ProjectWorkspaceHeaderProps) {
  const phase = normalizeStatus(project.status);

  return (
    <header className="shrink-0 border-b border-surface-border bg-surface-raised">
      <div className="px-6 pt-4">
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg-primary"
        >
          <ArrowLeft size={15} />
          {backLabel ? `Back to ${backLabel}` : "Back"}
        </button>

        <div className="flex items-start gap-4">
          <ProgressRing progress={phaseProgress} status={project.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="truncate text-xl font-bold text-fg-primary">{project.display_name}</h2>
              {engagementType && <EngagementTypeBadge type={engagementType} size="md" />}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {project.customer && (
                <span className="rounded-lg bg-surface-elevated/80 px-2.5 py-0.5 text-xs font-medium text-fg-body ring-1 ring-white/5">
                  {project.customer}
                </span>
              )}
              <StatusBadge status={project.status} />
              {project.target_go_live && (
                <span className="text-xs text-fg-muted">Go-live {project.target_go_live}</span>
              )}
              {phase && (
                <span className="text-xs text-fg-faint">
                  · {formatStatusLabel(project.status)} phase
                </span>
              )}
            </div>
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <SecondaryButton onClick={onJiraExport}>
              <span className="inline-flex items-center gap-2">Jira export</span>
            </SecondaryButton>
            <SecondaryButton onClick={onCopyWeeklyRollup}>
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={14} /> Weekly rollup
              </span>
            </SecondaryButton>
            <SecondaryButton onClick={onCopySummary}>
              <span className="inline-flex items-center gap-2">
                <Copy size={14} /> Copy summary
              </span>
            </SecondaryButton>
            <PrimaryButton onClick={onExport}>
              <span className="inline-flex items-center gap-2">
                <FileDown size={16} /> Export
              </span>
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 px-6">
        <nav className="tab-segment -mb-px min-w-0 flex-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`tab-segment-item whitespace-nowrap ${
                tab === id ? "tab-segment-active" : "tab-segment-inactive"
              }`}
            >
              <Icon size={15} strokeWidth={tab === id ? 2.25 : 2} />
              {label}
            </button>
          ))}
        </nav>
        <div className="flex shrink-0 gap-2 pb-2 sm:hidden">
          <button
            onClick={onCopySummary}
            className="rounded-lg border border-surface-border-strong p-2 text-fg-secondary hover:text-fg-primary"
            title="Copy summary"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={onExport}
            className="rounded-lg bg-brand-600 p-2 text-fg-on-accent hover:bg-brand-500"
            title="Export report"
          >
            <FileDown size={16} />
          </button>
        </div>
      </div>

      {message && (
        <p className="border-t border-surface-border/60 bg-brand-950/20 px-6 py-2 text-sm text-brand-300">
          {message}
        </p>
      )}
    </header>
  );
}
