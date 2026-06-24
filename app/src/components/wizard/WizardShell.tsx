import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WizardShellProps {
  title: string;
  subtitle?: string;
  steps: { label: string }[];
  step: number;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  canNext?: boolean;
  isLast?: boolean;
  finishLabel?: string;
  children: ReactNode;
}

export function WizardShell({
  title,
  subtitle,
  steps,
  step,
  onBack,
  onNext,
  onCancel,
  canNext = true,
  isLast = false,
  finishLabel = "Finish",
  children,
}: WizardShellProps) {
  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/60 px-8 py-6">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-slate-400">{subtitle}</p>}
        <div className="mt-6 flex gap-2">
          {steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 flex-col gap-1">
              <div
                className={`h-1.5 rounded-full ${i <= step ? "bg-brand-500" : "bg-slate-800"}`}
              />
              <span
                className={`text-xs ${i === step ? "text-brand-300" : "text-slate-500"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/60 px-8 py-4">
        <button
          onClick={onCancel}
          className="text-sm text-slate-400 hover:text-white"
        >
          Cancel
        </button>
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!canNext}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40"
          >
            {isLast ? finishLabel : "Continue"}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
