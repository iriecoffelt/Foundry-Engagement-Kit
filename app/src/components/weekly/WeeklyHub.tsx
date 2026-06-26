import { CalendarDays, Copy, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { copyToClipboard } from "../../lib/customerSummary";
import { listWeeklyDocsByProject } from "../../lib/hubListings";
import { buildPortfolioWeeklyRollup } from "../../lib/weeklyRollup";
import { trackRecent } from "../../lib/recent";
import type { FileEntry, ProjectMeta } from "../../types";
import { PrimaryButton, SecondaryButton } from "../forms/FormField";
import {
  HubEmpty,
  HubItem,
  HubLayout,
  HubMain,
  HubMainTitle,
  HubSection,
  HubSidebar,
} from "../layout/HubLayout";
import { MarkdownPreview } from "../MarkdownPreview";
import { CustomerSyncWizard } from "../wizards/CustomerSyncWizard";
import { WeeklyReviewWizard } from "../wizards/WeeklyReviewWizard";

interface WeeklyHubProps {
  projects: ProjectMeta[];
  onRefresh: () => void;
  startWizard?: boolean;
  startSyncWizard?: boolean;
  onWizardConsumed?: () => void;
}

function formatWeeklyLabel(name: string): string {
  return name
    .replace("-weekly-review.md", "")
    .replace("-customer-sync.md", " (sync)")
    .replace(".md", "");
}

export function WeeklyHub({
  projects,
  onRefresh,
  startWizard,
  startSyncWizard,
  onWizardConsumed,
}: WeeklyHubProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReviewWizard, setShowReviewWizard] = useState(false);
  const [showSyncWizard, setShowSyncWizard] = useState(false);
  const [groups, setGroups] = useState<{ project: string; label: string; entries: FileEntry[] }[]>(
    [],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [rollupMessage, setRollupMessage] = useState("");

  const copyPortfolioRollup = async () => {
    if (!projects.length) return;
    const text = await buildPortfolioWeeklyRollup(projects);
    const ok = await copyToClipboard(text);
    setRollupMessage(ok ? "Portfolio weekly rollup copied" : "Could not copy");
    setTimeout(() => setRollupMessage(""), 2500);
  };

  const load = useCallback(async () => {
    const byProject = await listWeeklyDocsByProject(projects);
    setGroups(
      projects.map((p) => ({
        project: p.slug,
        label: p.display_name,
        entries: (byProject[p.slug] || []).sort((a, b) => b.name.localeCompare(a.name)),
      })),
    );
  }, [projects]);

  useEffect(() => {
    load();
  }, [load, showReviewWizard, showSyncWizard]);

  useEffect(() => {
    if (startWizard) {
      setShowReviewWizard(true);
      onWizardConsumed?.();
    }
    if (startSyncWizard) {
      setShowSyncWizard(true);
      onWizardConsumed?.();
    }
  }, [startWizard, startSyncWizard, onWizardConsumed]);

  const openEntry = async (path: string, name: string) => {
    setSelected(path);
    const text = await api.readFile(path);
    setContent(text);
    trackRecent(path, name, "Weekly");
    setSidebarOpen(false);
  };

  const onDocComplete = (path: string) => {
    setShowReviewWizard(false);
    setShowSyncWizard(false);
    onRefresh();
    load().then(() => {
      const name = path.split("/").pop() || path;
      openEntry(path, name);
    });
  };

  if (showSyncWizard) {
    return (
      <CustomerSyncWizard
        onCancel={() => setShowSyncWizard(false)}
        onComplete={onDocComplete}
      />
    );
  }

  if (showReviewWizard) {
    return (
      <WeeklyReviewWizard
        projects={projects}
        onCancel={() => setShowReviewWizard(false)}
        onComplete={onDocComplete}
      />
    );
  }

  const hasEntries = groups.some((g) => g.entries.length > 0);

  return (
    <HubLayout>
      <HubSidebar
        title="Weekly"
        subtitle="Reviews and customer sync prep"
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        actions={
          <div className="flex flex-col gap-2">
            <PrimaryButton onClick={() => setShowReviewWizard(true)}>
              <span className="inline-flex w-full items-center justify-center gap-2">
                <CalendarDays size={16} /> Weekly review
              </span>
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowSyncWizard(true)}>
              <span className="inline-flex w-full items-center justify-center gap-2">
                <Users size={16} /> Customer sync
              </span>
            </SecondaryButton>
            {projects.length > 0 && (
              <SecondaryButton onClick={copyPortfolioRollup}>
                <span className="inline-flex w-full items-center justify-center gap-2">
                  <Copy size={16} /> Portfolio rollup
                </span>
              </SecondaryButton>
            )}
            {rollupMessage && (
              <p className="text-center text-xs text-brand-300">{rollupMessage}</p>
            )}
          </div>
        }
      >
        {!hasEntries && projects.length === 0 ? (
          <HubEmpty
            compact
            icon={CalendarDays}
            title="No projects yet"
            description="Create an engagement first, then start a weekly review."
          />
        ) : (
          groups.map((g) => (
            <HubSection key={g.project} label={g.label}>
              {g.entries.length === 0 ? (
                <p className="px-3 py-1.5 text-xs text-fg-faint">No entries yet</p>
              ) : (
                g.entries.map((f) => (
                  <HubItem
                    key={f.path}
                    selected={selected === f.path}
                    onClick={() => openEntry(f.path, f.name)}
                  >
                    {formatWeeklyLabel(f.name)}
                  </HubItem>
                ))
              )}
            </HubSection>
          ))
        )}
      </HubSidebar>

      <HubMain
        onOpenSidebar={() => setSidebarOpen(true)}
        header={
          selected ? (
            <HubMainTitle
              title={formatWeeklyLabel(selected.split("/").pop() ?? selected)}
              subtitle={selected}
            />
          ) : undefined
        }
      >
        {selected && content ? (
          <MarkdownPreview content={content} />
        ) : (
          <HubEmpty
            icon={CalendarDays}
            title="Select an entry or start a new review"
            description="Weekly docs are saved under weekly/{project}/ in your workspace."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <PrimaryButton onClick={() => setShowReviewWizard(true)}>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} /> Weekly review
                  </span>
                </PrimaryButton>
                <SecondaryButton onClick={() => setShowSyncWizard(true)}>
                  <span className="inline-flex items-center gap-2">
                    <Users size={16} /> Customer sync
                  </span>
                </SecondaryButton>
              </div>
            }
          />
        )}
      </HubMain>
    </HubLayout>
  );
}
