import { Calendar, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { FileEntry } from "../../types";
import { PrimaryButton } from "../forms/FormField";
import { MarkdownPreview } from "../MarkdownPreview";
import { StandupWizard } from "../wizards/StandupWizard";

interface DailyHubProps {
  onRefresh: () => void;
  startWizard?: boolean;
  onWizardConsumed?: () => void;
}

export function DailyHub({ onRefresh, startWizard, onWizardConsumed }: DailyHubProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [groups, setGroups] = useState<{ project: string; entries: FileEntry[] }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    const entries = await api.listDirectory("daily", true);
    const byProject: Record<string, FileEntry[]> = {};

    for (const entry of entries) {
      if (entry.is_dir) {
        const files = entry.children?.filter((c) => c.name.endsWith(".md")) || [];
        if (files.length) byProject[entry.name] = files;
      } else if (entry.name.endsWith(".md") && entry.name !== "standup.md") {
        byProject["_general"] = [...(byProject["_general"] || []), entry];
      }
    }

    setGroups(
      Object.entries(byProject)
        .map(([project, ents]) => ({
          project,
          entries: ents.sort((a, b) => b.name.localeCompare(a.name)),
        }))
        .sort((a, b) => a.project.localeCompare(b.project)),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (startWizard) {
      setShowWizard(true);
      onWizardConsumed?.();
    }
  }, [startWizard, onWizardConsumed]);

  const openEntry = async (path: string) => {
    const text = await api.readFile(path);
    setSelected(path);
    setContent(text);
  };

  if (showWizard) {
    return (
      <StandupWizard
        onCancel={() => setShowWizard(false)}
        onComplete={(path) => {
          setShowWizard(false);
          load();
          onRefresh();
          openEntry(path);
        }}
      />
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Daily</h2>
          <PrimaryButton onClick={() => setShowWizard(true)}>
            <span className="flex items-center gap-1.5">
              <Plus size={14} /> Standup
            </span>
          </PrimaryButton>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
            <Calendar size={28} className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm text-slate-400">No standups yet</p>
            <button
              onClick={() => setShowWizard(true)}
              className="mt-2 text-sm text-brand-400 hover:text-brand-300"
            >
              Start today's standup
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.project} className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {g.project === "_general" ? "General" : g.project}
              </p>
              {g.entries.map((e) => (
                <button
                  key={e.path}
                  onClick={() => openEntry(e.path)}
                  className={`mb-1 flex w-full rounded-lg px-3 py-2 text-left text-sm ${
                    selected === e.path
                      ? "bg-brand-600/20 text-brand-200"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {e.name.replace("-standup.md", "").replace(".md", "")}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <MarkdownPreview content={content} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <Calendar size={40} className="mb-3 opacity-40" />
            <p>Start a standup or select an entry</p>
          </div>
        )}
      </div>
    </div>
  );
}
