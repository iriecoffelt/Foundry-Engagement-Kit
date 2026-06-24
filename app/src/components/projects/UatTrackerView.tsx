import { CheckCircle2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  loadUatScenarios,
  newUatId,
  saveUatScenarios,
  seedUatFromWorkshopSpec,
  UAT_STATUS_LABELS,
  uatProgress,
} from "../../lib/uatScenarios";
import type { UatScenario, UatStatus } from "../../types";
import { SelectInput, TextInput } from "../forms/FormField";
import { UserPicker } from "./UserPicker";

interface UatTrackerViewProps {
  projectPath: string;
}

export function UatTrackerView({ projectPath }: UatTrackerViewProps) {
  const [scenarios, setScenarios] = useState<UatScenario[]>([]);
  const [saving, setSaving] = useState(false);
  const [newScenario, setNewScenario] = useState("");

  const load = useCallback(async () => {
    let data = await loadUatScenarios(projectPath);
    if (!data.length) data = await seedUatFromWorkshopSpec(projectPath);
    setScenarios(data);
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (next: UatScenario[]) => {
    setScenarios(next);
    setSaving(true);
    try {
      await saveUatScenarios(projectPath, next);
    } finally {
      setSaving(false);
    }
  };

  const update = (id: string, patch: Partial<UatScenario>) => {
    persist(
      scenarios.map((s) =>
        s.id === id
          ? {
              ...s,
              ...patch,
              testedAt:
                patch.status && patch.status !== "not_started"
                  ? new Date().toISOString().slice(0, 10)
                  : s.testedAt,
            }
          : s,
      ),
    );
  };

  const addScenario = () => {
    const scenario = newScenario.trim();
    if (!scenario) return;
    persist([
      ...scenarios,
      {
        id: newUatId(),
        scenario,
        steps: "",
        expected: "",
        status: "not_started",
      },
    ]);
    setNewScenario("");
  };

  const progress = uatProgress(scenarios);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-fg-primary">UAT scenarios</h3>
            <p className="mt-1 text-sm text-fg-secondary">
              Track pass/fail per scenario. Import from workshop-spec.md on first open.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-fg-body">
              {progress.pass} / {progress.total} pass ({progress.percent}%)
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {scenarios.length === 0 && (
            <p className="text-sm text-fg-muted">
              No scenarios yet. Add below or fill the UAT table in workshop-spec.md and reload.
            </p>
          )}
          {scenarios.map((s, i) => (
            <div key={s.id} className="card-kit p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-fg-muted">Scenario {i + 1}</p>
                  <TextInput
                    value={s.scenario}
                    onChange={(v) => update(s.id, { scenario: v })}
                    placeholder="Scenario name"
                  />
                </div>
                <div className="w-36">
                  <SelectInput
                    value={s.status}
                    onChange={(v) => update(s.id, { status: v as UatStatus })}
                    options={Object.entries(UAT_STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextInput
                  value={s.steps}
                  onChange={(v) => update(s.id, { steps: v })}
                  placeholder="Steps"
                />
                <TextInput
                  value={s.expected}
                  onChange={(v) => update(s.id, { expected: v })}
                  placeholder="Expected result"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <UserPicker
                    projectPath={projectPath}
                    value={s.tester || ""}
                    onChange={(v) => update(s.id, { tester: v })}
                    placeholder="Tester"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => persist(scenarios.filter((x) => x.id !== s.id))}
                  className="text-xs text-fg-muted hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <TextInput
              value={newScenario}
              onChange={setNewScenario}
              placeholder="New UAT scenario…"
            />
          </div>
          <button
            type="button"
            onClick={addScenario}
            className="inline-flex items-center gap-1 rounded-xl border border-surface-border-strong px-3 py-2 text-sm hover:text-fg-primary"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {saving && <p className="mt-2 text-xs text-fg-muted">Saving…</p>}
      </div>
    </div>
  );
}
