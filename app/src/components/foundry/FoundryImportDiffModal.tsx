import { AlertCircle, Check, ChevronDown, ChevronRight, Edit, Plus, X } from "lucide-react";
import { useState } from "react";
import type { OntologyElement } from "../../types";
import { Modal } from "../Modal";
import { PrimaryButton, SecondaryButton } from "../forms/FormField";

export interface ImportDiffSummary {
  added: OntologyElement[];
  updated: OntologyElement[];
  localOnly: OntologyElement[];
  unchanged: OntologyElement[];
}

/**
 * Compare incoming Foundry elements with existing local elements.
 * Returns categorized lists for display in the diff modal.
 */
export function computeImportDiff(
  existingElements: OntologyElement[],
  fromFoundry: OntologyElement[],
): ImportDiffSummary {
  const existingByKey = new Map<string, OntologyElement>();
  for (const el of existingElements) {
    const key =
      el.kind === "linkType" && el.foundryApiName
        ? `linkType:${el.foundryApiName.toLowerCase()}`
        : `${el.kind}:${el.name.toLowerCase()}`;
    existingByKey.set(key, el);
  }

  const foundryKeys = new Set<string>();
  const added: OntologyElement[] = [];
  const updated: OntologyElement[] = [];
  const unchanged: OntologyElement[] = [];

  for (const el of fromFoundry) {
    const key =
      el.kind === "linkType" && el.foundryApiName
        ? `linkType:${el.foundryApiName.toLowerCase()}`
        : `${el.kind}:${el.name.toLowerCase()}`;
    foundryKeys.add(key);

    const existing = existingByKey.get(key);
    if (!existing) {
      added.push(el);
    } else if (hasElementChanged(existing, el)) {
      updated.push(el);
    } else {
      unchanged.push(el);
    }
  }

  const localOnly = existingElements.filter((el) => {
    const key =
      el.kind === "linkType" && el.foundryApiName
        ? `linkType:${el.foundryApiName.toLowerCase()}`
        : `${el.kind}:${el.name.toLowerCase()}`;
    return !foundryKeys.has(key);
  });

  return { added, updated, localOnly, unchanged };
}

function hasElementChanged(existing: OntologyElement, incoming: OntologyElement): boolean {
  if (existing.description !== incoming.description) return true;
  if (existing.primaryKey !== incoming.primaryKey) return true;
  if (existing.linkFrom !== incoming.linkFrom) return true;
  if (existing.linkTo !== incoming.linkTo) return true;
  if (existing.targetObject !== incoming.targetObject) return true;
  if (existing.foundryRid !== incoming.foundryRid) return true;
  if (existing.foundryApiName !== incoming.foundryApiName) return true;

  const existingProps = existing.properties.sort().join(",");
  const incomingProps = incoming.properties.sort().join(",");
  if (existingProps !== incomingProps) return true;

  return false;
}

function formatKind(kind: string): string {
  switch (kind) {
    case "objectType":
      return "object type";
    case "linkType":
      return "link type";
    case "actionType":
      return "action type";
    case "interface":
      return "interface";
    case "function":
      return "function";
    default:
      return kind;
  }
}

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural ?? singular + "s"}`;
}

interface DiffSectionProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  elements: OntologyElement[];
  defaultExpanded?: boolean;
}

function DiffSection({ title, icon, iconColor, elements, defaultExpanded = false }: DiffSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (elements.length === 0) return null;

  const groupedByKind = elements.reduce(
    (acc, el) => {
      if (!acc[el.kind]) acc[el.kind] = [];
      acc[el.kind].push(el);
      return acc;
    },
    {} as Record<string, OntologyElement[]>,
  );

  return (
    <div className="rounded-lg border border-surface-border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-raised/50"
      >
        <span className={iconColor}>{icon}</span>
        <span className="flex-1 text-sm font-medium text-fg-primary">{title}</span>
        <span className="text-xs text-fg-muted">{elements.length}</span>
        {expanded ? (
          <ChevronDown size={14} className="text-fg-muted" />
        ) : (
          <ChevronRight size={14} className="text-fg-muted" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-surface-border px-3 py-2">
          {Object.entries(groupedByKind).map(([kind, items]) => (
            <div key={kind} className="mb-2 last:mb-0">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">
                {formatKind(kind)} ({items.length})
              </p>
              <ul className="space-y-0.5">
                {items.slice(0, 10).map((el) => (
                  <li key={el.id} className="flex items-center gap-2 text-sm text-fg-secondary">
                    <span className="truncate">{el.name}</span>
                    {el.foundryApiName && el.foundryApiName !== el.name && (
                      <span className="shrink-0 text-xs text-fg-muted">({el.foundryApiName})</span>
                    )}
                  </li>
                ))}
                {items.length > 10 && (
                  <li className="text-xs text-fg-muted">and {items.length - 10} more…</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FoundryImportDiffModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  diff: ImportDiffSummary;
}

export function FoundryImportDiffModal({
  open,
  onClose,
  onConfirm,
  diff,
}: FoundryImportDiffModalProps) {
  const totalChanges = diff.added.length + diff.updated.length;
  const hasChanges = totalChanges > 0;

  return (
    <Modal open={open} onClose={onClose} title="Import from Foundry" wide>
      <div className="space-y-4">
        <p className="text-sm text-fg-secondary">
          {hasChanges
            ? "The following changes will be applied to your local ontology:"
            : "Your local ontology is already in sync with Foundry."}
        </p>

        <div className="rounded-lg bg-surface-subtle/30 p-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-fg-secondary">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-green-400" />
              <span>{pluralize(diff.added.length, "new element")} will be added</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit size={14} className="text-amber-400" />
              <span>{pluralize(diff.updated.length, "element")} will be updated</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-fg-muted" />
              <span>{pluralize(diff.localOnly.length, "local element")} will be kept</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-fg-muted" />
              <span>{pluralize(diff.unchanged.length, "element")} unchanged</span>
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            <DiffSection
              title="New elements"
              icon={<Plus size={14} />}
              iconColor="text-green-400"
              elements={diff.added}
              defaultExpanded={diff.added.length <= 20}
            />
            <DiffSection
              title="Updated elements"
              icon={<Edit size={14} />}
              iconColor="text-amber-400"
              elements={diff.updated}
              defaultExpanded={diff.updated.length <= 10}
            />
            {diff.localOnly.length > 0 && (
              <DiffSection
                title="Local-only elements (will be kept)"
                icon={<AlertCircle size={14} />}
                iconColor="text-fg-muted"
                elements={diff.localOnly}
              />
            )}
          </div>
        )}

        {diff.localOnly.length > 0 && hasChanges && (
          <p className="text-xs text-fg-muted">
            Elements that exist locally but not in Foundry will be preserved. Remove them manually
            if no longer needed.
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={onConfirm}>
            {hasChanges ? "Import changes" : "Close"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
