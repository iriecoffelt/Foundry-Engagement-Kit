import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  helpText?: string;
}

export function ErrorBanner({ message, onDismiss, action, helpText }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between border-b border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-300">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AlertCircle size={16} className="shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <span className="block truncate">{message}</span>
          {helpText && (
            <span className="mt-0.5 block text-xs text-red-400/80">{helpText}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className="rounded-md bg-red-900/50 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-900/70 hover:text-red-100"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded-md p-1 text-red-400 transition hover:bg-red-900/30 hover:text-red-200"
          aria-label="Dismiss error"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
