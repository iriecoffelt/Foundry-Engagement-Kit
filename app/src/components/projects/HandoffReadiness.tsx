import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  DEFAULT_CHECKLIST,
  checklistPath,
  computeHandoffReadiness,
  type PhaseChecklist,
} from "../../lib/phaseChecklist";

interface HandoffReadinessProps {
  projectPath: string;
  uploadCount: number;
}

export function HandoffReadiness({ projectPath, uploadCount }: HandoffReadinessProps) {
  const [readiness, setReadiness] = useState<{
    score: number;
    items: { label: string; ok: boolean }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      let checklist: PhaseChecklist = DEFAULT_CHECKLIST;
      try {
        checklist = await api.readJson<PhaseChecklist>(checklistPath(projectPath));
      } catch {
        /* default */
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
  }, [projectPath, uploadCount]);

  if (!readiness) return null;

  const color =
    readiness.score >= 80 ? "text-green-400" : readiness.score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck size={22} className={color} />
        <div>
          <h3 className="font-semibold text-white">Handoff readiness</h3>
          <p className={`text-2xl font-bold ${color}`}>{readiness.score}%</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {readiness.items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span className={item.ok ? "text-green-400" : "text-slate-600"}>
              {item.ok ? "✓" : "○"}
            </span>
            <span className={item.ok ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
