import { Plus } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { generateWeeklyMd, todayISO } from "../../lib/markdown";
import type { WeeklyReviewData } from "../../types";
import { FormCard, FormField, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { ProjectPicker } from "../forms/ProjectPicker";
import { WizardShell } from "../wizard/WizardShell";

const STEPS = [
  { id: "project", label: "Project" },
  { id: "wins", label: "Wins" },
  { id: "risks", label: "Risks" },
  { id: "ahead", label: "Ahead" },
  { id: "review", label: "Review" },
];

const PHASES = [
  "Discovery",
  "Scoping",
  "Design",
  "Build",
  "Deploy",
  "Handoff",
].map((p) => ({ value: p, label: p }));

interface WeeklyReviewWizardProps {
  onComplete: (path: string) => void;
  onCancel: () => void;
}

export function WeeklyReviewWizard({ onComplete, onCancel }: WeeklyReviewWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<WeeklyReviewData>({
    projectSlug: "",
    projectDisplay: "",
    phase: "Build",
    wins: [""],
    deliverables: [{ name: "", resource: "", customerVisible: false }],
    risks: [{ risk: "", likelihood: "Medium", impact: "Medium", mitigation: "" }],
    nextWeek: [""],
    openQuestions: "",
  });

  const canProceed = step !== 0 || data.projectSlug.length > 0;

  const finish = async () => {
    setLoading(true);
    setError("");
    try {
      const date = todayISO();
      const dir = `weekly/${data.projectSlug}`;
      const path = `${dir}/${date}-weekly-review.md`;
      await api.createDirectory(dir);
      await api.writeFile(path, generateWeeklyMd(data));
      onComplete(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardShell
      title="Weekly review"
      subtitle="Reflect on the week and plan what's next."
      steps={STEPS}
      step={step}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
      onCancel={onCancel}
      canNext={canProceed && !loading}
      isLast={step === STEPS.length - 1}
      finishLabel={loading ? "Saving…" : "Save review"}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 0 && (
        <FormCard title="Which project?">
          <ProjectPicker
            value={data.projectSlug}
            onChange={(slug, display) =>
              setData({ ...data, projectSlug: slug, projectDisplay: display })
            }
          />
          <FormField label="Current phase">
            <SelectInput
              value={data.phase}
              onChange={(v) => setData({ ...data, phase: v })}
              options={PHASES}
            />
          </FormField>
        </FormCard>
      )}

      {step === 1 && (
        <FormCard title="Wins & deliverables">
          <FormField label="Top wins this week">
            {data.wins.map((w, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <TextInput
                  value={w}
                  onChange={(v) => {
                    const wins = [...data.wins];
                    wins[i] = v;
                    setData({ ...data, wins });
                  }}
                  placeholder={`Win ${i + 1}`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setData({ ...data, wins: [...data.wins, ""] })}
              className="flex items-center gap-1 text-sm text-brand-400"
            >
              <Plus size={14} /> Add win
            </button>
          </FormField>
          {data.deliverables.map((d, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 sm:grid-cols-2">
              <TextInput
                value={d.name}
                onChange={(v) => {
                  const deliverables = [...data.deliverables];
                  deliverables[i] = { ...d, name: v };
                  setData({ ...data, deliverables });
                }}
                placeholder="Deliverable"
              />
              <TextInput
                value={d.resource}
                onChange={(v) => {
                  const deliverables = [...data.deliverables];
                  deliverables[i] = { ...d, resource: v };
                  setData({ ...data, deliverables });
                }}
                placeholder="Foundry resource"
              />
            </div>
          ))}
        </FormCard>
      )}

      {step === 2 && (
        <FormCard title="Risks">
          {data.risks.map((r, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <TextInput
                value={r.risk}
                onChange={(v) => {
                  const risks = [...data.risks];
                  risks[i] = { ...r, risk: v };
                  setData({ ...data, risks });
                }}
                placeholder="Risk"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <SelectInput
                  value={r.likelihood}
                  onChange={(v) => {
                    const risks = [...data.risks];
                    risks[i] = { ...r, likelihood: v };
                    setData({ ...data, risks });
                  }}
                  options={["Low", "Medium", "High"].map((x) => ({ value: x, label: x }))}
                />
                <SelectInput
                  value={r.impact}
                  onChange={(v) => {
                    const risks = [...data.risks];
                    risks[i] = { ...r, impact: v };
                    setData({ ...data, risks });
                  }}
                  options={["Low", "Medium", "High"].map((x) => ({ value: x, label: x }))}
                />
              </div>
              <TextInput
                value={r.mitigation}
                onChange={(v) => {
                  const risks = [...data.risks];
                  risks[i] = { ...r, mitigation: v };
                  setData({ ...data, risks });
                }}
                placeholder="Mitigation"
              />
              <button
                type="button"
                onClick={() => setData({ ...data, risks: data.risks.filter((_, j) => j !== i) })}
                className="text-xs text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setData({
                ...data,
                risks: [
                  ...data.risks,
                  { risk: "", likelihood: "Medium", impact: "Medium", mitigation: "" },
                ],
              })
            }
            className="flex items-center gap-1 text-sm text-brand-400"
          >
            <Plus size={14} /> Add risk
          </button>
        </FormCard>
      )}

      {step === 3 && (
        <FormCard title="Looking ahead">
          <FormField label="Next week priorities">
            {data.nextWeek.map((n, i) => (
              <div key={i} className="mb-2">
                <TextInput
                  value={n}
                  onChange={(v) => {
                    const nextWeek = [...data.nextWeek];
                    nextWeek[i] = v;
                    setData({ ...data, nextWeek });
                  }}
                  placeholder={`Priority ${i + 1}`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setData({ ...data, nextWeek: [...data.nextWeek, ""] })}
              className="flex items-center gap-1 text-sm text-brand-400"
            >
              <Plus size={14} /> Add priority
            </button>
          </FormField>
          <FormField label="Open questions for customer">
            <TextArea
              value={data.openQuestions}
              onChange={(v) => setData({ ...data, openQuestions: v })}
            />
          </FormField>
        </FormCard>
      )}

      {step === 4 && (
        <FormCard title="Review your weekly">
          <p className="text-sm text-slate-400">
            Saving to{" "}
            <span className="text-brand-400">
              weekly/{data.projectSlug}/{todayISO()}-weekly-review.md
            </span>
          </p>
          <p className="mt-2 font-medium text-white">{data.projectDisplay}</p>
        </FormCard>
      )}
    </WizardShell>
  );
}
