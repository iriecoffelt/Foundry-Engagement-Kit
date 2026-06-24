import { useState } from "react";
import { api } from "../../lib/api";
import { generateCustomerSyncMd, todayISO } from "../../lib/markdown";
import type { CustomerSyncData } from "../../types";
import { Field, FormCard, TextArea, TextInput } from "../forms/FormField";
import { ProjectPicker } from "../forms/ProjectPicker";
import { WizardShell } from "../wizard/WizardShell";

const STEPS = [
  { label: "Project" },
  { label: "Meeting" },
  { label: "Content" },
  { label: "Review" },
];

interface CustomerSyncWizardProps {
  onComplete: (path: string) => void;
  onCancel: () => void;
}

export function CustomerSyncWizard({ onComplete, onCancel }: CustomerSyncWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<CustomerSyncData>({
    projectSlug: "",
    projectDisplay: "",
    meetingName: "Weekly customer sync",
    attendees: "",
    duration: "30 min",
    objective: "",
    statusSummary: "",
    demoActions: "",
    decisionsNeeded: "",
    risks: "",
  });

  const finish = async () => {
    setLoading(true);
    setError("");
    try {
      const date = todayISO();
      const dir = `weekly/${data.projectSlug}`;
      const path = `${dir}/${date}-customer-sync.md`;
      await api.createDirectory(dir);
      await api.writeFile(path, generateCustomerSyncMd(data));
      onComplete(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardShell
      title="Customer sync prep"
      subtitle="Prepare for your stakeholder meeting — agenda, demo, and decisions."
      steps={STEPS}
      step={step}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
      onCancel={onCancel}
      canNext={(step > 0 || !!data.projectSlug) && !loading}
      isLast={step === STEPS.length - 1}
      finishLabel={loading ? "Saving…" : "Save prep doc"}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 0 && (
        <FormCard title="Which engagement?" description="Sync notes are saved under this project.">
          <ProjectPicker
            value={data.projectSlug}
            onChange={(slug, display) =>
              setData({ ...data, projectSlug: slug, projectDisplay: display })
            }
          />
        </FormCard>
      )}

      {step === 1 && (
        <FormCard title="Meeting details">
          <Field label="Meeting name">
            <TextInput
              value={data.meetingName}
              onChange={(v) => setData({ ...data, meetingName: v })}
            />
          </Field>
          <Field label="Attendees">
            <TextInput
              value={data.attendees}
              onChange={(v) => setData({ ...data, attendees: v })}
              placeholder="Jane (sponsor), Bob (IT)"
            />
          </Field>
          <Field label="Duration">
            <TextInput
              value={data.duration}
              onChange={(v) => setData({ ...data, duration: v })}
            />
          </Field>
          <Field label="Meeting objective">
            <TextArea
              value={data.objective}
              onChange={(v) => setData({ ...data, objective: v })}
              placeholder="What should be true when this meeting ends?"
            />
          </Field>
        </FormCard>
      )}

      {step === 2 && (
        <FormCard title="What to cover">
          <Field label="Customer-facing status (plain language)">
            <TextArea
              value={data.statusSummary}
              onChange={(v) => setData({ ...data, statusSummary: v })}
              rows={3}
            />
          </Field>
          <Field label="Demo actions to show">
            <TextArea
              value={data.demoActions}
              onChange={(v) => setData({ ...data, demoActions: v })}
              placeholder="1. Open Orders list&#10;2. Submit Approve action"
              rows={4}
            />
          </Field>
          <Field label="Decisions needed from customer">
            <TextArea
              value={data.decisionsNeeded}
              onChange={(v) => setData({ ...data, decisionsNeeded: v })}
            />
          </Field>
          <Field label="Risks to surface">
            <TextArea value={data.risks} onChange={(v) => setData({ ...data, risks: v })} rows={2} />
          </Field>
        </FormCard>
      )}

      {step === 3 && (
        <FormCard title="Ready to save">
          <p className="text-sm text-slate-300">
            <strong className="text-white">{data.projectDisplay}</strong> — customer sync for{" "}
            {todayISO()}
          </p>
        </FormCard>
      )}
    </WizardShell>
  );
}
