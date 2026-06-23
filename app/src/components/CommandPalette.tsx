import { Command, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { FileEntry, ProjectMeta, Section } from "../types";

export interface CommandAction {
  id: string;
  label: string;
  section?: Section;
  keywords?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  projects: ProjectMeta[];
  onNavigate: (section: Section) => void;
  onStartFocus: () => void;
  onStartStandup: () => void;
  onStartWeekly: () => void;
  onStartCustomerSync: () => void;
  onNewProject: () => void;
  onOpenFile?: (path: string) => void;
}

export function CommandPalette({
  open,
  onClose,
  projects,
  onNavigate,
  onStartFocus,
  onStartStandup,
  onStartWeekly,
  onStartCustomerSync,
  onNewProject,
  onOpenFile,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [fileResults, setFileResults] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState(0);

  const actions: CommandAction[] = [
    { id: "home", label: "Go to Home", section: "home", action: () => onNavigate("home") },
    { id: "projects", label: "Go to Projects", section: "projects", action: () => onNavigate("projects") },
    { id: "daily", label: "Go to Daily", section: "daily", action: () => onNavigate("daily") },
    { id: "weekly", label: "Go to Weekly", section: "weekly", action: () => onNavigate("weekly") },
    { id: "library", label: "Go to Library", section: "library", action: () => onNavigate("library") },
    { id: "focus", label: "Start focus timer", section: "focus", keywords: "pomodoro break deep work", action: onStartFocus },
    { id: "settings", label: "Go to Settings", section: "settings", action: () => onNavigate("settings") },
    { id: "standup", label: "Start today's standup", keywords: "daily", action: onStartStandup },
    { id: "weekly-w", label: "Start weekly review", action: onStartWeekly },
    { id: "sync", label: "Prep customer sync", keywords: "meeting stakeholder", action: onStartCustomerSync },
    { id: "new", label: "New engagement setup", keywords: "project create", action: onNewProject },
    ...projects.map((p) => ({
      id: `proj-${p.slug}`,
      label: `Open ${p.display_name}`,
      keywords: `${p.customer} ${p.slug}`,
      action: () => onNavigate("projects"),
    })),
  ];

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(0);
      setFileResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setFileResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.searchFiles(query).then(setFileResults).catch(() => setFileResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = actions.filter(
    (a) =>
      !query ||
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.keywords?.toLowerCase().includes(query.toLowerCase()),
  );

  const allItems = [
    ...filtered.map((a) => ({ type: "action" as const, ...a })),
    ...fileResults.map((f) => ({ type: "file" as const, id: f.path, label: f.name, path: f.path })),
  ];

  const run = useCallback(
    (index: number) => {
      const item = allItems[index];
      if (!item) return;
      if (item.type === "action") {
        item.action();
      } else if (onOpenFile) {
        onOpenFile(item.path);
      }
      onClose();
    },
    [allItems, onClose, onOpenFile],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, allItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        run(selected);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, selected, allItems.length, run, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4">
          <Search size={18} className="text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Search commands, projects, files…"
            className="flex-1 bg-transparent py-4 text-white outline-none placeholder:text-slate-500"
          />
          <kbd className="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-500">
            esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2">
          {allItems.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">No results</li>
          ) : (
            allItems.map((item, i) => (
              <li key={item.id}>
                <button
                  onClick={() => run(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                    i === selected ? "bg-brand-600/20 text-brand-200" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Command size={14} className="shrink-0 opacity-50" />
                  <span>{item.label}</span>
                  {item.type === "file" && (
                    <span className="ml-auto truncate text-xs text-slate-600">{item.path}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
