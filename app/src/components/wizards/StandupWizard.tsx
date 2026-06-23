import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { generateStandupMd, todayISO } from "../../lib/markdown";
import type { StandupData } from "../../types";
import { FormCard, FormField, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { ProjectPicker } from "../forms/ProjectPicker";
import { WizardShell } from "../wizard/WizardShell";

const STEPS = [
  { id: "project", label: "Project" },
  { id: "yesterday", label: "Yesterday" },
  { id: "today", label: "Today" },
  { id: "blockers", label: "Blockers" },
  { id: "review", label: "Review" },
];

const SURFACES = [
  { value: "", label: "—" },
  { value: "Ontology", label: "Ontology" },
  { value: "Pipeline", label: "Pipeline" },
  { value: "Workshop", label: "Workshop" },
  { value: "Other", label: "Other" },
];

interface StandupWizardProps {
  onComplete: (path: string) => void;
  onCancel: () => void;
}

export function StandupWizard({ onComplete, onCancel }: StandupWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<StandupData>({
    projectSlug: "",
    projectDisplay: "",
    milestone: "",
    yesterday: [""],
    today: [{ task: "", surface: "", priority: "P1" }],
    blockers: [{ blocker: "", owner: "", escalate: false }],
    meetings: "",
    notes: "",
  });

  const canProceed = step !== 0 || data.projectSlug.length > 0;

  const finish = async () => {
    setLoading(true);
    setError("");
    try {
      const date = todayISO();
      const dir = `daily/${data.projectSlug}`;
      const path = `${dir}/${date}-standup.md`;
      await api.createDirectory(dir);
      await api.writeFile(path, generateStandupMd(data));
      onComplete(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardShell
      title="Daily standup"
      subtitle="A quick check-in tied to your engagement."
      steps={STEPS}
      currentStep={step}
      onBack={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
      onNext={() => setStep((s) => s + 1)}
      onFinish={finish}
      canProceed={canProceed}
      loading={loading}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 0 && (
        <FormCard title="Which project?" description="Standups are saved under that project's daily folder.">
          <ProjectPicker
            value={data.projectSlug}
            onChange={(slug, display) =>
              setData({ ...data, projectSlug: slug, projectDisplay: display })
            }
          />
          <FormField label="Current milestone (optional)">
            <TextInput
              value={data.milestone}
              onChange={(v) => setData({ ...data, milestone: v })}
              placeholder="e.g. M2 — Alpha"
            />
          </FormField>
        </FormCard>
      )}

      {step === 1 && (
        <FormCard title="What did you accomplish yesterday?">
          {data.yesterday.map((y, i) => (
            <div key={i} className="flex gap-2">
              <TextInput
                value={y}
                onChange={(v) => {
                  const yesterday = [...data.yesterday];
                  yesterday[i] = v;
                  setData({ ...data, yesterday });
                }}
                placeholder="Completed…"
              />
              {data.yesterday.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setData({ ...data, yesterday: data.yesterday.filter((_, j) => j !== i) })
                  }
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setData({ ...data, yesterday: [...data.yesterday, ""] })}
            className="flex items-center gap-1 text-sm text-brand-400"
          >
            <Plus size={14} /> Add item
          </button>
        </FormCard>
      )}

      {step === 2 && (
        <FormCard title="What's on deck today?">
          {data.today.map((t, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 sm:grid-cols-4">
              <SelectInput
                value={t.priority}
                onChange={(v) => {
                  const today = [...data.today];
                  today[i] = { ...t, priority: v };
                  setData({ ...data, today });
                }}
                options={[
                  { value: "P0", label: "P0" },
                  { value: "P1", label: "P1" },
                  { value: "P2", label: "P2" },
                ]}
              />
              <TextInput
                value={t.task}
                onChange={(v) => {
                  const today = [...data.today];
                  today[i] = { ...t, task: v };
                  setData({ ...data, today });
                }}
                placeholder="Task"
              />
              <SelectInput
                value={t.surface}
                onChange={(v) => {
                  const today = [...data.today];
                  today[i] = { ...t, surface: v };
                  setData({ ...data, today });
                }}
                options={SURFACES}
              />
              <button
                type="button"
                onClick={() => setData({ ...data, today: data.today.filter((_, j) => j !== i) })}
                className="text-slate-500 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setData({
                ...data,
                today: [...data.today, { task: "", surface: "", priority: "P1" }],
              })
            }
            className="flex items-center gap-1 text-sm text-brand-400"
          >
            <Plus size={14} /> Add task
          </button>
        </FormCard>
      )}

      {step === 3 && (
        <FormCard title="Blockers & meetings">
          {data.blockers.map((b, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <TextInput
                value={b.blocker}
                onChange={(v) => {
                  const blockers = [...data.blockers];
                  blockers[i] = { ...b, blocker: v };
                  setData({ ...data, blockers });
                }}
                placeholder="Blocker"
              />
              <div className="flex gap-2">
                <TextInput
                  value={b.owner}
                  onChange={(v) => {
                    const blockers = [...data.blockers];
                    blockers[i] = { ...b, owner: v };
                    setData({ ...data, blockers });
                  }}
                  placeholder="Owner"
                />
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={b.escalate}
                    onChange={(e) => {
                      const blockers = [...data.blockers];
                      blockers[i] = { ...b, escalate: e.target.checked };
                      setData({ ...data, blockers });
                    }}
                  />
                  Escalate
                </label>
              </div>
            </div>
          ))}
          <FormField label="Customer meetings today">
            <TextArea
              value={data.meetings}
              onChange={(v) => setData({ ...data, meetings: v })}
              placeholder="None, or list meetings…"
              rows={2}
            />
          </FormField>
          <FormField label="Notes for tomorrow">
            <TextArea value={data.notes} onChange={(v) => setData({ ...data, notes: v })} rows={2} />
          </FormField>
        </FormCard>
      )}

      {step === 4 && (
        <FormCard title="Review your standup">
          <p className="text-sm text-slate-400">
            Saving to{" "}
            <span className="text-brand-400">
              daily/{data.projectSlug}/{todayISO()}-standup.md
            </span>
          </p>
          <p className="mt-2 text-white">{data.projectDisplay}</p>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-300">
            {data.yesterday.filter(Boolean).map((y, i) => (
              <li key={i}>{y}</li>
            ))}
          </ul>
        </FormCard>
      )}
    </WizardShell>
  );
}
