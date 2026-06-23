import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  DEFAULT_CHECKLIST,
  PHASE_LABELS,
  PHASE_ORDER,
  checklistPath,
  computePhaseProgress,
  type PhaseChecklist,
} from "../../lib/phaseChecklist";
import type { EngagementStatus } from "../../types";

interface PhaseStepperProps {
  projectPath: string;
  currentStatus: string;
}

export function PhaseStepper({ projectPath, currentStatus }: PhaseStepperProps) {
  const [checklist, setChecklist] = useState<PhaseChecklist>(DEFAULT_CHECKLIST);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.readJson<PhaseChecklist>(checklistPath(projectPath));
      setChecklist(data);
    } catch {
      setChecklist(DEFAULT_CHECKLIST);
    }
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (updated: PhaseChecklist) => {
    setChecklist(updated);
    setSaving(true);
    try {
      await api.writeJson(checklistPath(projectPath), updated);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (phase: EngagementStatus, id: string) => {
    const updated = {
      ...checklist,
      phases: {
        ...checklist.phases,
        [phase]: checklist.phases[phase].map((item) =>
          item.id === id ? { ...item, done: !item.done } : item,
        ),
      },
    };
    save(updated);
  };

  const progress = computePhaseProgress(checklist);
  const activePhase = (currentStatus as EngagementStatus) || "discovery";
  const activeIndex = PHASE_ORDER.indexOf(activePhase);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Engagement progress</h3>
        <span className="text-sm text-brand-400">{progress.overall}% complete</span>
      </div>

      <div className="mt-4 flex gap-1">
        {PHASE_ORDER.map((phase, i) => (
          <div key={phase} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-2 w-full rounded-full ${
                i <= activeIndex ? "bg-brand-500" : "bg-slate-800"
              }`}
              title={`${PHASE_LABELS[phase]}: ${progress.byPhase[phase]}%`}
            />
            <span
              className={`text-[10px] ${phase === activePhase ? "text-brand-300" : "text-slate-600"}`}
            >
              {PHASE_LABELS[phase]}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {(checklist.phases[activePhase] || []).map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(activePhase, item.id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-800/80"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                item.done
                  ? "border-brand-500 bg-brand-600 text-white"
                  : "border-slate-600 bg-slate-950"
              }`}
            >
              {item.done && <Check size={12} />}
            </span>
            <span className={item.done ? "text-slate-500 line-through" : "text-slate-300"}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
      {saving && <p className="mt-2 text-xs text-slate-500">Saving…</p>}
    </div>
  );
}
