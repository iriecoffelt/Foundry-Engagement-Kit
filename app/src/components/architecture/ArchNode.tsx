import { ExternalLink, Link2 } from "lucide-react";
import { useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { api } from "../../lib/api";
import { openFoundryLink } from "../../lib/foundryLinks";
import { DELIVERY_STATUS_BADGE, DELIVERY_STATUS_LABELS } from "../../lib/deliveryBoard";
import { useArchEditorContext } from "./ArchitectureEditorContext";

export function ArchNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const { stackUrl, typeById, deliveryByNodeId, onOpenDelivery } = useArchEditorContext();
  const nodeType = String(data.nodeType || "dataset");
  const meta = typeById.get(nodeType) ?? typeById.values().next().value;
  const Icon = meta?.Icon;
  const hexColor = meta?.hexColor ?? "#94a3b8";
  const labelFallback = meta?.label ?? nodeType;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(data.label || labelFallback));
  const foundryLink = String(data.foundryLink || "");
  const hasLink = foundryLink.trim().length > 0;
  const linkable = meta?.linkable ?? false;
  const deliveryCard = deliveryByNodeId.get(id);

  const commitLabel = () => {
    const label = draft.trim() || labelFallback;
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
    );
    setDraft(label);
    setEditing(false);
  };

  const startEditing = () => {
    setDraft(String(data.label || labelFallback));
    setEditing(true);
  };

  const jumpToFoundry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await openFoundryLink(stackUrl, foundryLink, api.openUrl);
    } catch (err) {
      alert(String(err));
    }
  };

  const openDelivery = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deliveryCard && onOpenDelivery) onOpenDelivery(deliveryCard.id);
  };

  return (
    <div
      className={`relative min-w-[140px] rounded-xl border-2 bg-surface-raised px-3 py-2 shadow-lg ${
        selected ? "ring-2 ring-brand-400/60" : ""
      }`}
      style={{ borderColor: hexColor }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-subtle" />
      {linkable && hasLink && (
        <button
          type="button"
          onClick={jumpToFoundry}
          title="Open in Foundry"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-brand-600 text-fg-on-accent shadow hover:bg-brand-500"
        >
          <ExternalLink size={12} />
        </button>
      )}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel();
            if (e.key === "Escape") {
              setDraft(String(data.label || labelFallback));
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded border border-surface-border-strong bg-surface-base px-2 py-1 text-sm text-fg-primary outline-none focus:border-brand-500"
        />
      ) : (
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} style={{ color: hexColor }} />}
            <span className="text-sm font-medium text-fg-primary">{data.label as string}</span>
          </div>
          {linkable && hasLink && (
            <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-brand-400">
              <Link2 size={10} className="shrink-0" />
              <span className="truncate">
                {foundryLink.length > 36 ? `${foundryLink.slice(0, 36)}…` : foundryLink}
              </span>
            </p>
          )}
          {deliveryCard && (
            <button
              type="button"
              onClick={openDelivery}
              className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${DELIVERY_STATUS_BADGE[deliveryCard.status]}`}
              title="Open on delivery board"
            >
              {DELIVERY_STATUS_LABELS[deliveryCard.status]}
            </button>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-surface-subtle" />
    </div>
  );
}
