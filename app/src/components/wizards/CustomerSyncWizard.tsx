import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { generateCustomerSyncMd, parseCustomerSyncMd, todayISO } from "../../lib/markdown";
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

const emptyData = (): CustomerSyncData => ({
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

interface CustomerSyncWizardProps {
  editPath?: string;
  initialMarkdown?: string;
  onComplete: (path: string) => void;
  onCancel: () => void;
}

export function CustomerSyncWizard({
  editPath,
  initialMarkdown,
  onComplete,
  onCancel,
}: CustomerSyncWizardProps) {
  const initial = useMemo(() => {
    const parsed = initialMarkdown ? parseCustomerSyncMd(initialMarkdown) : null;
    return parsed ?? emptyData();
  }, [initialMarkdown]);

  const isEdit = Boolean(editPath);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<CustomerSyncData>(initial);

  const displayDate = initial.date || todayISO();

  const finish = async () => {
    if (!data.projectSlug.trim()) {
      setError("Select a project before saving.");
      setStep(0);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload: CustomerSyncData = {
        ...data,
        date: initial.date || todayISO(),
      };
      const markdown = generateCustomerSyncMd(payload);

      if (editPath) {
        await api.writeFile(editPath, markdown);
        onComplete(editPath);
      } else {
        const date = todayISO();
        const dir = `weekly/${data.projectSlug}`;
        const path = `${dir}/${date}-customer-sync.md`;
        await api.createDirectory(dir);
        await api.writeFile(path, markdown);
        onComplete(path);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardShell
      title={isEdit ? "Edit customer sync prep" : "Customer sync prep"}
      subtitle="Prepare for your stakeholder meeting — agenda, demo, and decisions."
      steps={STEPS}
      step={step}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
      onCancel={onCancel}
      canNext={(step > 0 || !!data.projectSlug) && !loading}
      isLast={step === STEPS.length - 1}
      finishLabel={loading ? "Saving…" : isEdit ? "Update prep doc" : "Save prep doc"}
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
        <FormCard
          title="Ready to save"
          description={
            isEdit ? `Updates ${editPath}` : `Saved to weekly/${data.projectSlug}/`
          }
        >
          <p className="text-sm text-slate-300">
            <strong className="text-white">{data.projectDisplay}</strong> — customer sync for{" "}
            {displayDate}
          </p>
        </FormCard>
      )}
    </WizardShell>
  );
}
