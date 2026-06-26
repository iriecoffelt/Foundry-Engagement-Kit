import type { Edge, Node } from "@xyflow/react";
import { X } from "lucide-react";
import type { DeliveryCard } from "../../types";
import {
  DELIVERY_STATUS_BADGE,
  DELIVERY_STATUS_LABELS,
} from "../../lib/deliveryBoard";
import { Field, SecondaryButton, TextArea, TextInput } from "../forms/FormField";
import { slideOverPanelClass } from "../SlideOverBackdrop";

interface ArchNodeDetailsPanelProps {
  node: Node | null;
  stackUrl: string;
  linkable: boolean;
  linkPlaceholder: string;
  deliveryCard: DeliveryCard | null;
  onUpdateLink: (nodeId: string, foundryLink: string) => void;
  onUpdateNotes: (nodeId: string, notes: string) => void;
  onOpenDelivery?: (cardId: string) => void;
  onOpenFoundry: () => void;
  onClose: () => void;
}

export function ArchNodeDetailsPanel({
  node,
  stackUrl,
  linkable,
  linkPlaceholder,
  deliveryCard,
  onUpdateLink,
  onUpdateNotes,
  onOpenDelivery,
  onOpenFoundry,
  onClose,
}: ArchNodeDetailsPanelProps) {
  if (!node) return null;

  const label = String(node.data.label || "Node");
  const nodeType = String(node.data.nodeType || "node");
  const foundryLink = String(node.data.foundryLink || "");
  const notes = String(node.data.notes || "");

  return (
    <aside
      className={`flex w-72 shrink-0 flex-col border-l border-surface-border bg-surface-raised/40 ${slideOverPanelClass}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-surface-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Selected node</p>
          <p className="mt-1 truncate font-medium text-fg-primary">{label}</p>
          <p className="text-xs capitalize text-fg-faint">{nodeType.replace(/([A-Z])/g, " $1")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-fg-muted hover:text-fg-primary"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {deliveryCard && (
          <div className="rounded-lg border border-surface-border-strong bg-surface-base/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Delivery board</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${DELIVERY_STATUS_BADGE[deliveryCard.status]}`}
              >
                {DELIVERY_STATUS_LABELS[deliveryCard.status]}
              </span>
              {deliveryCard.owner && (
                <span className="text-[10px] text-fg-secondary">{deliveryCard.owner}</span>
              )}
            </div>
            {onOpenDelivery && (
              <div className="mt-3">
                <SecondaryButton onClick={() => onOpenDelivery(deliveryCard.id)}>
                  Open on delivery board
                </SecondaryButton>
              </div>
            )}
          </div>
        )}

        <Field label="Notes">
          <TextArea
            value={notes}
            onChange={(v) => onUpdateNotes(node.id, v)}
            rows={4}
            placeholder="Design notes, dependencies, scope…"
          />
        </Field>

        {linkable ? (
          <div className="space-y-3">
            <Field
              label="Foundry deep link"
              hint="Paste a full URL from your browser, or an RID (ri.foundry…)"
            >
              <TextInput
                value={foundryLink}
                onChange={(v) => onUpdateLink(node.id, v)}
                placeholder={linkPlaceholder}
              />
            </Field>
            {foundryLink.trim() ? (
              <SecondaryButton onClick={onOpenFoundry}>Open in Foundry</SecondaryButton>
            ) : null}
            {!stackUrl && (
              <p className="text-xs text-amber-500/90">
                Set this project's stack URL above the diagram to resolve RIDs.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            This node type does not support Foundry deep links. Enable in Library → Architecture
            node types.
          </p>
        )}
      </div>
    </aside>
  );
}

interface EdgeDetailsPanelProps {
  edge: Edge | null;
  onUpdateLabel: (edgeId: string, label: string) => void;
  onClose: () => void;
}

export function EdgeDetailsPanel({ edge, onUpdateLabel, onClose }: EdgeDetailsPanelProps) {
  if (!edge) return null;

  const label = typeof edge.label === "string" ? edge.label : "";

  return (
    <aside
      className={`flex w-72 shrink-0 flex-col border-l border-surface-border bg-surface-raised/40 ${slideOverPanelClass}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-surface-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Selected edge</p>
          <p className="mt-1 truncate text-sm text-fg-primary">
            {edge.source} → {edge.target}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-fg-muted hover:text-fg-primary"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-4">
        <Field label="Edge label" hint="Optional — shown on the connection">
          <TextInput
            value={label}
            onChange={(v) => onUpdateLabel(edge.id, v)}
            placeholder="e.g. syncs to, reads from"
          />
        </Field>
      </div>
    </aside>
  );
}
