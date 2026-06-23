import { FolderKanban, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ProjectMeta } from "../../types";
import { PrimaryButton } from "../forms/FormField";
import { ProjectSetupWizard } from "../wizards/ProjectSetupWizard";
import { ProjectWorkspace } from "./ProjectWorkspace";

interface ProjectsHubProps {
  onRefresh: () => void;
  startWizard?: boolean;
  onWizardConsumed?: () => void;
}

export function ProjectsHub({ onRefresh, startWizard, onWizardConsumed }: ProjectsHubProps) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [selected, setSelected] = useState<ProjectMeta | null>(null);
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

  if (showWizard) {
    return (
      <ProjectSetupWizard
        onCancel={() => setShowWizard(false)}
        onComplete={(path) => {
          setShowWizard(false);
          load();
          onRefresh();
          const slug = path.split("/").pop()!;
          const meta = projects.find((p) => p.slug === slug);
          if (meta) setSelected(meta);
          else
            api.listProjectsWithMeta().then((all) => {
              const p = all.find((x) => x.path === path);
              if (p) setSelected(p);
            });
        }}
      />
    );
  }

  if (selected) {
    return (
      <ProjectWorkspace
        project={selected}
        onBack={() => {
          setSelected(null);
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
            <h2 className="text-2xl font-bold text-white">Projects</h2>
            <p className="mt-1 text-slate-400">Your active Foundry engagements</p>
          </div>
          <PrimaryButton onClick={() => setShowWizard(true)}>
            <span className="flex items-center gap-2">
              <Plus size={16} /> New engagement
            </span>
          </PrimaryButton>
        </div>

        {projects.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-700 p-16 text-center">
            <FolderKanban size={40} className="mx-auto text-slate-600" />
            <p className="mt-4 text-lg text-slate-300">No engagements yet</p>
            <p className="mt-1 text-sm text-slate-500">
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
              <button
                key={p.path}
                onClick={() => setSelected(p)}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-left transition hover:border-brand-600/50 hover:bg-slate-900"
              >
                <p className="font-semibold text-white">{p.display_name}</p>
                <p className="mt-1 text-sm text-slate-400">{p.customer || "No customer set"}</p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs capitalize text-brand-300">
                    {p.status}
                  </span>
                  {p.target_go_live && (
                    <span className="text-xs text-slate-500">Go-live: {p.target_go_live}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
