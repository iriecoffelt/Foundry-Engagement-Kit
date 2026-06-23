import { Calendar, CalendarDays, FolderPlus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import type { FileEntry } from "../types";
import { Modal } from "./Modal";

interface DashboardProps {
  projects: FileEntry[];
  onOpenFile: (path: string) => void;
  onNavigate: (section: "daily" | "weekly" | "projects") => void;
  onProjectCreated: () => void;
}

export function Dashboard({
  projects,
  onOpenFile,
  onNavigate,
  onProjectCreated,
}: DashboardProps) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = await api.searchFiles(q);
    setSearchResults(results);
  };

  const handleCreateDaily = async () => {
    setLoading(true);
    setError("");
    try {
      const path = await api.createDatedEntry("daily", "standup");
      onOpenFile(path);
      onNavigate("daily");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWeekly = async () => {
    setLoading(true);
    setError("");
    try {
      const path = await api.createDatedEntry("weekly", "weekly-review");
      onOpenFile(path);
      onNavigate("weekly");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const path = await api.createProject(projectName);
      setShowNewProject(false);
      setProjectName("");
      onProjectCreated();
      onOpenFile(`${path}/README.md`);
      onNavigate("projects");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="mt-1 text-slate-400">Quick actions for your Foundry engagements</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <QuickAction
            icon={Calendar}
            title="Today's Standup"
            description="Create a dated standup from template"
            onClick={handleCreateDaily}
            loading={loading}
          />
          <QuickAction
            icon={CalendarDays}
            title="Weekly Review"
            description="Start this week's review doc"
            onClick={handleCreateWeekly}
            loading={loading}
          />
          <QuickAction
            icon={FolderPlus}
            title="New Project"
            description="Scaffold from engagement template"
            onClick={() => setShowNewProject(true)}
            loading={loading}
          />
        </div>

        <div className="relative mt-10">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search all templates..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-600"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50">
            {searchResults.map((r) => (
              <button
                key={r.path}
                onClick={() => onOpenFile(r.path)}
                className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-800/50"
              >
                <span className="text-slate-200">{r.name}</span>
                <span className="text-xs text-slate-500">{r.path}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Active Projects</h3>
            <button
              onClick={() => onNavigate("projects")}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              View all
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="text-slate-400">No projects yet</p>
              <button
                onClick={() => setShowNewProject(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500"
              >
                <Plus size={16} />
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <button
                  key={p.path}
                  onClick={() => onOpenFile(`${p.path}/README.md`)}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:border-brand-600/50 hover:bg-slate-900"
                >
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{p.path}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showNewProject}
        title="New Engagement Project"
        onClose={() => setShowNewProject(false)}
        footer={
          <>
            <button
              onClick={() => setShowNewProject(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={loading || !projectName.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500 disabled:opacity-40"
            >
              Create
            </button>
          </>
        }
      >
        <label className="block text-sm text-slate-400">Project name</label>
        <input
          autoFocus
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
          placeholder="e.g. acme-2025-order-mgmt"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-brand-600"
        />
        <p className="mt-2 text-xs text-slate-500">
          Copies project/_template/ into project/your-name/
        </p>
      </Modal>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
  loading,
}: {
  icon: typeof Calendar;
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left transition hover:border-brand-600/40 hover:bg-slate-900 disabled:opacity-50"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
        <Icon size={20} />
      </div>
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </button>
  );
}
