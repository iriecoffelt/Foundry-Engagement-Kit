import { useState } from "react";
import { api } from "../../lib/api";
import {
  DEFAULT_CHECKLIST,
  checklistPath,
} from "../../lib/phaseChecklist";
import {
  engagementToJson,
  generateDiscoveryMd,
  generateProjectReadme,
  generateScopingMd,
  slugify,
} from "../../lib/markdown";
import type { EngagementData, EngagementStatus, SuccessMetric } from "../../types";
import { emptyStakeholder } from "../../lib/stakeholders";
import { Field, FormCard, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { WizardShell } from "../wizard/WizardShell";

const emptyMetric = (): SuccessMetric => ({
  metric: "",
  baseline: "",
  target: "",
});

const defaultData = (): EngagementData => ({
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
  const [data, setData] = useState<EngagementData>(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const steps = [
    { label: "Basics" },
    { label: "Problem" },
    { label: "People" },
    { label: "Goals" },
    { label: "Review" },
  ];

  const finish = async () => {
    setLoading(true);
    setError("");
    try {
      const slug = slugify(data.displayName);
      const path = await api.setupEngagementProject(
        slug,
        engagementToJson(data),
        generateProjectReadme(slug, data),
        generateDiscoveryMd(data),
        generateScopingMd(data),
      );
      await api.writeJson(checklistPath(path), structuredClone(DEFAULT_CHECKLIST));
      onComplete(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === steps.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const canNext =
    step === 0
      ? data.displayName.trim().length > 0 && data.customer.trim().length > 0
      : step === 1
        ? data.asIs.trim().length > 0 && data.toBe.trim().length > 0
        : true;

  return (
    <WizardShell
      title="Start a new engagement"
      subtitle="We'll set up your project folder and documents automatically."
      steps={steps}
      step={step}
      onBack={() => setStep((s) => s - 1)}
      onNext={handleNext}
      onCancel={onCancel}
      canNext={canNext && !loading}
      isLast={step === steps.length - 1}
      finishLabel={loading ? "Creating…" : "Create project"}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 0 && (
        <FormCard title="Engagement basics" description="Who is this for and when does it need to ship?">
          <Field label="Project name" hint="How you'll refer to this engagement">
            <TextInput
              value={data.displayName}
              onChange={(v) => setData({ ...data, displayName: v })}
              placeholder="Acme Order Management"
            />
          </Field>
          <Field label="Customer">
            <TextInput
              value={data.customer}
              onChange={(v) => setData({ ...data, customer: v })}
              placeholder="Acme Corp"
            />
          </Field>
          <Field label="Your name">
            <TextInput
              value={data.fdeLead}
              onChange={(v) => setData({ ...data, fdeLead: v })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <TextInput
                type="date"
                value={data.startDate}
                onChange={(v) => setData({ ...data, startDate: v })}
              />
            </Field>
            <Field label="Target go-live">
              <TextInput
                type="date"
                value={data.targetGoLive}
                onChange={(v) => setData({ ...data, targetGoLive: v })}
              />
            </Field>
          </div>
          <Field label="One-line summary">
            <TextArea
              value={data.description}
              onChange={(v) => setData({ ...data, description: v })}
              placeholder="What will users be able to do when this is done?"
              rows={2}
            />
          </Field>
          <Field label="Current phase">
            <SelectInput
              value={data.status}
              onChange={(v) => setData({ ...data, status: v as EngagementStatus })}
              options={[
                { value: "discovery", label: "Discovery" },
                { value: "scoping", label: "Scoping" },
                { value: "design", label: "Design" },
                { value: "build", label: "Build" },
                { value: "deploy", label: "Deploy" },
                { value: "handoff", label: "Handoff" },
              ]}
            />
          </Field>
        </FormCard>
      )}

      {step === 1 && (
        <FormCard title="The problem" description="Describe the workflow you're improving.">
          <Field label="How does it work today?">
            <TextArea value={data.asIs} onChange={(v) => setData({ ...data, asIs: v })} />
          </Field>
          <Field label="What's painful or costly?">
            <TextArea value={data.pain} onChange={(v) => setData({ ...data, pain: v })} />
          </Field>
          <Field label="What should it look like in Foundry?">
            <TextArea value={data.toBe} onChange={(v) => setData({ ...data, toBe: v })} />
          </Field>
          <Field label="Out of scope (for now)">
            <TextArea value={data.outOfScope} onChange={(v) => setData({ ...data, outOfScope: v })} />
          </Field>
        </FormCard>
      )}

      {step === 2 && (
        <FormCard title="Key people" description="Who cares about this engagement?">
          {data.stakeholders.map((s, i) => (
            <div key={i} className="rounded-lg border border-surface-border p-4 space-y-3">
              <Field label="Name">
                <TextInput
                  value={s.name}
                  onChange={(v) => {
                    const stakeholders = [...data.stakeholders];
                    stakeholders[i] = { ...s, name: v };
                    setData({ ...data, stakeholders });
                  }}
                />
              </Field>
              <Field label="Role">
                <TextInput
                  value={s.role}
                  onChange={(v) => {
                    const stakeholders = [...data.stakeholders];
                    stakeholders[i] = { ...s, role: v };
                    setData({ ...data, stakeholders });
                  }}
                />
              </Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setData({ ...data, stakeholders: [...data.stakeholders, emptyStakeholder()] })
            }
            className="text-sm text-brand-400 hover:text-brand-300"
          >
            + Add another person
          </button>
        </FormCard>
      )}

      {step === 3 && (
        <FormCard title="Success metrics" description="How will you know this worked?">
          {data.successMetrics.map((m, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-3">
              <Field label="Metric">
                <TextInput
                  value={m.metric}
                  onChange={(v) => {
                    const successMetrics = [...data.successMetrics];
                    successMetrics[i] = { ...m, metric: v };
                    setData({ ...data, successMetrics });
                  }}
                />
              </Field>
              <Field label="Baseline">
                <TextInput
                  value={m.baseline}
                  onChange={(v) => {
                    const successMetrics = [...data.successMetrics];
                    successMetrics[i] = { ...m, baseline: v };
                    setData({ ...data, successMetrics });
                  }}
                />
              </Field>
              <Field label="Target">
                <TextInput
                  value={m.target}
                  onChange={(v) => {
                    const successMetrics = [...data.successMetrics];
                    successMetrics[i] = { ...m, target: v };
                    setData({ ...data, successMetrics });
                  }}
                />
              </Field>
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
        <FormCard title="Ready to create" description="We'll generate your project folder and starter docs.">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-fg-muted">Project</dt>
              <dd className="text-fg-primary">{data.displayName}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Customer</dt>
              <dd className="text-fg-primary">{data.customer}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Folder</dt>
              <dd className="font-mono text-brand-300">project/{slugify(data.displayName)}</dd>
            </div>
          </dl>
        </FormCard>
      )}
    </WizardShell>
  );
}
