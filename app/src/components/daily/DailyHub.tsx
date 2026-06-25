import { Calendar, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { listDailyStandupsByProject } from "../../lib/hubListings";
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
import { StandupWizard } from "../wizards/StandupWizard";

interface DailyHubProps {
  projects: ProjectMeta[];
  onRefresh: () => void;
  startWizard?: boolean;
  onWizardConsumed?: () => void;
}

function formatStandupLabel(path: string): string {
  return path.split("/").pop()?.replace("-standup.md", "").replace(".md", "") ?? path;
}

export function DailyHub({ projects, onRefresh, startWizard, onWizardConsumed }: DailyHubProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [editPath, setEditPath] = useState<string | null>(null);
  const [editMarkdown, setEditMarkdown] = useState<string | undefined>();
  const [groups, setGroups] = useState<{ project: string; entries: FileEntry[] }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const projectNames = useCallback(
    () => Object.fromEntries(projects.map((p) => [p.slug, p.display_name])),
    [projects],
  );

  const load = useCallback(async () => {
    const byProject = await listDailyStandupsByProject(projects);
    const names = projectNames();

    setGroups(
      Object.entries(byProject)
        .map(([project, entries]) => ({
          project,
          entries: entries.sort((a, b) => b.name.localeCompare(a.name)),
        }))
        .sort((a, b) => {
          const labelA = a.project === "_general" ? "General" : names[a.project] ?? a.project;
          const labelB = b.project === "_general" ? "General" : names[b.project] ?? b.project;
          return labelA.localeCompare(labelB);
        }),
    );
  }, [projects, projectNames]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (startWizard) {
      setEditPath(null);
      setEditMarkdown(undefined);
      setShowWizard(true);
      onWizardConsumed?.();
    }
  }, [startWizard, onWizardConsumed]);

  const openEntry = async (path: string) => {
    const text = await api.readFile(path);
    setSelected(path);
    setContent(text);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditPath(selected);
    setEditMarkdown(content);
    setShowWizard(true);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setEditPath(null);
    setEditMarkdown(undefined);
  };

  const names = projectNames();

  if (showWizard) {
    return (
      <StandupWizard
        projects={projects}
        editPath={editPath ?? undefined}
        initialMarkdown={editMarkdown}
        onCancel={closeWizard}
        onComplete={(path) => {
          closeWizard();
          load();
          onRefresh();
          openEntry(path);
        }}
      />
    );
  }

  return (
    <HubLayout>
      <HubSidebar
        title="Daily"
        subtitle="Standups by project"
        actions={
          <PrimaryButton onClick={() => setShowWizard(true)}>
            <span className="flex w-full items-center justify-center gap-1.5">
              <Plus size={14} /> New standup
            </span>
          </PrimaryButton>
        }
      >
        {groups.length === 0 ? (
          <HubEmpty
            compact
            icon={Calendar}
            title="No standups yet"
            description="Capture blockers and priorities for today."
            action={
              <button
                onClick={() => setShowWizard(true)}
                className="mt-2 text-sm text-brand-400 hover:text-brand-300"
              >
                Start today's standup
              </button>
            }
          />
        ) : (
          groups.map((g) => (
            <HubSection
              key={g.project}
              label={g.project === "_general" ? "General" : names[g.project] ?? g.project}
            >
              {g.entries.map((e) => (
                <HubItem
                  key={e.path}
                  selected={selected === e.path}
                  onClick={() => openEntry(e.path)}
                >
                  {formatStandupLabel(e.name)}
                </HubItem>
              ))}
            </HubSection>
          ))
        )}
      </HubSidebar>

      <HubMain
        header={
          selected ? (
            <HubMainTitle
              title={formatStandupLabel(selected)}
              subtitle={selected}
              actions={
                <SecondaryButton onClick={startEdit}>
                  <span className="flex items-center gap-1.5">
                    <Pencil size={14} /> Edit standup
                  </span>
                </SecondaryButton>
              }
            />
          ) : undefined
        }
      >
        {selected ? (
          <MarkdownPreview content={content} />
        ) : (
          <HubEmpty
            icon={Calendar}
            title="Start a standup or select an entry"
            description="Daily notes are saved under daily/{project}/ in your workspace."
            action={
              <PrimaryButton onClick={() => setShowWizard(true)}>
                <span className="inline-flex items-center gap-1.5">
                  <Plus size={14} /> New standup
                </span>
              </PrimaryButton>
            }
          />
        )}
      </HubMain>
    </HubLayout>
  );
}
