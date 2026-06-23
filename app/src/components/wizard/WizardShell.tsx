import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { PrimaryButton, SecondaryButton } from "../forms/FormField";

export interface WizardStep {
  id: string;
  label: string;
}

interface WizardShellProps {
  title: string;
  subtitle?: string;
  steps: WizardStep[];
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  canProceed?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function WizardShell({
  title,
  subtitle,
  steps,
  currentStep,
  onBack,
  onNext,
  onFinish,
  canProceed = true,
  loading = false,
  children,
}: WizardShellProps) {
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 bg-slate-900/40 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-slate-400">{subtitle}</p>}

        <div className="mt-6 flex items-center gap-2 overflow-x-auto">
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-brand-600 text-white"
                      : active
                        ? "bg-brand-600/20 text-brand-300 ring-2 ring-brand-500"
                        : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`hidden text-sm sm:inline ${
                    active ? "font-medium text-white" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <div className="mx-1 h-px w-6 bg-slate-700 sm:w-10" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/40 px-8 py-4">
        <SecondaryButton onClick={onBack} disabled={currentStep === 0 || loading}>
          Back
        </SecondaryButton>
        {isLast ? (
          <PrimaryButton onClick={onFinish} disabled={!canProceed || loading}>
            {loading ? "Saving…" : "Finish"}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onNext} disabled={!canProceed || loading}>
            Continue
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
