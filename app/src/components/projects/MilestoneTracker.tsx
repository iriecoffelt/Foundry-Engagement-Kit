import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
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

interface MilestoneTrackerProps {
  projectPath: string;
}

export function MilestoneTracker({ projectPath }: MilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const eng = await api.readJson<{ milestones?: Milestone[] }>(
        `${projectPath}/engagement.json`,
      );
      if (eng.milestones?.length) setMilestones(eng.milestones);
    } catch {
      /* use defaults */
    }
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (updated: Milestone[]) => {
    setMilestones(updated);
    setSaving(true);
    try {
      const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
      await api.writeJson(`${projectPath}/engagement.json`, { ...eng, milestones: updated });
    } catch {
      await api.writeJson(`${projectPath}/engagement.json`, { milestones: updated });
    } finally {
      setSaving(false);
    }
  };

  const update = (id: string, patch: Partial<Milestone>) => {
    save(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const addCustom = () => {
    save([
      ...milestones,
      { id: `m-${Date.now()}`, name: "New milestone", targetDate: "", status: "pending" },
    ]);
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised/50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-fg-primary">Milestones</h3>
        <button onClick={addCustom} className="text-xs text-brand-400 hover:text-brand-300">
          <Plus size={14} className="inline" /> Add
        </button>
      </div>
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
