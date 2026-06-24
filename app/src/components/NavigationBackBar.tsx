import { ArrowLeft } from "lucide-react";
import { backLabelForFrame, type NavFrame } from "../lib/appNavigation";

interface NavigationBackBarProps {
  canGoBack: boolean;
  previousFrame: NavFrame | null;
  projectNames: Record<string, string>;
  onBack: () => void;
}

export function NavigationBackBar({
  canGoBack,
  previousFrame,
  projectNames,
  onBack,
}: NavigationBackBarProps) {
  if (!canGoBack || !previousFrame) return null;

  const projectName = previousFrame.projectSlug
    ? projectNames[previousFrame.projectSlug]
    : undefined;

  return (
    <div className="border-b border-surface-border/80 bg-surface-raised/40 px-4 py-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-fg-secondary transition hover:bg-surface-elevated hover:text-fg-primary"
        title="Back (⌘[)"
      >
        <ArrowLeft size={15} />
        Back to {backLabelForFrame(previousFrame, projectName)}
      </button>
    </div>
  );
}
