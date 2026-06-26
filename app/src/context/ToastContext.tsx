import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<((message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const value = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div
            className="pointer-events-none fixed bottom-4 right-4 z-[110] flex max-w-sm flex-col gap-2"
            aria-live="polite"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="rounded-xl border border-surface-border bg-surface-raised px-4 py-2.5 text-sm text-fg-body shadow-xl ring-1 ring-[rgb(var(--ring-subtle)/0.06)]"
              >
                {toast.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return show;
}
