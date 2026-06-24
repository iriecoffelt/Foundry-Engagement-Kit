import { Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  emptyStakeholder,
  INFLUENCE_LEVELS,
  levelLabel,
  loadStakeholders,
  matrixPosition,
  quadrantLabel,
  saveStakeholders,
} from "../../lib/stakeholders";
import type { ProjectMeta, Stakeholder } from "../../types";
import {
  Field,
  FormCard,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "../forms/FormField";

interface StakeholderMapProps {
  project: ProjectMeta;
}

function LevelSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <SelectInput
        value={value || "M"}
        onChange={onChange}
        options={INFLUENCE_LEVELS.map((l) => ({ value: l, label: levelLabel(l) }))}
      />
    </Field>
  );
}

export function StakeholderMap({ project }: StakeholderMapProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const list = await loadStakeholders(project.path, {
      displayName: project.display_name,
      customer: project.customer,
      status: project.status,
      targetGoLive: project.target_go_live,
    });
    setStakeholders(list.length ? list : []);
    setSelectedId((current) => current ?? list[0]?.id ?? null);
  }, [project]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (updated: Stakeholder[]) => {
    setStakeholders(updated);
    setSaving(true);
    setMessage("");
    try {
      await saveStakeholders(project.path, updated);
      setMessage("Saved to engagement.json and discovery.md");
      setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  };

  const selected = stakeholders.find((s) => s.id === selectedId) ?? null;

  const updateSelected = (patch: Partial<Stakeholder>) => {
    if (!selected?.id) return;
    const updated = stakeholders.map((s) => (s.id === selected.id ? { ...s, ...patch } : s));
    persist(updated);
  };

  const addPerson = () => {
    const person = emptyStakeholder();
    const updated = [...stakeholders, person];
    setSelectedId(person.id ?? null);
    persist(updated);
  };

  const removeSelected = () => {
    if (!selected?.id) return;
    const updated = stakeholders.filter((s) => s.id !== selected.id);
    setSelectedId(updated[0]?.id ?? null);
    persist(updated);
  };

  const named = stakeholders.filter((s) => s.name.trim() || s.role.trim());

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users size={20} className="text-brand-500" />
              <h3 className="text-lg font-semibold text-fg-primary">Stakeholder map</h3>
            </div>
            <p className="mt-1 text-sm text-fg-secondary">
              Power–interest matrix synced to <code className="text-brand-300">engagement.json</code>{" "}
              and <code className="text-brand-300">00-discovery/discovery.md</code>
            </p>
          </div>
          <PrimaryButton onClick={addPerson} disabled={saving}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} /> Add person
            </span>
          </PrimaryButton>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="card-kit relative aspect-square overflow-hidden p-4 lg:col-span-3">
            <p className="absolute left-1/2 top-2 z-10 -translate-x-1/2 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
              High interest
            </p>
            <p className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
              Low interest
            </p>
            <p className="absolute left-2 top-1/2 z-10 -translate-y-1/2 -rotate-90 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
              Low influence
            </p>
            <p className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rotate-90 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
              High influence
            </p>

            <div className="absolute inset-8 rounded-xl border border-surface-border bg-surface-base/50">
              <div className="absolute left-1/2 top-0 h-full w-px bg-surface-border/80" />
              <div className="absolute left-0 top-1/2 h-px w-full bg-surface-border/80" />

              <span className="absolute left-2 top-2 max-w-[42%] text-[10px] leading-tight text-fg-faint">
                Keep informed
              </span>
              <span className="absolute right-2 top-2 max-w-[42%] text-right text-[10px] leading-tight text-emerald-400/80">
                Manage closely
              </span>
              <span className="absolute bottom-2 left-2 max-w-[42%] text-[10px] leading-tight text-fg-faint">
                Monitor
              </span>
              <span className="absolute bottom-2 right-2 max-w-[42%] text-right text-[10px] leading-tight text-amber-400/80">
                Keep satisfied
              </span>

              {named.map((s) => {
                const pos = matrixPosition(s.influence, s.interest || "M", s.id || s.name);
                const active = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id || null)}
                    className={`absolute z-20 max-w-[38%] -translate-x-1/2 -translate-y-1/2 truncate rounded-lg border px-2 py-1 text-left text-xs shadow transition ${
                      active
                        ? "border-brand-500 bg-brand-600 text-fg-on-accent"
                        : "border-surface-border-strong bg-surface-raised text-fg-body hover:border-brand-500/50"
                    }`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    title={`${s.name} — ${quadrantLabel(s.influence, s.interest || "M")}`}
                  >
                    <span className="block truncate font-medium">{s.name || s.role || "Unnamed"}</span>
                    {s.role && s.name && (
                      <span className={`block truncate text-[10px] ${active ? "text-brand-100" : "text-fg-muted"}`}>
                        {s.role}
                      </span>
                    )}
                  </button>
                );
              })}

              {named.length === 0 && (
                <div className="flex h-full items-center justify-center text-sm text-fg-muted">
                  Add people to plot them on the map
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {selected ? (
              <FormCard title="Edit person" description={quadrantLabel(selected.influence, selected.interest || "M")}>
                <Field label="Name">
                  <TextInput value={selected.name} onChange={(v) => updateSelected({ name: v })} />
                </Field>
                <Field label="Role">
                  <TextInput
                    value={selected.role}
                    onChange={(v) => updateSelected({ role: v })}
                    placeholder="Executive sponsor, domain expert…"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LevelSelect
                    label="Influence"
                    value={selected.influence || "M"}
                    onChange={(v) => updateSelected({ influence: v })}
                  />
                  <LevelSelect
                    label="Interest"
                    value={selected.interest || "M"}
                    onChange={(v) => updateSelected({ interest: v })}
                  />
                </div>
                <Field label="Notes">
                  <TextArea
                    value={selected.notes}
                    onChange={(v) => updateSelected({ notes: v })}
                    rows={3}
                    placeholder="Communication preferences, concerns, reporting line…"
                  />
                </Field>
                <SecondaryButton onClick={removeSelected} disabled={saving}>
                  <span className="inline-flex items-center gap-2 text-red-400">
                    <Trash2 size={14} /> Remove
                  </span>
                </SecondaryButton>
              </FormCard>
            ) : (
              <div className="card-kit border-dashed p-8 text-center text-sm text-fg-muted">
                Select a person on the map or add someone new
              </div>
            )}

            {named.length > 0 && (
              <div className="card-kit p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">All stakeholders</p>
                <ul className="space-y-1">
                  {named.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id || null)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                          s.id === selectedId
                            ? "bg-brand-600/20 text-brand-300"
                            : "text-fg-body hover:bg-surface-elevated"
                        }`}
                      >
                        <span className="font-medium">{s.name || "Unnamed"}</span>
                        {s.role && <span className="text-fg-muted"> · {s.role}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {message && <p className="text-sm text-brand-300">{message}</p>}
        {saving && <p className="text-sm text-fg-muted">Saving…</p>}
      </div>
    </div>
  );
}
