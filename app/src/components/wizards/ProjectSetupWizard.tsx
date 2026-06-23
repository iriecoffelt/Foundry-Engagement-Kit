import { useState } from "react";
import { api } from "../../lib/api";
import {
  engagementToJson,
  generateDiscoveryMd,
  generateProjectReadme,
  generateScopingMd,
  slugify,
} from "../../lib/markdown";
import type { EngagementData, EngagementStatus, Stakeholder, SuccessMetric } from "../../types";
import {
  FormCard,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from "../forms/FormField";
import { WizardShell } from "../wizard/WizardShell";

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "problem", label: "Problem" },
  { id: "people", label: "People" },
  { id: "goals", label: "Goals" },
  { id: "review", label: "Review" },
];

const STATUS_OPTIONS: { value: EngagementStatus; label: string }[] = [
  { value: "discovery", label: "Discovery" },
  { value: "scoping", label: "Scoping" },
  { value: "design", label: "Design" },
  { value: "build", label: "Build" },
  { value: "deploy", label: "Deploy" },
  { value: "handoff", label: "Handoff" },
];

const emptyStakeholder = (): Stakeholder => ({
  name: "",
  role: "",
  influence: "Medium",
  notes: "",
});

const emptyMetric = (): SuccessMetric => ({
  metric: "",
  baseline: "",
  target: "",
});

const initialData = (): EngagementData => ({
  displayName: "",
  customer: "",
  fdeLead: "",
  startDate: new Date().toISOString().slice(0, 10),
  targetGoLive: "",
  status: "discovery",
  description: "",
  asIs: "",
  pain: "",
  toBe: "",
  outOfScope: "",
  stakeholders: [emptyStakeholder()],
  successMetrics: [emptyMetric()],
});

interface ProjectSetupWizardProps {
  onComplete: (projectPath: string) => void;
  onCancel: () => void;
}

export function ProjectSetupWizard({ onComplete, onCancel }: ProjectSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<EngagementData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slug = slugify(data.displayName);

  const canProceed = () => {
    if (step === 0) return data.displayName.trim().length > 0 && data.customer.trim().length > 0;
    if (step === 1) return data.asIs.trim().length > 0 && data.toBe.trim().length > 0;
    return true;
  };

  const finish = async () => {
    if (!slug) {
      setError("Please enter a valid project name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const projectPath = await api.createProject(slug);
      await api.writeJson(`${projectPath}/engagement.json`, engagementToJson(data));
      await api.writeFile(`${projectPath}/README.md`, generateProjectReadme(slug, data));
      await api.writeFile(`${projectPath}/00-discovery/discovery.md`, generateDiscoveryMd(data));
      await api.writeFile(`${projectPath}/01-scoping/scoping.md`, generateScopingMd(data));
      await api.createDirectory(`${projectPath}/references`);
      onComplete(projectPath);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardShell
      title="Set up a new engagement"
      subtitle="We'll walk you through the essentials. Your answers become project docs automatically."
      steps={STEPS}
      currentStep={step}
      onBack={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
      onNext={() => setStep((s) => s + 1)}
      onFinish={finish}
      canProceed={canProceed()}
      loading={loading}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 0 && (
        <FormCard title="Engagement basics" description="Who, what, and when.">
          <FormField label="Engagement name" hint="e.g. Acme Order Management">
            <TextInput
              value={data.displayName}
              onChange={(v) => setData({ ...data, displayName: v })}
              placeholder="Acme Order Management"
            />
          </FormField>
          {slug && (
            <p className="text-xs text-slate-500">
              Folder name: <span className="text-brand-400">{slug}</span>
            </p>
          )}
          <FormField label="Customer">
            <TextInput
              value={data.customer}
              onChange={(v) => setData({ ...data, customer: v })}
              placeholder="Acme Corp"
            />
          </FormField>
          <FormField label="Your name">
            <TextInput
              value={data.fdeLead}
              onChange={(v) => setData({ ...data, fdeLead: v })}
              placeholder="Jane Smith"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Start date">
              <TextInput
                type="date"
                value={data.startDate}
                onChange={(v) => setData({ ...data, startDate: v })}
              />
            </FormField>
            <FormField label="Target go-live">
              <TextInput
                type="date"
                value={data.targetGoLive}
                onChange={(v) => setData({ ...data, targetGoLive: v })}
              />
            </FormField>
          </div>
          <FormField label="Current phase">
            <SelectInput
              value={data.status}
              onChange={(v) => setData({ ...data, status: v as EngagementStatus })}
              options={STATUS_OPTIONS}
            />
          </FormField>
          <FormField label="One-line summary">
            <TextArea
              value={data.description}
              onChange={(v) => setData({ ...data, description: v })}
              placeholder="What does this engagement deliver?"
              rows={2}
            />
          </FormField>
        </FormCard>
      )}

      {step === 1 && (
        <FormCard title="The problem" description="Frame the business case in plain language.">
          <FormField label="How do they work today?">
            <TextArea value={data.asIs} onChange={(v) => setData({ ...data, asIs: v })} />
          </FormField>
          <FormField label="What's painful or costly?">
            <TextArea value={data.pain} onChange={(v) => setData({ ...data, pain: v })} />
          </FormField>
          <FormField label="What does success look like in Foundry?">
            <TextArea value={data.toBe} onChange={(v) => setData({ ...data, toBe: v })} />
          </FormField>
          <FormField label="What's explicitly out of scope?">
            <TextArea value={data.outOfScope} onChange={(v) => setData({ ...data, outOfScope: v })} />
          </FormField>
        </FormCard>
      )}

      {step === 2 && (
        <FormCard title="Key people" description="Stakeholders you'll work with on this engagement.">
          {data.stakeholders.map((s, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  value={s.name}
                  onChange={(v) => {
                    const stakeholders = [...data.stakeholders];
                    stakeholders[i] = { ...s, name: v };
                    setData({ ...data, stakeholders });
                  }}
                  placeholder="Name"
                />
                <TextInput
                  value={s.role}
                  onChange={(v) => {
                    const stakeholders = [...data.stakeholders];
                    stakeholders[i] = { ...s, role: v };
                    setData({ ...data, stakeholders });
                  }}
                  placeholder="Role"
                />
              </div>
              <TextInput
                value={s.notes}
                onChange={(v) => {
                  const stakeholders = [...data.stakeholders];
                  stakeholders[i] = { ...s, notes: v };
                  setData({ ...data, stakeholders });
                }}
                placeholder="Notes"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setData({ ...data, stakeholders: [...data.stakeholders, emptyStakeholder()] })
            }
            className="text-sm text-brand-400 hover:text-brand-300"
          >
            + Add stakeholder
          </button>
        </FormCard>
      )}

      {step === 3 && (
        <FormCard title="Success metrics" description="How will you know this engagement worked?">
          {data.successMetrics.map((m, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-3">
              <TextInput
                value={m.metric}
                onChange={(v) => {
                  const successMetrics = [...data.successMetrics];
                  successMetrics[i] = { ...m, metric: v };
                  setData({ ...data, successMetrics });
                }}
                placeholder="Metric"
              />
              <TextInput
                value={m.baseline}
                onChange={(v) => {
                  const successMetrics = [...data.successMetrics];
                  successMetrics[i] = { ...m, baseline: v };
                  setData({ ...data, successMetrics });
                }}
                placeholder="Baseline"
              />
              <TextInput
                value={m.target}
                onChange={(v) => {
                  const successMetrics = [...data.successMetrics];
                  successMetrics[i] = { ...m, target: v };
                  setData({ ...data, successMetrics });
                }}
                placeholder="Target"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setData({ ...data, successMetrics: [...data.successMetrics, emptyMetric()] })
            }
            className="text-sm text-brand-400 hover:text-brand-300"
          >
            + Add metric
          </button>
        </FormCard>
      )}

      {step === 4 && (
        <FormCard title="Ready to create" description="We'll scaffold your project folder and fill in the starter docs.">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Engagement</dt>
              <dd className="text-white">{data.displayName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Customer</dt>
              <dd className="text-white">{data.customer}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phase</dt>
              <dd className="capitalize text-white">{data.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Goal</dt>
              <dd className="text-slate-300">{data.toBe || "—"}</dd>
            </div>
          </dl>
        </FormCard>
      )}
    </WizardShell>
  );
}
