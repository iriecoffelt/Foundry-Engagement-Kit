import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isOnboardingComplete,
  loadOnboarding,
  saveOnboarding,
  type OnboardingState,
} from "../../lib/onboarding";
import type { ProjectMeta, Section } from "../../types";
import { Modal } from "../Modal";
import { PrimaryButton } from "../forms/FormField";

interface OnboardingChecklistProps {
  workspaceRoot: string;
  projects: ProjectMeta[];
  onNavigate: (section: Section) => void;
  onStartStandup: () => void;
  onNewProject: () => void;
}

const STEPS = [
  {
    key: "workspaceConfigured" as const,
    label: "Set up workspace folder",
    hint: "Choose a location — the app creates all required folders",
    section: "settings" as Section,
  },
  {
    key: "firstEngagementCreated" as const,
    label: "Create your first engagement",
    hint: "Use the guided project setup wizard",
    section: "projects" as Section,
  },
  {
    key: "firstStandupDone" as const,
    label: "Log your first standup",
    hint: "Daily → today's standup wizard",
    section: "daily" as Section,
  },
];

export function OnboardingChecklist({
  workspaceRoot,
  projects,
  onNavigate,
  onStartStandup,
  onNewProject,
}: OnboardingChecklistProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<OnboardingState>(loadOnboarding());

  useEffect(() => {
    const next = { ...state };
    let changed = false;
    if (workspaceRoot && !next.workspaceConfigured) {
      next.workspaceConfigured = true;
      changed = true;
    }
    if (projects.length > 0 && !next.firstEngagementCreated) {
      next.firstEngagementCreated = true;
      changed = true;
    }
    if (changed) {
      saveOnboarding(next);
      setState(next);
    }
  }, [workspaceRoot, projects.length]);

  useEffect(() => {
    if (!isOnboardingComplete(state)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    const next = { ...state, dismissed: true };
    saveOnboarding(next);
    setState(next);
    setOpen(false);
  };

  const goToStep = (step: (typeof STEPS)[number]) => {
    if (step.key === "firstEngagementCreated") {
      onNewProject();
    } else if (step.key === "firstStandupDone") {
      onStartStandup();
    } else {
      onNavigate(step.section);
    }
    setOpen(false);
  };

  const doneCount = STEPS.filter((s) => state[s.key]).length;

  if (isOnboardingComplete(state)) return null;

  return (
    <Modal
      open={open}
      title="Welcome to Foundry Engagement Kit"
      onClose={dismiss}
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-fg-muted">
            {doneCount} of {STEPS.length} complete
          </span>
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="rounded-lg px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
            >
              Skip for now
            </button>
            {doneCount === STEPS.length && (
              <PrimaryButton onClick={dismiss}>Get started</PrimaryButton>
            )}
          </div>
        </div>
      }
    >
      <p className="mb-6 text-sm text-fg-secondary">
        A quick checklist to get your workspace running. Everything stays on disk as markdown
        and JSON.
      </p>
      <ul className="space-y-3">
        {STEPS.map((step) => {
          const done = state[step.key];
          return (
            <li key={step.key}>
              <button
                onClick={() => !done && goToStep(step)}
                disabled={done}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  done
                    ? "border-green-500/30 bg-green-950/20"
                    : "border-surface-border hover:border-brand-500/40 hover:bg-surface-elevated/50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    done ? "bg-green-600 text-white" : "bg-surface-elevated text-fg-muted"
                  }`}
                >
                  {done ? <Check size={14} /> : <span className="text-xs font-medium">·</span>}
                </span>
                <div>
                  <p className={`font-medium ${done ? "text-green-300" : "text-fg-primary"}`}>
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-sm text-fg-muted">{step.hint}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
