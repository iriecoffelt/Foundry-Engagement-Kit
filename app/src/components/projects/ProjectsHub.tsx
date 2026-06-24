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
  openProjectRequest?: { slug: string; tab?: string } | null;
  onOpenConsumed?: () => void;
}

export function ProjectsHub({
  onRefresh,
  startWizard,
  onWizardConsumed,
  openProjectRequest,
  onOpenConsumed,
}: ProjectsHubProps) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [selected, setSelected] = useState<ProjectMeta | null>(null);
  const [initialTab, setInitialTab] = useState<ProjectTab | undefined>();
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
    if (!openProjectRequest || !projects.length) return;
    const p = projects.find((x) => x.slug === openProjectRequest.slug);
    if (p) {
      setSelected(p);
      setInitialTab(openProjectRequest.tab as ProjectTab | undefined);
      onOpenConsumed?.();
    }
  }, [openProjectRequest, projects, onOpenConsumed]);

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
          load().then(() => {
            const slug = path.replace("project/", "");
            const created = projects.find((x) => x.slug === slug);
            if (created) setSelected(created);
            else {
              api.listProjectsWithMeta().then((list) => {
                const p = list.find((x) => x.slug === slug);
                if (p) setSelected(p);
              });
            }
          });
        }}
      />
    );
  }

  if (selected) {
    return (
      <ProjectWorkspace
        project={selected}
        initialTab={initialTab}
        onBack={() => {
          setSelected(null);
          setInitialTab(undefined);
          load();
        }}
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
                <button onClick={() => setSelected(p)} className="w-full p-5 text-left">
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
