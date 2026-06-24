import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { generateStandupMd, parseStandupMd, todayISO } from "../../lib/markdown";
import type { ProjectMeta, StandupData } from "../../types";
import { Field, FormCard, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { WizardShell } from "../wizard/WizardShell";

interface StandupWizardProps {
  projects: ProjectMeta[];
  editPath?: string;
  initialMarkdown?: string;
  onComplete: (path: string) => void;
  onCancel: () => void;
}

function initFromMarkdown(
  initialMarkdown: string | undefined,
  projects: ProjectMeta[],
) {
  const parsed = initialMarkdown ? parseStandupMd(initialMarkdown) : null;
  return {
    projectSlug: parsed?.projectSlug ?? projects[0]?.slug ?? "",
    milestone: parsed?.milestone ?? "",
    yesterday: parsed?.yesterday.join("\n") ?? "",
    todayTask: parsed?.today[0]?.task ?? "",
    todaySurface: parsed?.today[0]?.surface ?? "Workshop",
    blocker: parsed?.blockers[0]?.blocker ?? "",
    meetings: parsed?.meetings ?? "",
    notes: parsed?.notes ?? "",
    standupDate: parsed?.date,
  };
}

export function StandupWizard({
  projects,
  editPath,
  initialMarkdown,
  onComplete,
  onCancel,
}: StandupWizardProps) {
  const initial = useMemo(
    () => initFromMarkdown(initialMarkdown, projects),
    [initialMarkdown, projects],
  );
  const isEdit = Boolean(editPath);

  const [step, setStep] = useState(0);
  const [projectSlug, setProjectSlug] = useState(initial.projectSlug);
  const [milestone, setMilestone] = useState(initial.milestone);
  const [yesterday, setYesterday] = useState(initial.yesterday);
  const [todayTask, setTodayTask] = useState(initial.todayTask);
  const [todaySurface, setTodaySurface] = useState(initial.todaySurface);
  const [blocker, setBlocker] = useState(initial.blocker);
  const [meetings, setMeetings] = useState(initial.meetings);
  const [notes, setNotes] = useState(initial.notes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const project = projects.find((p) => p.slug === projectSlug);
  const steps = [
    { label: "Project" },
    { label: "Yesterday" },
    { label: "Today" },
    { label: "Blockers" },
    { label: "Done" },
  ];

  const finish = async () => {
    if (!project) return;
    setLoading(true);
    setError("");
    try {
      const data: StandupData = {
        projectSlug: project.slug,
        projectDisplay: project.display_name,
        date: initial.standupDate || todayISO(),
        milestone,
        yesterday: yesterday.split("\n").filter(Boolean),
        today: todayTask
          ? [{ task: todayTask, surface: todaySurface, priority: "P0" }]
          : [],
        blockers: blocker ? [{ blocker, owner: "", escalate: false }] : [],
        meetings,
        notes,
      };
      const markdown = generateStandupMd(data);

      if (editPath) {
        await api.writeFile(editPath, markdown);
        onComplete(editPath);
      } else {
        const date = todayISO();
        const dir = `daily/${project.slug}`;
        await api.createDirectory(dir);
        const path = `${dir}/${date}-standup.md`;
        await api.writeFile(path, markdown);
        onComplete(path);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const displayDate = initial.standupDate || todayISO();

  return (
    <WizardShell
      title={isEdit ? "Edit standup" : "Daily standup"}
      subtitle={
        isEdit
          ? "Update your standup — changes save to the same file."
          : "Quick check-in tied to your engagement."
      }
      steps={steps}
      step={step}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => (step === steps.length - 1 ? finish() : setStep((s) => s + 1))}
      onCancel={onCancel}
      canNext={step > 0 || !!projectSlug}
      isLast={step === steps.length - 1}
      finishLabel={loading ? "Saving…" : isEdit ? "Update standup" : "Save standup"}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 0 && (
        <FormCard
          title="Which project?"
          description={
            isEdit
              ? "Project is fixed for this entry."
              : "Standups are saved under that project."
          }
        >
          {projects.length === 0 ? (
            <p className="text-slate-400">Create a project first from the Projects tab.</p>
          ) : (
            <Field label="Engagement">
              <SelectInput
                value={projectSlug}
                onChange={setProjectSlug}
                options={projects.map((p) => ({
                  value: p.slug,
                  label: `${p.display_name}${p.customer ? ` — ${p.customer}` : ""}`,
                }))}
              />
            </Field>
          )}
          <Field label="Current milestone (optional)">
            <TextInput value={milestone} onChange={setMilestone} placeholder="M2 — Alpha" />
          </Field>
        </FormCard>
      )}

      {step === 1 && (
        <FormCard title="Yesterday" description="What did you get done? One item per line.">
          <TextArea
            value={yesterday}
            onChange={setYesterday}
            placeholder="Shipped ontology backing for Orders&#10;Reviewed pipeline schedule with customer"
            rows={6}
          />
        </FormCard>
      )}

      {step === 2 && (
        <FormCard title="Today's focus">
          <Field label="Top priority">
            <TextInput value={todayTask} onChange={setTodayTask} />
          </Field>
          <Field label="Foundry area">
            <SelectInput
              value={todaySurface}
              onChange={setTodaySurface}
              options={[
                { value: "Ontology", label: "Ontology" },
                { value: "Pipeline", label: "Pipeline" },
                { value: "Workshop", label: "Workshop" },
                { value: "Customer sync", label: "Customer sync" },
                { value: "Other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Meetings today">
            <TextArea value={meetings} onChange={setMeetings} rows={2} />
          </Field>
        </FormCard>
      )}

      {step === 3 && (
        <FormCard title="Blockers & notes">
          <Field label="Anything blocking you?">
            <TextArea value={blocker} onChange={setBlocker} rows={3} />
          </Field>
          <Field label="Notes for tomorrow">
            <TextArea value={notes} onChange={setNotes} rows={2} />
          </Field>
        </FormCard>
      )}

      {step === 4 && project && (
        <FormCard
          title="Ready to save"
          description={isEdit ? `Updates ${editPath}` : `Saved to daily/${project.slug}/`}
        >
          <p className="text-slate-300">
            <strong className="text-white">{project.display_name}</strong> — standup for{" "}
            {displayDate}
          </p>
        </FormCard>
      )}
    </WizardShell>
  );
}
