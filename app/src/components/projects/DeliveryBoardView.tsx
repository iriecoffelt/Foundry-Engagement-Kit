import { ArrowRight, ExternalLink, FileText, GripVertical, Layers, Plus, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import {
  boardByStatus,
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABELS,
  loadDeliveryBoard,
  newDeliveryId,
  saveDeliveryBoard,
  seedFromArchitecture,
  syncArchitectureAndDelivery,
  removeArchitectureForDeliveryCard,
  pruneOrphanDeliveryArchitectureNodes,
} from "../../lib/deliveryBoard";
import {
  deliveryTypeLabel,
  deliveryTypeStyles,
  loadDeliveryTypes,
  type DeliveryTypeDefinition,
} from "../../lib/deliveryTypes";
import { loadRegister, openBlockers } from "../../lib/engagementRegister";
import { hasFoundryConnection } from "../../lib/foundryConnection";
import { extractDatasetRid } from "../../lib/foundryLinks";
import { useDebouncedPersist } from "../../hooks/useDebouncedPersist";
import type {
  BlockerEntry,
  DeliveryBoard,
  DeliveryCard,
  DeliveryStatus,
} from "../../types";
import { DeliveryTypeSelect } from "../DeliveryTypeSelect";
import {
  Field,
  SecondaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "../forms/FormField";
import { DeliveryBoardSkeleton } from "../Skeleton";
import { UserPicker } from "./UserPicker";
import { useEscapeKey } from "../../lib/useEscapeKey";
import { FoundryHealthBadge, FoundryHealthSummary } from "../foundry";

interface DeliveryBoardViewProps {
  projectPath: string;
  initialSelectedCardId?: string | null;
  onNavigateToArchitecture?: (nodeId: string) => void;
  onOpenDocument?: (path: string) => void;
}

const DRAG_THRESHOLD_PX = 8;

function columnFromPoint(x: number, y: number): DeliveryStatus | null {
  const el = document.elementFromPoint(x, y)?.closest("[data-delivery-status]");
  const status = el?.getAttribute("data-delivery-status");
  return status && DELIVERY_STATUSES.includes(status as DeliveryStatus)
    ? (status as DeliveryStatus)
    : null;
}

type PointerSession = {
  cardId: string;
  startX: number;
  startY: number;
  moved: boolean;
};

function getStorageKey(projectPath: string) {
  return `delivery-selected-${projectPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

export function DeliveryBoardView({
  projectPath,
  initialSelectedCardId,
  onNavigateToArchitecture,
  onOpenDocument,
}: DeliveryBoardViewProps) {
  const [board, setBoard] = useState<DeliveryBoard>({ cards: [] });
  const [deliveryTypes, setDeliveryTypes] = useState<DeliveryTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("pipeline");
  const [selectedId, setSelectedIdInternal] = useState<string | null>(() => {
    if (initialSelectedCardId) return initialSelectedCardId;
    try {
      return localStorage.getItem(getStorageKey(projectPath));
    } catch {
      return null;
    }
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DeliveryStatus | null>(null);
  const [blockers, setBlockers] = useState<BlockerEntry[]>([]);
  const [foundryConnected, setFoundryConnected] = useState(false);
  const boardRef = useRef(board);
  boardRef.current = board;
  const dropTargetRef = useRef<DeliveryStatus | null>(null);
  const sessionRef = useRef<PointerSession | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdInternal(id);
    try {
      if (id) {
        localStorage.setItem(getStorageKey(projectPath), id);
      } else {
        localStorage.removeItem(getStorageKey(projectPath));
      }
    } catch {
      // localStorage unavailable
    }
  }, [projectPath]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [, types] = await Promise.all([
        loadDeliveryBoard(projectPath),
        loadDeliveryTypes(),
      ]);
      setDeliveryTypes(types);
      await pruneOrphanDeliveryArchitectureNodes(projectPath);
      const boardAfterPrune = await loadDeliveryBoard(projectPath);
      setBoard(boardAfterPrune.cards.length ? boardAfterPrune : await seedFromArchitecture(projectPath));
      const register = await loadRegister(projectPath);
      setBlockers(openBlockers(register));
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    hasFoundryConnection(projectPath).then(setFoundryConnected);
  }, [projectPath, board.cards]);

  const datasetRids = useMemo(
    () =>
      [
        ...new Set(
          board.cards
            .map((card) => extractDatasetRid(card.resourceId))
            .filter((rid): rid is string => Boolean(rid)),
        ),
      ],
    [board.cards],
  );

  useEffect(() => {
    if (initialSelectedCardId && board.cards.some((c) => c.id === initialSelectedCardId)) {
      setSelectedId(initialSelectedCardId);
    } else if (selectedId && board.cards.length > 0 && !board.cards.some((c) => c.id === selectedId)) {
      setSelectedId(null);
    }
  }, [initialSelectedCardId, board.cards, selectedId, setSelectedId]);

  const { schedule: scheduleSave, flushNow: flushSave } = useDebouncedPersist<DeliveryBoard>({
    save: (next) => saveDeliveryBoard(projectPath, next),
    onSavingChange: setSaving,
  });

  const persistNow = useCallback(
    async (next: DeliveryBoard) => {
      setBoard(next);
      boardRef.current = next;
      await flushSave(next);
    },
    [flushSave],
  );

  const schedulePersist = useCallback(
    (next: DeliveryBoard) => {
      setBoard(next);
      boardRef.current = next;
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<DeliveryCard>) => {
      const next = {
        cards: boardRef.current.cards.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
        ),
      };
      schedulePersist(next);
    },
    [schedulePersist],
  );

  const moveCard = useCallback(
    (id: string, status: DeliveryStatus) => {
      const card = boardRef.current.cards.find((c) => c.id === id);
      if (!card || card.status === status) return;
      const next = {
        cards: boardRef.current.cards.map((c) =>
          c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c,
        ),
      };
      void persistNow(next);
    },
    [persistNow],
  );

  const endPointerSession = useCallback(
    (e: PointerEvent, session: PointerSession) => {
      if (session.moved) {
        suppressClickRef.current = true;
        const status = columnFromPoint(e.clientX, e.clientY);
        if (status && draggingIdRef.current) moveCard(draggingIdRef.current, status);
        setDraggingId(null);
        draggingIdRef.current = null;
        dropTargetRef.current = null;
        setDropTarget(null);
      } else {
        setSelectedId(session.cardId);
      }
      sessionRef.current = null;
    },
    [moveCard],
  );

  const startDragSession = (cardId: string, e: React.PointerEvent, captureEl: HTMLElement) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    captureEl.setPointerCapture(e.pointerId);
    const pointerId = e.pointerId;

    const session: PointerSession = {
      cardId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    sessionRef.current = session;

    const onPointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const active = sessionRef.current;
      if (!active || active.cardId !== cardId) return;

      const distance = Math.hypot(ev.clientX - active.startX, ev.clientY - active.startY);
      if (!active.moved && distance > DRAG_THRESHOLD_PX) {
        active.moved = true;
        draggingIdRef.current = cardId;
        setDraggingId(cardId);
      }

      if (active.moved) {
        const status = columnFromPoint(ev.clientX, ev.clientY);
        if (status !== dropTargetRef.current) {
          dropTargetRef.current = status;
          setDropTarget(status);
        }
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      captureEl.removeEventListener("pointermove", onPointerMove);
      captureEl.removeEventListener("pointerup", onPointerUp);
      captureEl.removeEventListener("pointercancel", onPointerUp);
      if (captureEl.hasPointerCapture(pointerId)) {
        captureEl.releasePointerCapture(pointerId);
      }
      const active = sessionRef.current;
      if (active?.cardId === cardId) endPointerSession(ev, active);
    };

    captureEl.addEventListener("pointermove", onPointerMove);
    captureEl.addEventListener("pointerup", onPointerUp);
    captureEl.addEventListener("pointercancel", onPointerUp);
  };

  const onCardDragPointerDown = (cardId: string, e: React.PointerEvent) => {
    startDragSession(cardId, e, e.currentTarget as HTMLElement);
  };

  const onCardBodyPointerDown = (cardId: string, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    startDragSession(cardId, e, e.currentTarget as HTMLElement);
  };

  const onCardClick = (cardId: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setSelectedId(cardId);
  };

  const addCard = () => {
    const title = newTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const card: DeliveryCard = {
      id: newDeliveryId(),
      title,
      type: newType,
      status: "backlog",
      owner: "",
      designRef: "",
      resourceId: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    void persistNow({ cards: [...boardRef.current.cards, card] });
    setNewTitle("");
    setSelectedId(card.id);
  };

  const removeCard = async (id: string) => {
    const card = board.cards.find((c) => c.id === id);
    if (card) {
      await removeArchitectureForDeliveryCard(projectPath, card);
    }
    void persistNow({ cards: boardRef.current.cards.filter((c) => c.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const selectedCard = board.cards.find((c) => c.id === selectedId) ?? null;
  const grouped = boardByStatus(board);

  useEscapeKey(() => setSelectedId(null), Boolean(selectedId));

  if (loading) {
    return <DeliveryBoardSkeleton />;
  }

  return (
    <div className={`flex h-full min-h-0 ${draggingId ? "select-none" : ""}`}>
      <div className="min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-fg-primary">Delivery board</h3>
              <p className="mt-1 text-sm text-fg-secondary">
                Click a card to edit details. Drag a card (or its grip) between columns to change status.
              </p>
              {datasetRids.length > 0 ? (
                <div className="mt-2">
                  <FoundryHealthSummary projectPath={projectPath} datasetRids={datasetRids} />
                </div>
              ) : foundryConnected ? (
                <p className="mt-2 text-xs text-fg-muted">
                  Foundry health checks appear when a card has a dataset RID in{" "}
                  <span className="text-fg-secondary">Resource / RID</span> (e.g.{" "}
                  <code className="text-brand-300">ri.foundry.main.dataset.…</code>) or when a linked
                  architecture node points at a dataset.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={async () => {
                const result = await syncArchitectureAndDelivery(projectPath);
                setBoard(result.board);
                const parts: string[] = [];
                if (result.archPruned) parts.push(`${result.archPruned} removed from diagram`);
                if (result.archAdded) parts.push(`${result.archAdded} added to diagram`);
                if (result.deliveryAdded) parts.push(`${result.deliveryAdded} added to board`);
                if (result.deliveryUpdated) parts.push(`${result.deliveryUpdated} board cards updated`);
                setSyncMessage(
                  parts.length ? parts.join(", ") : "Already in sync with architecture",
                );
                setTimeout(() => setSyncMessage(""), 4000);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border-strong px-3 py-2 text-sm text-fg-body hover:text-fg-primary"
            >
              <Layers size={14} /> Sync with architecture
            </button>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-5">
            {DELIVERY_STATUSES.map((status) => (
              <div
                key={status}
                data-delivery-status={status}
                className={`flex min-h-[12rem] flex-col rounded-2xl border border-surface-border bg-surface-base/40 p-3 ${
                  dropTarget === status
                    ? "bg-brand-950/25 ring-2 ring-brand-500/50"
                    : "ring-1 ring-[rgb(var(--ring-subtle)/0.03)]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-fg-secondary">
                    {DELIVERY_STATUS_LABELS[status]}
                  </h4>
                  <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium tabular-nums text-fg-muted ring-1 ring-surface-border-strong">
                    {grouped[status].length}
                  </span>
                </div>
                <div className="flex min-h-[8rem] flex-1 flex-col gap-2.5">
                  {grouped[status].map((card) => (
                    <DeliveryCardItem
                      key={card.id}
                      card={card}
                      deliveryTypes={deliveryTypes}
                      projectPath={projectPath}
                      selected={selectedId === card.id}
                      dragging={draggingId === card.id}
                      onClick={() => onCardClick(card.id)}
                      onBodyPointerDown={(e) => onCardBodyPointerDown(card.id, e)}
                      onDragHandlePointerDown={(e) => onCardDragPointerDown(card.id, e)}
                      onRemove={() => removeCard(card.id)}
                    />
                  ))}
                  {grouped[status].length === 0 && (
                    <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-surface-border-strong/80 py-6 text-center text-[11px] text-fg-faint">
                      Drop here
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 card-kit p-4">
            <h4 className="text-sm font-medium text-fg-primary">Add component</h4>
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="min-w-[12rem] flex-1">
                <TextInput value={newTitle} onChange={setNewTitle} placeholder="Component name" />
              </div>
              <div className="w-40">
                <DeliveryTypeSelect value={newType} onChange={setNewType} />
              </div>
              <button
                type="button"
                onClick={addCard}
                disabled={!newTitle.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-fg-on-accent hover:bg-brand-500 disabled:opacity-40"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {syncMessage && <p className="mt-2 text-xs text-brand-300">{syncMessage}</p>}
          {saving && <p className="mt-2 text-xs text-fg-muted">Saving…</p>}
        </div>
      </div>

      {selectedCard && (
        <DeliveryCardDetail
          projectPath={projectPath}
          card={selectedCard}
          blockers={blockers}
          onClose={() => setSelectedId(null)}
          onUpdate={(patch) => updateCard(selectedCard.id, patch)}
          onDelete={() => removeCard(selectedCard.id)}
          onNavigateToArchitecture={onNavigateToArchitecture}
          onOpenDocument={onOpenDocument}
        />
      )}
    </div>
  );
}

const DeliveryCardItem = memo(function DeliveryCardItem({
  card,
  deliveryTypes,
  projectPath,
  selected,
  dragging,
  onClick,
  onBodyPointerDown,
  onDragHandlePointerDown,
  onRemove,
}: {
  card: DeliveryCard;
  deliveryTypes: DeliveryTypeDefinition[];
  projectPath: string;
  selected: boolean;
  dragging: boolean;
  onClick: () => void;
  onBodyPointerDown: (e: React.PointerEvent) => void;
  onDragHandlePointerDown: (e: React.PointerEvent) => void;
  onRemove: () => void;
}) {
  const typeStyle = deliveryTypeStyles(deliveryTypes, card.type);
  const datasetRid = extractDatasetRid(card.resourceId);

  return (
    <div
      onPointerDown={onBodyPointerDown}
      onClick={onClick}
      className={`group rounded-xl border border-l-[3px] p-3 shadow-sm [touch-action:pan-y] ${
        typeStyle.accent
      } ${
        dragging
          ? "cursor-grabbing touch-none border-brand-500/60 bg-surface-input opacity-60 shadow-md ring-2 ring-brand-500/40"
          : selected
            ? "cursor-grab border-brand-500/70 bg-surface-input ring-2 ring-brand-500/35"
            : "cursor-grab border-surface-border-strong bg-surface-input hover:border-brand-500/45 hover:shadow-md"
      } ${card.status === "blocked" ? "ring-1 ring-red-500/25" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Drag to change status"
          onPointerDown={onDragHandlePointerDown}
          onClick={(e) => e.stopPropagation()}
          className="-ml-2 -mt-2 flex min-h-[44px] min-w-[44px] shrink-0 cursor-grab items-center justify-center rounded text-fg-faint transition hover:text-fg-muted active:cursor-grabbing"
        >
          <GripVertical size={15} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold leading-snug text-fg-primary">{card.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${typeStyle.badge}`}
            >
              {deliveryTypeLabel(deliveryTypes, card.type)}
            </span>
            {card.owner && (
              <span className="truncate text-[10px] text-fg-secondary">{card.owner}</span>
            )}
            {datasetRid && (
              <FoundryHealthBadge
                projectPath={projectPath}
                datasetRid={datasetRid}
                showLabel={true}
                size="sm"
              />
            )}
          </div>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`-mr-2 -mt-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-fg-faint transition hover:bg-red-500/10 hover:text-red-400 ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title="Remove card"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
});

function DeliveryCardDetail({
  projectPath,
  card,
  blockers,
  onClose,
  onUpdate,
  onDelete,
  onNavigateToArchitecture,
  onOpenDocument,
}: {
  projectPath: string;
  card: DeliveryCard;
  blockers: BlockerEntry[];
  onClose: () => void;
  onUpdate: (patch: Partial<DeliveryCard>) => void;
  onDelete: () => void;
  onNavigateToArchitecture?: (nodeId: string) => void;
  onOpenDocument?: (path: string) => void;
}) {
  const resourceUrl = card.resourceId?.trim();
  const datasetRid = extractDatasetRid(resourceUrl);
  const isUrl = resourceUrl?.startsWith("http://") || resourceUrl?.startsWith("https://");
  const hasArchitectureLink = card.architectureNodeId && onNavigateToArchitecture;
  const hasDesignDoc = card.designRef?.trim() && onOpenDocument;

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-l border-surface-border bg-surface-raised/40">
      <div className="flex items-start justify-between gap-2 border-b border-surface-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Component</p>
          <p className="truncate text-sm font-semibold text-fg-primary">{card.title || "Untitled"}</p>
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
        <Field label="Title">
          <TextInput
            value={card.title}
            onChange={(v) => onUpdate({ title: v })}
            placeholder="Component name"
          />
        </Field>

        <Field label="Type">
          <DeliveryTypeSelect
            value={card.type}
            onChange={(v) => onUpdate({ type: v })}
          />
        </Field>

        <Field label="Status">
          <SelectInput
            value={card.status}
            onChange={(v) => onUpdate({ status: v as DeliveryStatus })}
            options={DELIVERY_STATUSES.map((s) => ({
              value: s,
              label: DELIVERY_STATUS_LABELS[s],
            }))}
          />
        </Field>

        <Field label="Owner">
          <UserPicker
            projectPath={projectPath}
            value={card.owner}
            onChange={(v) => onUpdate({ owner: v })}
            placeholder="Select owner"
          />
        </Field>

        <Field label="Design reference" hint="Doc path or section in this project">
          <TextInput
            value={card.designRef || ""}
            onChange={(v) => onUpdate({ designRef: v })}
            placeholder="02-design/pipeline-design.md"
          />
        </Field>

        <Field
          label="Resource / RID"
          hint="Dataset RID enables Foundry health checks on this card (requires api:data-health-read)"
          classification="customer-specific"
        >
          <TextInput
            value={card.resourceId || ""}
            onChange={(v) => onUpdate({ resourceId: v })}
            placeholder="ri.foundry.main.dataset.xxx or https://…"
          />
          <div className="mt-2 flex items-center gap-3">
            {isUrl && resourceUrl && (
              <button
                type="button"
                onClick={() => api.openUrl(resourceUrl)}
                className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
              >
                <ExternalLink size={12} /> Open in browser
              </button>
            )}
            {datasetRid && (
              <FoundryHealthBadge
                projectPath={projectPath}
                datasetRid={datasetRid}
                showLabel={true}
                size="sm"
              />
            )}
          </div>
        </Field>

        {blockers.length > 0 && (
          <Field label="Linked blocker">
            <SelectInput
              value={card.blockerId || ""}
              onChange={(v) => onUpdate({ blockerId: v || undefined })}
              options={[
                { value: "", label: "None" },
                ...blockers.map((b) => ({ value: b.id, label: b.title })),
              ]}
            />
          </Field>
        )}

        <Field label="Notes">
          <TextArea
            value={card.notes || ""}
            onChange={(v) => onUpdate({ notes: v })}
            rows={4}
            placeholder="Implementation notes, dependencies, UAT context…"
          />
        </Field>

        {(hasArchitectureLink || hasDesignDoc) && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-fg-muted">Related views</p>
            <div className="flex flex-wrap gap-2">
              {hasArchitectureLink && (
                <button
                  type="button"
                  onClick={() => onNavigateToArchitecture!(card.architectureNodeId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-strong bg-surface-base/60 px-3 py-1.5 text-xs text-fg-body transition hover:border-brand-500/50 hover:text-brand-400"
                >
                  <Layers size={12} />
                  View in Architecture
                  <ArrowRight size={10} className="opacity-50" />
                </button>
              )}
              {hasDesignDoc && (
                <button
                  type="button"
                  onClick={() => {
                    const docPath = card.designRef!.startsWith("/")
                      ? card.designRef!
                      : `${projectPath}/${card.designRef}`;
                    onOpenDocument!(docPath);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-strong bg-surface-base/60 px-3 py-1.5 text-xs text-fg-body transition hover:border-brand-500/50 hover:text-brand-400"
                >
                  <FileText size={12} />
                  Open design doc
                  <ArrowRight size={10} className="opacity-50" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-surface-base/60 px-3 py-2 text-[10px] text-fg-muted">
          <p>Created {formatDate(card.createdAt)}</p>
          <p>Updated {formatDate(card.updatedAt)}</p>
        </div>
      </div>

      <div className="border-t border-surface-border p-4">
        <SecondaryButton onClick={onDelete}>
          <span className="text-red-400">Delete component</span>
        </SecondaryButton>
      </div>
    </aside>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
