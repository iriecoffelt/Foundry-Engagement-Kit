import { ExternalLink, GripVertical, Layers, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "../../lib/deliveryBoard";
import {
  deliveryTypeLabel,
  deliveryTypeStyles,
  loadDeliveryTypes,
  type DeliveryTypeDefinition,
} from "../../lib/deliveryTypes";
import { loadRegister, openBlockers } from "../../lib/engagementRegister";
import { api } from "../../lib/api";
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
import { UserPicker } from "./UserPicker";
import { useEscapeKey } from "../../lib/useEscapeKey";

interface DeliveryBoardViewProps {
  projectPath: string;
  initialSelectedCardId?: string | null;
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

export function DeliveryBoardView({ projectPath, initialSelectedCardId }: DeliveryBoardViewProps) {
  const [board, setBoard] = useState<DeliveryBoard>({ cards: [] });
  const [deliveryTypes, setDeliveryTypes] = useState<DeliveryTypeDefinition[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("pipeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DeliveryStatus | null>(null);
  const [blockers, setBlockers] = useState<BlockerEntry[]>([]);
  const sessionRef = useRef<PointerSession | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const [data, types] = await Promise.all([
      loadDeliveryBoard(projectPath),
      loadDeliveryTypes(),
    ]);
    setDeliveryTypes(types);
    setBoard(data.cards.length ? data : await seedFromArchitecture(projectPath));
    const register = await loadRegister(projectPath);
    setBlockers(openBlockers(register));
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (initialSelectedCardId && board.cards.some((c) => c.id === initialSelectedCardId)) {
      setSelectedId(initialSelectedCardId);
    }
  }, [initialSelectedCardId, board.cards]);

  const persist = useCallback(
    async (next: DeliveryBoard) => {
      setBoard(next);
      setSaving(true);
      try {
        await saveDeliveryBoard(projectPath, next);
      } finally {
        setSaving(false);
      }
    },
    [projectPath],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<DeliveryCard>) => {
      setBoard((prev) => {
        const next = {
          cards: prev.cards.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
          ),
        };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const moveCard = useCallback(
    (id: string, status: DeliveryStatus) => {
      setBoard((prev) => {
        const card = prev.cards.find((c) => c.id === id);
        if (!card || card.status === status) return prev;
        const next = {
          cards: prev.cards.map((c) =>
            c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c,
          ),
        };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;

      const distance = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
      if (!session.moved && distance > DRAG_THRESHOLD_PX) {
        session.moved = true;
        draggingIdRef.current = session.cardId;
        setDraggingId(session.cardId);
      }

      if (session.moved) {
        setDropTarget(columnFromPoint(e.clientX, e.clientY));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;

      if (session.moved) {
        const status = columnFromPoint(e.clientX, e.clientY);
        if (status && draggingIdRef.current) moveCard(draggingIdRef.current, status);
        setDraggingId(null);
        draggingIdRef.current = null;
        setDropTarget(null);
      } else {
        setSelectedId(session.cardId);
      }

      sessionRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [moveCard]);

  const onCardPointerDown = (cardId: string, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    sessionRef.current = {
      cardId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
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
    persist({ cards: [...board.cards, card] });
    setNewTitle("");
    setSelectedId(card.id);
  };

  const removeCard = async (id: string) => {
    const card = board.cards.find((c) => c.id === id);
    if (card) {
      await removeArchitectureForDeliveryCard(projectPath, card);
    }
    persist({ cards: board.cards.filter((c) => c.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const selectedCard = board.cards.find((c) => c.id === selectedId) ?? null;
  const grouped = boardByStatus(board);

  useEscapeKey(() => setSelectedId(null), Boolean(selectedId));

  return (
    <div className={`flex h-full min-h-0 ${draggingId ? "select-none" : ""}`}>
      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-fg-primary">Delivery board</h3>
              <p className="mt-1 text-sm text-fg-secondary">
                Click a card to edit details. Drag between columns to change status.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const result = await syncArchitectureAndDelivery(projectPath);
                setBoard(result.board);
                const parts: string[] = [];
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
                className={`flex min-h-[12rem] flex-col rounded-2xl border border-surface-border bg-surface-base/40 p-3 transition ${
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
                      selected={selectedId === card.id}
                      dragging={draggingId === card.id}
                      onPointerDown={(e) => onCardPointerDown(card.id, e)}
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
        />
      )}
    </div>
  );
}

function DeliveryCardItem({
  card,
  deliveryTypes,
  selected,
  dragging,
  onPointerDown,
  onRemove,
}: {
  card: DeliveryCard;
  deliveryTypes: DeliveryTypeDefinition[];
  selected: boolean;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onRemove: () => void;
}) {
  const typeStyle = deliveryTypeStyles(deliveryTypes, card.type);

  return (
    <div
      onPointerDown={onPointerDown}
      className={`group touch-none rounded-xl border border-l-[3px] p-3 shadow-sm transition ${
        typeStyle.accent
      } ${
        dragging
          ? "cursor-grabbing border-brand-500/60 bg-surface-input opacity-60 shadow-md ring-2 ring-brand-500/40"
          : selected
            ? "cursor-grab border-brand-500/70 bg-surface-input ring-2 ring-brand-500/35"
            : "cursor-grab border-surface-border-strong bg-surface-input hover:border-brand-500/45 hover:shadow-md"
      } ${card.status === "blocked" ? "ring-1 ring-red-500/25" : ""}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={15}
          className="mt-0.5 shrink-0 text-fg-faint transition group-hover:text-fg-muted"
          aria-hidden
        />
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
          </div>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className={`shrink-0 rounded-md p-1 text-fg-faint transition hover:bg-red-500/10 hover:text-red-400 ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title="Remove card"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function DeliveryCardDetail({
  projectPath,
  card,
  blockers,
  onClose,
  onUpdate,
  onDelete,
}: {
  projectPath: string;
  card: DeliveryCard;
  blockers: BlockerEntry[];
  onClose: () => void;
  onUpdate: (patch: Partial<DeliveryCard>) => void;
  onDelete: () => void;
}) {
  const resourceUrl = card.resourceId?.trim();
  const isUrl = resourceUrl?.startsWith("http://") || resourceUrl?.startsWith("https://");

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

        <Field label="Resource / RID" hint="Foundry resource ID or URL">
          <TextInput
            value={card.resourceId || ""}
            onChange={(v) => onUpdate({ resourceId: v })}
            placeholder="ri.foundry.main.dataset.xxx or https://…"
          />
          {isUrl && resourceUrl && (
            <button
              type="button"
              onClick={() => api.openUrl(resourceUrl)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
            >
              <ExternalLink size={12} /> Open in browser
            </button>
          )}
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
