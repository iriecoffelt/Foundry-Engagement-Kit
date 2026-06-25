import { Archive, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { loadPhaseChecklist } from "../../lib/checklistData";
import {
  DEFAULT_CHECKLIST,
  computeHandoffReadiness,
  type PhaseChecklist,
} from "../../lib/phaseChecklist";
import { SecondaryButton } from "../forms/FormField";
import { HandoffPackModal } from "./HandoffPackModal";
import { useProjectDataOptional } from "./ProjectDataProvider";

interface HandoffReadinessProps {
  projectPath: string;
  projectName: string;
  uploadCount: number;
  checklistVersion?: number;
}

export function HandoffReadiness({
  projectPath,
  projectName,
  uploadCount,
  checklistVersion = 0,
}: HandoffReadinessProps) {
  const projectData = useProjectDataOptional();
  const [readiness, setReadiness] = useState<{
    score: number;
    items: { label: string; ok: boolean }[];
  } | null>(null);
  const [showPack, setShowPack] = useState(false);

  useEffect(() => {
    (async () => {
      if (projectData?.checklist === null) return;

      let checklist: PhaseChecklist = projectData?.checklist ?? DEFAULT_CHECKLIST;
      if (!projectData) {
        try {
          checklist = await loadPhaseChecklist(projectPath);
        } catch {
          /* default */
        }
      }

      const hasRunbook = await api
        .readFile(`${projectPath}/04-deploy/runbook.md`)
        .then(() => true)
        .catch(() => false);
      const hasHandoff = await api
        .readFile(`${projectPath}/05-handoff/handoff.md`)
        .then(() => true)
        .catch(() => false);

      setReadiness(computeHandoffReadiness(checklist, hasRunbook, hasHandoff, uploadCount));
    })();
  }, [projectPath, uploadCount, checklistVersion, projectData?.checklist]);

  if (!readiness) return null;

  const color =
    readiness.score >= 80 ? "text-green-400" : readiness.score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <>
      <div className="rounded-xl border border-surface-border bg-surface-raised/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className={color} />
            <div>
              <h3 className="font-semibold text-fg-primary">Handoff readiness</h3>
              <p className={`text-2xl font-bold ${color}`}>{readiness.score}%</p>
            </div>
          </div>
          <SecondaryButton onClick={() => setShowPack(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Archive size={14} /> Handoff pack
            </span>
          </SecondaryButton>
        </div>
        <ul className="mt-4 space-y-2">
          {readiness.items.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <span className={item.ok ? "text-green-400" : "text-fg-faint"}>
                {item.ok ? "✓" : "○"}
              </span>
              <span className={item.ok ? "text-fg-body" : "text-fg-muted"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <HandoffPackModal
        open={showPack}
        projectPath={projectPath}
        projectName={projectName}
        onClose={() => setShowPack(false)}
      />
    </>
  );
}
