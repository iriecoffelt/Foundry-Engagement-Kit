import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "../components/Modal";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(
  null,
);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ ...options, resolve });
    });
  }, []);

  const finish = useCallback((confirmed: boolean) => {
    setRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={request !== null}
        title={request?.title ?? ""}
        onClose={() => finish(false)}
        footer={
          request && (
            <>
              <button
                type="button"
                onClick={() => finish(false)}
                className="rounded-lg px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
              >
                {request.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  request.destructive
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "bg-brand-600 text-fg-on-accent hover:bg-brand-500"
                }`}
              >
                {request.confirmLabel ?? (request.destructive ? "Delete" : "Confirm")}
              </button>
            </>
          )
        }
      >
        {request && <p className="text-sm text-fg-secondary">{request.message}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return confirm;
}
