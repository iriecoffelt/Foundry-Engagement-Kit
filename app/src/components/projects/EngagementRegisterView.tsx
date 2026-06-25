import { AlertTriangle, Ban, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyRegister,
  loadRegister,
  newRegisterId,
  saveRegister,
} from "../../lib/engagementRegister";
import { getRegisterShowResolved, setRegisterShowResolved } from "../../lib/uiPrefs";
import { useDebouncedPersist } from "../../hooks/useDebouncedPersist";
import type { BlockerEntry, EngagementRegister, RiskEntry } from "../../types";
import { Field, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { UserPicker } from "./UserPicker";

interface EngagementRegisterViewProps {
  projectPath: string;
}

export function EngagementRegisterView({ projectPath }: EngagementRegisterViewProps) {
  const [register, setRegister] = useState<EngagementRegister>(emptyRegister());
  const [saving, setSaving] = useState(false);
  const [showResolved, setShowResolved] = useState(() => getRegisterShowResolved(projectPath));
  const [newBlocker, setNewBlocker] = useState("");
  const [newRisk, setNewRisk] = useState("");
  const registerRef = useRef(register);
  registerRef.current = register;

  const load = useCallback(async () => {
    const data = await loadRegister(projectPath);
    registerRef.current = data;
    setRegister(data);
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setShowResolved(getRegisterShowResolved(projectPath));
  }, [projectPath]);

  const toggleShowResolved = (value: boolean) => {
    setShowResolved(value);
    setRegisterShowResolved(projectPath, value);
  };

  const { schedule: scheduleSave, flushNow: flushSave } = useDebouncedPersist<EngagementRegister>({
    save: (next) => saveRegister(projectPath, next),
    onSavingChange: setSaving,
  });

  const applyRegister = useCallback(
    (updater: (prev: EngagementRegister) => EngagementRegister, immediate = false) => {
      const next = updater(registerRef.current);
      registerRef.current = next;
      setRegister(next);
      if (immediate) {
        void flushSave(next);
      } else {
        scheduleSave(next);
      }
    },
    [flushSave, scheduleSave],
  );

  const addBlocker = () => {
    const title = newBlocker.trim();
    if (!title) return;
    applyRegister(
      (prev) => ({
        ...prev,
        blockers: [
          ...prev.blockers,
          {
            id: newRegisterId(),
            title,
            owner: "",
            escalate: false,
            status: "open",
            createdAt: new Date().toISOString(),
          },
        ],
      }),
      true,
    );
    setNewBlocker("");
  };

  const addRisk = () => {
    const title = newRisk.trim();
    if (!title) return;
    applyRegister(
      (prev) => ({
        ...prev,
        risks: [
          ...prev.risks,
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
      }),
      true,
    );
    setNewRisk("");
  };

  const updateBlocker = (id: string, patch: Partial<BlockerEntry>) => {
    applyRegister((prev) => ({
      ...prev,
      blockers: prev.blockers.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const updateRisk = (id: string, patch: Partial<RiskEntry>) => {
    applyRegister((prev) => ({
      ...prev,
      risks: prev.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const resolveBlocker = (id: string) => {
    applyRegister(
      (prev) => ({
        ...prev,
        blockers: prev.blockers.map((b) =>
          b.id === id
            ? { ...b, status: "resolved" as const, resolvedAt: new Date().toISOString() }
            : b,
        ),
      }),
      true,
    );
  };

  const resolveRisk = (id: string, status: "mitigated" | "accepted") => {
    applyRegister(
      (prev) => ({
        ...prev,
        risks: prev.risks.map((r) =>
          r.id === id ? { ...r, status, resolvedAt: new Date().toISOString() } : r,
        ),
      }),
      true,
    );
  };

  const openBlockers = register.blockers.filter((b) => b.status === "open");
  const openRisks = register.risks.filter((r) => r.status === "open");
  const resolvedBlockers = register.blockers.filter((b) => b.status !== "open");
  const resolvedRisks = register.risks.filter((r) => r.status !== "open");
  const visibleBlockers = showResolved ? register.blockers : openBlockers;
  const visibleRisks = showResolved ? register.risks : openRisks;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-fg-primary">Blocker & risk register</h3>
            <p className="mt-1 text-sm text-fg-secondary">
              Living register — blockers from standups and risks from weekly reviews import here
              automatically.
            </p>
          </div>
          {(resolvedBlockers.length > 0 || resolvedRisks.length > 0) && (
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => toggleShowResolved(e.target.checked)}
              />
              Show resolved ({resolvedBlockers.length + resolvedRisks.length})
            </label>
          )}
        </div>

        <section className="card-kit p-5">
          <div className="flex items-center gap-2">
            <Ban size={18} className="text-amber-400" />
            <h4 className="font-medium text-fg-primary">
              Blockers <span className="text-fg-muted">({openBlockers.length} open)</span>
            </h4>
          </div>
          <div className="mt-4 space-y-3">
            {visibleBlockers.length === 0 && (
              <p className="text-sm text-fg-muted">
                {showResolved ? "No blockers logged yet." : "No open blockers."}
              </p>
            )}
            {visibleBlockers.map((b) => (
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
            {visibleRisks.length === 0 && (
              <p className="text-sm text-fg-muted">
                {showResolved ? "No risks logged yet." : "No open risks."}
              </p>
            )}
            {visibleRisks.map((r) => (
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
