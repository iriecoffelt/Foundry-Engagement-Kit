import { AlertTriangle, Ban, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  emptyRegister,
  loadRegister,
  newRegisterId,
  saveRegister,
} from "../../lib/engagementRegister";
import type { BlockerEntry, EngagementRegister, RiskEntry } from "../../types";
import { Field, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { UserPicker } from "./UserPicker";

interface EngagementRegisterViewProps {
  projectPath: string;
}

export function EngagementRegisterView({ projectPath }: EngagementRegisterViewProps) {
  const [register, setRegister] = useState<EngagementRegister>(emptyRegister());
  const [saving, setSaving] = useState(false);
  const [newBlocker, setNewBlocker] = useState("");
  const [newRisk, setNewRisk] = useState("");

  const load = useCallback(async () => {
    setRegister(await loadRegister(projectPath));
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (next: EngagementRegister) => {
    setRegister(next);
    setSaving(true);
    try {
      await saveRegister(projectPath, next);
    } finally {
      setSaving(false);
    }
  };

  const addBlocker = () => {
    const title = newBlocker.trim();
    if (!title) return;
    persist({
      ...register,
      blockers: [
        ...register.blockers,
        {
          id: newRegisterId(),
          title,
          owner: "",
          escalate: false,
          status: "open",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setNewBlocker("");
  };

  const addRisk = () => {
    const title = newRisk.trim();
    if (!title) return;
    persist({
      ...register,
      risks: [
        ...register.risks,
        {
          id: newRegisterId(),
          title,
          likelihood: "Medium",
          impact: "Medium",
          mitigation: "",
          status: "open",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setNewRisk("");
  };

  const updateBlocker = (id: string, patch: Partial<BlockerEntry>) => {
    persist({
      ...register,
      blockers: register.blockers.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const updateRisk = (id: string, patch: Partial<RiskEntry>) => {
    persist({
      ...register,
      risks: register.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const resolveBlocker = (id: string) => {
    updateBlocker(id, { status: "resolved", resolvedAt: new Date().toISOString() });
  };

  const resolveRisk = (id: string, status: "mitigated" | "accepted") => {
    updateRisk(id, { status, resolvedAt: new Date().toISOString() });
  };

  const openBlockers = register.blockers.filter((b) => b.status === "open");
  const openRisks = register.risks.filter((r) => r.status === "open");

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-fg-primary">Blocker & risk register</h3>
          <p className="mt-1 text-sm text-fg-secondary">
            Living register — blockers from standups and risks from weekly reviews import here
            automatically.
          </p>
        </div>

        <section className="card-kit p-5">
          <div className="flex items-center gap-2">
            <Ban size={18} className="text-amber-400" />
            <h4 className="font-medium text-fg-primary">
              Blockers <span className="text-fg-muted">({openBlockers.length} open)</span>
            </h4>
          </div>
          <div className="mt-4 space-y-3">
            {register.blockers.length === 0 && (
              <p className="text-sm text-fg-muted">No blockers logged yet.</p>
            )}
            {register.blockers.map((b) => (
              <div
                key={b.id}
                className={`rounded-lg border p-3 ${
                  b.status === "open"
                    ? "border-amber-500/30 bg-amber-950/10"
                    : "border-surface-border opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-fg-primary">{b.title}</p>
                  {b.status === "open" && (
                    <button
                      type="button"
                      onClick={() => resolveBlocker(b.id)}
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      Resolve
                    </button>
                  )}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <UserPicker
                    projectPath={projectPath}
                    value={b.owner}
                    onChange={(v) => updateBlocker(b.id, { owner: v })}
                    placeholder="Owner"
                  />
                  <label className="flex items-center gap-2 text-sm text-fg-body">
                    <input
                      type="checkbox"
                      checked={b.escalate}
                      onChange={(e) => updateBlocker(b.id, { escalate: e.target.checked })}
                    />
                    Escalate
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <div className="flex-1">
              <TextInput
                value={newBlocker}
                onChange={setNewBlocker}
                placeholder="New blocker…"
              />
            </div>
            <button
              type="button"
              onClick={addBlocker}
              className="inline-flex items-center gap-1 rounded-xl border border-surface-border-strong px-3 py-2 text-sm hover:text-fg-primary"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </section>

        <section className="card-kit p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            <h4 className="font-medium text-fg-primary">
              Risks <span className="text-fg-muted">({openRisks.length} open)</span>
            </h4>
          </div>
          <div className="mt-4 space-y-3">
            {register.risks.length === 0 && (
              <p className="text-sm text-fg-muted">No risks logged yet.</p>
            )}
            {register.risks.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border p-3 ${
                  r.status === "open"
                    ? "border-red-500/20 bg-red-950/10"
                    : "border-surface-border opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-fg-primary">{r.title}</p>
                  {r.status === "open" && (
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => resolveRisk(r.id, "mitigated")}
                        className="text-brand-400 hover:text-brand-300"
                      >
                        Mitigated
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveRisk(r.id, "accepted")}
                        className="text-fg-muted hover:text-fg-primary"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field label="Likelihood">
                    <SelectInput
                      value={r.likelihood}
                      onChange={(v) =>
                        updateRisk(r.id, { likelihood: v as RiskEntry["likelihood"] })
                      }
                      options={["Low", "Medium", "High"].map((l) => ({ value: l, label: l }))}
                    />
                  </Field>
                  <Field label="Impact">
                    <SelectInput
                      value={r.impact}
                      onChange={(v) => updateRisk(r.id, { impact: v as RiskEntry["impact"] })}
                      options={["Low", "Medium", "High"].map((l) => ({ value: l, label: l }))}
                    />
                  </Field>
                </div>
                <div className="mt-2">
                  <TextArea
                    value={r.mitigation}
                    onChange={(v) => updateRisk(r.id, { mitigation: v })}
                    placeholder="Mitigation plan"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <div className="flex-1">
              <TextInput value={newRisk} onChange={setNewRisk} placeholder="New risk…" />
            </div>
            <button
              type="button"
              onClick={addRisk}
              className="inline-flex items-center gap-1 rounded-xl border border-surface-border-strong px-3 py-2 text-sm hover:text-fg-primary"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </section>

        {saving && <p className="text-xs text-fg-muted">Saving…</p>}
      </div>
    </div>
  );
}
