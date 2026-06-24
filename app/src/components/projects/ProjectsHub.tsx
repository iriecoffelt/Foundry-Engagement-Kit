import { Copy, FolderKanban, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ProjectMeta } from "../../types";
import { PrimaryButton } from "../forms/FormField";
import { StatusBadge } from "../StatusBadge";
import { ProjectSetupWizard } from "../wizards/ProjectSetupWizard";
import { ProjectWorkspace } from "./ProjectWorkspace";
import type { ProjectTab } from "./ProjectWorkspaceHeader";

interface ProjectsHubProps {
  onRefresh: () => void;
  startWizard?: boolean;
  onWizardConsumed?: () => void;
  activeProjectSlug?: string;
  activeProjectTab?: ProjectTab;
  onOpenProject: (slug: string, tab?: ProjectTab) => void;
  onBack: () => void;
}

export function ProjectsHub({
  onRefresh,
  startWizard,
  onWizardConsumed,
  activeProjectSlug,
  activeProjectTab,
  onOpenProject,
  onBack,
}: ProjectsHubProps) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectMeta | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const load = () => api.listProjectsWithMeta().then(setProjects);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (startWizard) {
      setShowWizard(true);
      onWizardConsumed?.();
    }
  }, [startWizard, onWizardConsumed]);

  useEffect(() => {
    if (!activeProjectSlug) {
      setActiveProject(null);
      return;
    }
    api.listProjectsWithMeta().then((list) => {
      setProjects(list);
      setActiveProject(list.find((p) => p.slug === activeProjectSlug) ?? null);
    });
  }, [activeProjectSlug]);

  const cloneProject = async (p: ProjectMeta, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const name = prompt("Name for cloned engagement:", `${p.display_name} (copy)`);
    if (!name?.trim()) return;
    try {
      await api.cloneProject(p.path, name);
      load();
      onRefresh();
    } catch (err) {
      alert(String(err));
    }
  };

  if (showWizard) {
    return (
      <ProjectSetupWizard
        onCancel={() => setShowWizard(false)}
        onComplete={(path) => {
          setShowWizard(false);
          onRefresh();
          api.listProjectsWithMeta().then((list) => {
            const slug = path.replace("project/", "");
            const created = list.find((x) => x.slug === slug);
            if (created) onOpenProject(created.slug);
          });
        }}
      />
    );
  }

  if (activeProject) {
    return (
      <ProjectWorkspace
        project={activeProject}
        initialTab={activeProjectTab}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-fg-primary">Projects</h2>
            <p className="mt-1 text-fg-secondary">Your active Foundry engagements</p>
          </div>
          <PrimaryButton onClick={() => setShowWizard(true)}>
            <span className="flex items-center gap-2">
              <Plus size={16} /> New engagement
            </span>
          </PrimaryButton>
        </div>

        {projects.length === 0 ? (
          <div className="mt-12 card-kit border-dashed p-16 text-center">
            <FolderKanban size={40} className="mx-auto text-fg-faint" />
            <p className="mt-4 text-lg text-fg-body">No engagements yet</p>
            <p className="mt-1 text-sm text-fg-muted">
              Start the guided setup — we'll create your folder structure and starter docs.
            </p>
            <PrimaryButton onClick={() => setShowWizard(true)}>
              <span className="mt-6 inline-flex items-center gap-2">
                <Plus size={16} /> Set up first project
              </span>
            </PrimaryButton>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p.path}
                className="card-kit-interactive group relative"
              >
                <button
                  onClick={() => onOpenProject(p.slug)}
                  className="w-full p-5 text-left"
                >
                  <p className="font-semibold text-fg-primary">{p.display_name}</p>
                  <p className="mt-1 text-sm text-fg-secondary">{p.customer || "No customer set"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.target_go_live && (
                      <span className="text-xs text-fg-muted">Go-live: {p.target_go_live}</span>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => cloneProject(p, e)}
                  title="Clone engagement"
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-fg-muted opacity-0 transition hover:bg-surface-elevated hover:text-fg-primary group-hover:opacity-100"
                >
                  <Copy size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
