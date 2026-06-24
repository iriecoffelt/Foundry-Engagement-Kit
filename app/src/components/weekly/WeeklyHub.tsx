import { CalendarDays, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { trackRecent } from "../../lib/recent";
import type { FileEntry, ProjectMeta } from "../../types";
import { PrimaryButton } from "../forms/FormField";
import { MarkdownPreview } from "../MarkdownPreview";
import { CustomerSyncWizard } from "../wizards/CustomerSyncWizard";
import { WeeklyReviewWizard } from "../wizards/WeeklyReviewWizard";

interface WeeklyHubProps {
  onRefresh: () => void;
  startWizard?: boolean;
  startSyncWizard?: boolean;
  onWizardConsumed?: () => void;
}

export function WeeklyHub({
  onRefresh,
  startWizard,
  startSyncWizard,
  onWizardConsumed,
}: WeeklyHubProps) {
  const [showReviewWizard, setShowReviewWizard] = useState(false);
  const [showSyncWizard, setShowSyncWizard] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [groups, setGroups] = useState<{ project: string; label: string; entries: FileEntry[] }[]>(
    [],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    const projs = await api.listProjectsWithMeta();
    setProjects(projs);
    const entries = await api.listDirectory("weekly", true);
    const byProject: Record<string, FileEntry[]> = {};

    for (const entry of entries) {
      if (entry.is_dir) {
        const files = entry.children?.filter((c) => c.name.endsWith(".md")) || [];
        if (files.length) byProject[entry.name] = files;
      }
    }

    setGroups(
      projs.map((p) => ({
        project: p.slug,
        label: p.display_name,
        entries: (byProject[p.slug] || []).sort((a, b) => b.name.localeCompare(a.name)),
      })),
    );
  }, []);

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

  const onDocComplete = (path: string) => {
    setShowReviewWizard(false);
    setShowSyncWizard(false);
    onRefresh();
    load().then(() => {
      setSelected(path);
      api.readFile(path).then((c) => {
        setContent(c);
        trackRecent(path, path.split("/").pop() || path, "Weekly");
      });
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

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-800">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-white">Weekly</h2>
          <p className="text-sm text-slate-500">Reviews & customer syncs by project</p>
          <div className="mt-3 flex flex-col gap-2">
            <PrimaryButton onClick={() => setShowReviewWizard(true)}>
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} /> Weekly review
              </span>
            </PrimaryButton>
            <button
              onClick={() => setShowSyncWizard(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              <Users size={16} /> Customer sync prep
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {groups.map((g) => (
            <div key={g.project} className="mb-4">
              <p className="px-2 text-xs font-medium uppercase text-slate-500">{g.label}</p>
              {g.entries.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-600">No entries yet</p>
              ) : (
                g.entries.map((f) => (
                  <button
                    key={f.path}
                    onClick={async () => {
                      setSelected(f.path);
                      const text = await api.readFile(f.path);
                      setContent(text);
                      trackRecent(f.path, f.name, "Weekly");
                    }}
                    className={`mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selected === f.path
                        ? "bg-brand-600/20 text-brand-200"
                        : "text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    {f.name
                      .replace("-weekly-review.md", "")
                      .replace("-customer-sync.md", " (sync)")
                      .replace(".md", "")}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selected && content ? (
          <MarkdownPreview content={content} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Select an entry or start a new review / sync
          </div>
        )}
      </div>
    </div>
  );
}
