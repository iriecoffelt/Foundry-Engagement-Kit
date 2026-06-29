import { Check, Sparkles } from "lucide-react";
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

const ADVANCED_STEPS = [
  {
    key: "foundryStackConfigured" as const,
    label: "Connect to Foundry stack",
    hint: "Configure your stack URL for deep links to Foundry resources",
    section: "settings" as Section,
  },
  {
    key: "libraryCustomized" as const,
    label: "Customize reference library",
    hint: "Add team-specific guides and templates",
    section: "library" as Section,
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

  const goToStep = (step: (typeof STEPS)[number] | (typeof ADVANCED_STEPS)[number]) => {
    if (step.key === "firstEngagementCreated") {
      onNewProject();
    } else if (step.key === "firstStandupDone") {
      onStartStandup();
    } else {
      onNavigate(step.section);
    }
    setOpen(false);
  };

  const markAdvancedComplete = (key: (typeof ADVANCED_STEPS)[number]["key"]) => {
    const next = { ...state, [key]: true };
    saveOnboarding(next);
    setState(next);
  };

  const doneCount = STEPS.filter((s) => state[s.key]).length;
  const advancedDoneCount = ADVANCED_STEPS.filter((s) => state[s.key]).length;
  const coreComplete = doneCount === STEPS.length;

  if (isOnboardingComplete(state)) return null;

  return (
    <Modal
      open={open}
      title="Welcome to Foundry Engagement Kit"
      onClose={dismiss}
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-fg-muted">
            {coreComplete ? (
              <>Core setup complete{advancedDoneCount > 0 && ` · ${advancedDoneCount} advanced`}</>
            ) : (
              <>{doneCount} of {STEPS.length} complete</>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="rounded-lg px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
            >
              {coreComplete ? "Done" : "Skip for now"}
            </button>
            {coreComplete && (
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

      {coreComplete && (
        <div className="mt-6 border-t border-surface-border pt-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-brand-400" />
            <h4 className="text-sm font-medium text-fg-secondary">Advanced setup (optional)</h4>
          </div>
          <ul className="space-y-2">
            {ADVANCED_STEPS.map((step) => {
              const done = state[step.key];
              return (
                <li key={step.key}>
                  <div
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      done
                        ? "border-brand-500/20 bg-brand-950/10"
                        : "border-surface-border/60 bg-surface-base/50"
                    }`}
                  >
                    <button
                      onClick={() => !done && markAdvancedComplete(step.key)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                        done
                          ? "border-brand-500 bg-brand-600 text-white"
                          : "border-surface-border-strong hover:border-brand-500/50"
                      }`}
                      title={done ? "Completed" : "Mark as complete"}
                    >
                      {done && <Check size={12} />}
                    </button>
                    <button
                      onClick={() => goToStep(step)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className={`text-sm font-medium ${done ? "text-brand-300" : "text-fg-body"}`}>
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-muted">{step.hint}</p>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-fg-faint">
            These steps are optional and can be completed anytime from Settings or Library.
          </p>
        </div>
      )}
    </Modal>
  );
}
