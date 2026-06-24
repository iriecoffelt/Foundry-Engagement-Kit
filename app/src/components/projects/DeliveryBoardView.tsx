import { ExternalLink, GripVertical, Layers, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  boardByStatus,
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABELS,
  DELIVERY_TYPE_LABELS,
  loadDeliveryBoard,
  newDeliveryId,
  saveDeliveryBoard,
  seedFromArchitecture,
} from "../../lib/deliveryBoard";
import { loadRegister, openBlockers } from "../../lib/engagementRegister";
import { api } from "../../lib/api";
import type {
  BlockerEntry,
  DeliveryBoard,
  DeliveryCard,
  DeliveryComponentType,
  DeliveryStatus,
} from "../../types";
import {
  Field,
  SecondaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "../forms/FormField";
import { UserPicker } from "./UserPicker";

interface DeliveryBoardViewProps {
  projectPath: string;
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

export function DeliveryBoardView({ projectPath }: DeliveryBoardViewProps) {
  const [board, setBoard] = useState<DeliveryBoard>({ cards: [] });
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<DeliveryComponentType>("pipeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DeliveryStatus | null>(null);
  const [blockers, setBlockers] = useState<BlockerEntry[]>([]);
  const sessionRef = useRef<PointerSession | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const data = await loadDeliveryBoard(projectPath);
    setBoard(data.cards.length ? data : await seedFromArchitecture(projectPath));
    const register = await loadRegister(projectPath);
    setBlockers(openBlockers(register));
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

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

  const removeCard = (id: string) => {
    persist({ cards: board.cards.filter((c) => c.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const selectedCard = board.cards.find((c) => c.id === selectedId) ?? null;
  const grouped = boardByStatus(board);

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
                const seeded = await seedFromArchitecture(projectPath);
                setBoard(seeded);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border-strong px-3 py-2 text-sm text-fg-body hover:text-fg-primary"
            >
              <Layers size={14} /> Seed from architecture
            </button>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-5">
            {DELIVERY_STATUSES.map((status) => (
              <div
                key={status}
                data-delivery-status={status}
                className={`card-kit flex min-h-[12rem] flex-col p-3 transition ${
                  dropTarget === status ? "bg-brand-950/20 ring-2 ring-brand-500/60" : ""
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    {DELIVERY_STATUS_LABELS[status]}
                  </h4>
                  <span className="text-xs text-fg-faint">{grouped[status].length}</span>
                </div>
                <div className="flex min-h-[8rem] flex-1 flex-col gap-2">
                  {grouped[status].map((card) => (
                    <DeliveryCardItem
                      key={card.id}
                      card={card}
                      selected={selectedId === card.id}
                      dragging={draggingId === card.id}
                      onPointerDown={(e) => onCardPointerDown(card.id, e)}
                      onRemove={() => removeCard(card.id)}
                    />
                  ))}
                  {grouped[status].length === 0 && (
                    <p className="flex flex-1 items-center justify-center py-4 text-center text-[10px] text-fg-faint">
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
                <SelectInput
                  value={newType}
                  onChange={(v) => setNewType(v as DeliveryComponentType)}
                  options={Object.entries(DELIVERY_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
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
  selected,
  dragging,
  onPointerDown,
  onRemove,
}: {
  card: DeliveryCard;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onRemove: () => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`group touch-none rounded-lg border p-2.5 ${
        dragging
          ? "cursor-grabbing border-brand-500/50 bg-surface-base/80 opacity-50 ring-2 ring-brand-500/50"
          : selected
            ? "cursor-grab border-brand-500 bg-brand-950/30 ring-1 ring-brand-500/40"
            : "cursor-grab border-surface-border-strong bg-surface-base/80 hover:border-brand-500/40"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical size={14} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg-primary">{card.title}</p>
          <p className="mt-0.5 text-[10px] text-fg-muted">
            {DELIVERY_TYPE_LABELS[card.type]}
            {card.owner ? ` · ${card.owner}` : ""}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-fg-muted transition hover:text-red-400"
          title="Remove card"
        >
          <X size={12} />
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
          <SelectInput
            value={card.type}
            onChange={(v) => onUpdate({ type: v as DeliveryComponentType })}
            options={Object.entries(DELIVERY_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
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
