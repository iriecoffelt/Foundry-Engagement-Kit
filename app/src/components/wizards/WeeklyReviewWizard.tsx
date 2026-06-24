import { useState } from "react";
import { api } from "../../lib/api";
import { importRisksFromWeekly } from "../../lib/engagementRegister";
import { generateWeeklyMd, todayISO } from "../../lib/markdown";
import type { ProjectMeta, WeeklyReviewData } from "../../types";
import { Field, FormCard, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { WizardShell } from "../wizard/WizardShell";

interface WeeklyReviewWizardProps {
  projects: ProjectMeta[];
  onComplete: (path: string) => void;
  onCancel: () => void;
}

export function WeeklyReviewWizard({ projects, onComplete, onCancel }: WeeklyReviewWizardProps) {
  const [step, setStep] = useState(0);
  const [projectSlug, setProjectSlug] = useState(projects[0]?.slug ?? "");
  const [phase, setPhase] = useState("build");
  const [wins, setWins] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [risks, setRisks] = useState("");
  const [nextWeek, setNextWeek] = useState("");
  const [openQuestions, setOpenQuestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const project = projects.find((p) => p.slug === projectSlug);
  const steps = [
    { label: "Project" },
    { label: "Wins" },
    { label: "Risks" },
    { label: "Next week" },
    { label: "Done" },
  ];

  const finish = async () => {
    if (!project) return;
    setLoading(true);
    setError("");
    try {
      const data: WeeklyReviewData = {
        projectSlug: project.slug,
        projectDisplay: project.display_name,
        phase,
        wins: wins.split("\n").filter(Boolean),
        deliverables: deliverable
          ? [{ name: deliverable, resource: "", customerVisible: true }]
          : [],
        risks: risks
          ? [{ risk: risks, likelihood: "M", impact: "M", mitigation: "" }]
          : [],
        nextWeek: nextWeek.split("\n").filter(Boolean),
        openQuestions,
      };
      const date = todayISO();
      const dir = `weekly/${project.slug}`;
      await api.createDirectory(dir);
      const path = `${dir}/${date}-weekly-review.md`;
      await api.createFile(path, generateWeeklyMd(data));
      await importRisksFromWeekly(project.path, data, path);
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
      subtitle="Reflect on progress and plan the week ahead."
      steps={steps}
      step={step}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => (step === steps.length - 1 ? finish() : setStep((s) => s + 1))}
      onCancel={onCancel}
      canNext={step > 0 || !!projectSlug}
      isLast={step === steps.length - 1}
      finishLabel={loading ? "Saving…" : "Save review"}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 0 && (
        <FormCard title="Which project?">
          {projects.length === 0 ? (
            <p className="text-fg-secondary">Create a project first.</p>
          ) : (
            <>
              <Field label="Engagement">
                <SelectInput
                  value={projectSlug}
                  onChange={setProjectSlug}
                  options={projects.map((p) => ({
                    value: p.slug,
                    label: p.display_name,
                  }))}
                />
              </Field>
              <Field label="Current phase">
                <SelectInput
                  value={phase}
                  onChange={setPhase}
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
            </>
          )}
        </FormCard>
      )}

      {step === 1 && (
        <FormCard title="Wins this week" description="One win per line.">
          <TextArea value={wins} onChange={setWins} rows={5} />
          <Field label="Key deliverable shipped">
            <TextInput value={deliverable} onChange={setDeliverable} />
          </Field>
        </FormCard>
      )}

      {step === 2 && (
        <FormCard title="Risks">
          <TextArea
            value={risks}
            onChange={setRisks}
            placeholder="Data access delayed — mitigating with sample dataset"
            rows={4}
          />
        </FormCard>
      )}

      {step === 3 && (
        <FormCard title="Next week">
          <Field label="Top priorities" hint="One per line">
            <TextArea value={nextWeek} onChange={setNextWeek} rows={4} />
          </Field>
          <Field label="Open questions for customer">
            <TextArea value={openQuestions} onChange={setOpenQuestions} rows={3} />
          </Field>
        </FormCard>
      )}

      {step === 4 && project && (
        <FormCard title="Ready to save">
          <p className="text-fg-body">
            Weekly review for <strong className="text-fg-primary">{project.display_name}</strong>
          </p>
        </FormCard>
      )}
    </WizardShell>
  );
}
