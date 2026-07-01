import { Plus, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadEngagementJson, saveEngagementJson } from "../../lib/engagementData";
import { useDebouncedPersist } from "../../hooks/useDebouncedPersist";
import {
  getEngagementTypeConfig,
  type EngagementType,
} from "../../lib/engagementTypes";
import type { Milestone } from "../../types";
import { SelectInput, TextInput } from "../forms/FormField";

const DEFAULT_MILESTONES: Milestone[] = [
  { id: "m0", name: "Discovery complete", targetDate: "", status: "pending" },
  { id: "m1", name: "Design approved", targetDate: "", status: "pending" },
  { id: "m2", name: "Alpha in dev", targetDate: "", status: "pending" },
  { id: "m3", name: "UAT sign-off", targetDate: "", status: "pending" },
  { id: "m4", name: "Go-live", targetDate: "", status: "pending" },
  { id: "m5", name: "Handoff complete", targetDate: "", status: "pending" },
];

function buildSuggestedMilestones(engagementType: EngagementType | undefined): Milestone[] {
  const config = getEngagementTypeConfig(engagementType);
  return config.suggestedMilestones.map((m, i) => ({
    id: `m${i}`,
    name: m.name,
    targetDate: "",
    status: "pending" as const,
  }));
}

interface MilestoneTrackerProps {
  projectPath: string;
  engagementType?: EngagementType;
}

export function MilestoneTracker({ projectPath, engagementType }: MilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const milestonesRef = useRef(milestones);
  milestonesRef.current = milestones;

  const load = useCallback(async () => {
    const eng = await loadEngagementJson(projectPath);
    const loaded = (eng.milestones as Milestone[] | undefined) ?? [];
    if (loaded.length) {
      milestonesRef.current = loaded;
      setMilestones(loaded);
    } else if (engagementType) {
      const suggested = buildSuggestedMilestones(engagementType);
      milestonesRef.current = suggested;
      setMilestones(suggested);
    }
    setHasLoaded(true);
  }, [projectPath, engagementType]);

  useEffect(() => {
    load();
  }, [load]);

  const { schedule: scheduleSave, flushNow: flushSave } = useDebouncedPersist<Milestone[]>({
    save: async (updated) => {
      const eng = await loadEngagementJson(projectPath);
      await saveEngagementJson(projectPath, { ...eng, milestones: updated });
    },
    onSavingChange: setSaving,
  });

  const applyMilestones = useCallback(
    (updated: Milestone[], immediate = false) => {
      milestonesRef.current = updated;
      setMilestones(updated);
      if (immediate) {
        void flushSave(updated);
      } else {
        scheduleSave(updated);
      }
    },
    [flushSave, scheduleSave],
  );

  const update = (id: string, patch: Partial<Milestone>) => {
    applyMilestones(
      milestonesRef.current.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  };

  const addCustom = () => {
    applyMilestones(
      [
        ...milestonesRef.current,
        { id: `m-${Date.now()}`, name: "New milestone", targetDate: "", status: "pending" },
      ],
      true,
    );
  };

  const useSuggestedMilestones = () => {
    save(buildSuggestedMilestones(engagementType));
  };

  const allEmpty = milestones.every(
    (m) => !m.name.trim() || m.name === "New milestone" || m.name === DEFAULT_MILESTONES.find((d) => d.id === m.id)?.name,
  );
  const showSuggestButton = hasLoaded && engagementType && (milestones.length === 0 || allEmpty);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised/50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-fg-primary">Milestones</h3>
          <p className="mt-0.5 text-xs text-fg-muted">Dates and delivery gates — separate from checklist %</p>
        </div>
        <div className="flex items-center gap-2">
          {engagementType && (
            <button
              onClick={useSuggestedMilestones}
              className="text-xs text-amber-400 hover:text-amber-300"
              title={`Use suggested milestones for ${getEngagementTypeConfig(engagementType).label}`}
            >
              <Sparkles size={14} className="inline" /> Use suggested
            </button>
          )}
          <button onClick={addCustom} className="text-xs text-brand-400 hover:text-brand-300">
            <Plus size={14} className="inline" /> Add
          </button>
        </div>
      </div>

      {showSuggestButton && (
        <div className="mt-3 rounded-lg border border-amber-900/30 bg-amber-950/20 px-4 py-3">
          <p className="text-sm text-amber-200">
            <Sparkles size={14} className="mr-1.5 inline text-amber-400" />
            Suggested milestones available for{" "}
            <span className="font-medium">{getEngagementTypeConfig(engagementType).label}</span>
          </p>
          <button
            onClick={useSuggestedMilestones}
            className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
          >
            Use suggested milestones
          </button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {milestones.map((m) => (
          <div key={m.id} className="grid gap-2 sm:grid-cols-3">
            <TextInput value={m.name} onChange={(v) => update(m.id, { name: v })} />
            <TextInput
              type="date"
              value={m.targetDate}
              onChange={(v) => update(m.id, { targetDate: v })}
            />
            <SelectInput
              value={m.status}
              onChange={(v) => update(m.id, { status: v as Milestone["status"] })}
              options={[
                { value: "pending", label: "Pending" },
                { value: "in_progress", label: "In progress" },
                { value: "done", label: "Done" },
              ]}
            />
          </div>
        ))}
      </div>
      {saving && <p className="mt-2 text-xs text-fg-muted">Saving…</p>}
    </div>
  );
}
