import { Handle, Position, type NodeProps } from "@xyflow/react";

/** Compact node for large ontology browse / focus views. */
export function OntologyLiteNode({ data, selected }: NodeProps) {
  const label = String(data.label || "Object type");
  const dimmed = Boolean(data.dimmed);
  const isCenter = Boolean(data.isCenter);

  return (
    <div
      className={`max-w-[152px] rounded-md border px-2 py-1.5 shadow-sm transition-opacity ${
        isCenter
          ? "border-brand-400 bg-brand-950/40 ring-1 ring-brand-400/60"
          : dimmed
            ? "border-surface-border/40 bg-surface-raised/40 opacity-30"
            : selected
              ? "border-brand-400/70 bg-surface-raised ring-1 ring-brand-400/50"
              : "border-surface-border bg-surface-raised/95"
      }`}
      title={label}
    >
      <Handle type="target" position={Position.Left} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <p
        className={`truncate leading-tight text-fg-primary ${
          isCenter ? "text-[11px] font-semibold" : "text-[10px] font-medium"
        }`}
      >
        {label}
      </p>
      <Handle type="source" position={Position.Right} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </div>
  );
}
