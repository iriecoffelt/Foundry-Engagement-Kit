import type { Node } from "@xyflow/react";
import { ExternalLink, Link2 } from "lucide-react";
import type { ArchNodeType } from "../../types";
import {
  foundryLinkPlaceholder,
  openFoundryLink,
  supportsFoundryLink,
} from "../../lib/foundryLinks";
import { api } from "../../lib/api";
import { Field, SecondaryButton, TextInput } from "../forms/FormField";

interface ArchNodeDetailsPanelProps {
  node: Node | null;
  stackUrl: string;
  onUpdateLink: (nodeId: string, foundryLink: string) => void;
  onClose: () => void;
}

export function ArchNodeDetailsPanel({
  node,
  stackUrl,
  onUpdateLink,
  onClose,
}: ArchNodeDetailsPanelProps) {
  if (!node) return null;

  const nodeType = (node.data.nodeType as ArchNodeType) || "dataset";
  const label = String(node.data.label || "Node");
  const foundryLink = String(node.data.foundryLink || "");
  const linkable = supportsFoundryLink(nodeType);

  const openLink = async () => {
    try {
      await openFoundryLink(stackUrl, foundryLink, api.openUrl);
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <aside className="w-72 shrink-0 border-l border-surface-border bg-surface-raised/40 p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Selected node</p>
          <p className="mt-1 truncate font-medium text-fg-primary">{label}</p>
          <p className="text-xs capitalize text-fg-faint">{nodeType.replace(/([A-Z])/g, " $1")}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-fg-muted hover:text-fg-primary"
        >
          Close
        </button>
      </div>

      {linkable ? (
        <div className="space-y-3">
          <Field
            label="Foundry deep link"
            hint="Paste a full URL from your browser, or an RID (ri.foundry…)"
          >
            <TextInput
              value={foundryLink}
              onChange={(v) => onUpdateLink(node.id, v)}
              placeholder={foundryLinkPlaceholder(nodeType)}
            />
          </Field>
          {foundryLink.trim() ? (
            <SecondaryButton onClick={openLink}>
              <span className="inline-flex items-center gap-2">
                <ExternalLink size={14} />
                Open in Foundry
              </span>
            </SecondaryButton>
          ) : (
            <p className="flex items-start gap-2 text-xs text-fg-muted">
              <Link2 size={14} className="mt-0.5 shrink-0" />
              Add a RID or URL, then jump straight to the dataset, object type, or Workshop app.
            </p>
          )}
          {!stackUrl && (
            <p className="text-xs text-amber-500/90">
              Set this project's stack URL above the diagram to resolve RIDs.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          Deep links are available for Dataset, Object Type, Workshop, and Pipeline nodes.
        </p>
      )}
    </aside>
  );
}
