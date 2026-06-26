import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { useFocusTrap } from "../lib/useFocusTrap";
import { OverlayPortal } from "./OverlayPortal";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  hideClose?: boolean;
  /** When false, Escape does not close (e.g. required first-run setup). Default true. */
  closeOnEscape?: boolean;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
  hideClose,
  closeOnEscape = true,
}: ModalProps) {
  useEscapeKey(onClose, open && closeOnEscape);
  const dialogRef = useFocusTrap(open);

  return (
    <OverlayPortal open={open}>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={closeOnEscape ? onClose : undefined}
      >
        <div
          ref={dialogRef}
          className={`w-full rounded-xl border border-surface-border bg-surface-raised shadow-2xl ${
            wide ? "max-w-lg" : "max-w-md"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-fg-primary">
            {title}
          </h2>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-fg-secondary transition hover:bg-surface-elevated hover:text-fg-primary"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">
            {footer}
          </div>
        )}
        </div>
      </div>
    </OverlayPortal>
  );
}
