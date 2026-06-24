import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { updateEngagementStatus } from "../../lib/engagementMeta";
import {
  DEFAULT_CHECKLIST,
  PHASE_LABELS,
  PHASE_ORDER,
  checklistPath,
  computePhaseProgress,
  mergeChecklist,
  newChecklistItemId,
  type PhaseChecklist,
} from "../../lib/phaseChecklist";
import { statusBarClass } from "../../lib/engagementStatus";
import type { EngagementStatus } from "../../types";
import { SelectInput, TextInput } from "../forms/FormField";

interface PhaseStepperProps {
  projectPath: string;
  currentStatus: string;
  onProgressChange?: (overall: number) => void;
  onStatusChange?: (status: EngagementStatus) => void;
}

export function PhaseStepper({
  projectPath,
  currentStatus,
  onProgressChange,
  onStatusChange,
}: PhaseStepperProps) {
  const [checklist, setChecklist] = useState<PhaseChecklist>(DEFAULT_CHECKLIST);
  const [activePhase, setActivePhase] = useState<EngagementStatus>(
    (PHASE_ORDER.includes(currentStatus as EngagementStatus)
      ? currentStatus
      : "discovery") as EngagementStatus,
  );
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newTaskLabel, setNewTaskLabel] = useState("");

  const notifyProgress = useCallback(
    (data: PhaseChecklist) => {
      onProgressChange?.(computePhaseProgress(data).overall);
    },
    [onProgressChange],
  );

  const load = useCallback(async () => {
    try {
      const data = await api.readJson<PhaseChecklist>(checklistPath(projectPath));
      const merged = mergeChecklist(data);
      setChecklist(merged);
      notifyProgress(merged);
    } catch {
      const initial = structuredClone(DEFAULT_CHECKLIST);
      setChecklist(initial);
      notifyProgress(initial);
      try {
        await api.writeJson(checklistPath(projectPath), initial);
      } catch {
        /* best effort — will save on first change */
      }
    }
  }, [projectPath, notifyProgress]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const phase = PHASE_ORDER.includes(currentStatus as EngagementStatus)
      ? (currentStatus as EngagementStatus)
      : "discovery";
    setActivePhase(phase);
  }, [currentStatus]);

  const save = async (updated: PhaseChecklist) => {
    setChecklist(updated);
    notifyProgress(updated);
    setSaving(true);
    try {
      await api.writeJson(checklistPath(projectPath), updated);
    } finally {
      setSaving(false);
    }
  };

  const updatePhaseItems = (phase: EngagementStatus, items: PhaseChecklist["phases"][EngagementStatus]) => {
    save({
      ...checklist,
      phases: { ...checklist.phases, [phase]: items },
    });
  };

  const toggle = (phase: EngagementStatus, id: string) => {
    updatePhaseItems(
      phase,
      checklist.phases[phase].map((item) =>
        item.id === id && !item.na ? { ...item, done: !item.done } : item,
      ),
    );
  };

  const toggleNa = (phase: EngagementStatus, id: string) => {
    updatePhaseItems(
      phase,
      checklist.phases[phase].map((item) =>
        item.id === id ? { ...item, na: !item.na, done: item.na ? item.done : false } : item,
      ),
    );
  };

  const removeItem = (phase: EngagementStatus, id: string) => {
    updatePhaseItems(
      phase,
      checklist.phases[phase].filter((item) => item.id !== id),
    );
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditLabel(label);
  };

  const commitEdit = (phase: EngagementStatus, id: string) => {
    const label = editLabel.trim();
    if (!label) return;
    updatePhaseItems(
      phase,
      checklist.phases[phase].map((item) => (item.id === id ? { ...item, label } : item)),
    );
    setEditingId(null);
    setEditLabel("");
  };

  const addTask = (phase: EngagementStatus) => {
    const label = newTaskLabel.trim();
    if (!label) return;
    updatePhaseItems(phase, [
      ...checklist.phases[phase],
      { id: newChecklistItemId(), label, done: false },
    ]);
    setNewTaskLabel("");
  };

  const changePhase = async (status: EngagementStatus) => {
    setActivePhase(status);
    setSaving(true);
    try {
      await updateEngagementStatus(projectPath, status);
      onStatusChange?.(status);
    } finally {
      setSaving(false);
    }
  };

  const progress = computePhaseProgress(checklist);
  const activeIndex = PHASE_ORDER.indexOf(activePhase);
  const phaseItems = checklist.phases[activePhase] || [];

  return (
    <div className="card-kit p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-fg-primary">Engagement progress</h3>
        <div className="text-right text-sm">
          <span className="font-medium text-brand-400">{progress.overall}%</span>
          <span className="text-fg-muted">
            {" "}
            · {progress.done} of {progress.total} tasks
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1">
          <label className="text-xs font-medium text-fg-muted">Current phase</label>
          <SelectInput
            value={activePhase}
            onChange={(v) => changePhase(v as EngagementStatus)}
            options={PHASE_ORDER.map((phase) => ({
              value: phase,
              label: PHASE_LABELS[phase],
            }))}
          />
        </div>
        <p className="pb-2 text-xs text-fg-muted">
          Tailor tasks per engagement. Mark N/A what does not apply. Milestones are separate.
        </p>
      </div>

      <div className="mt-4 flex gap-1">
        {PHASE_ORDER.map((phase, i) => {
          const isPast = i < activeIndex;
          const isCurrent = i === activeIndex;
          const filled = isPast || isCurrent;
          return (
            <button
              key={phase}
              type="button"
              onClick={() => setActivePhase(phase)}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${PHASE_LABELS[phase]}: ${progress.byPhase[phase]}%`}
            >
              <div
                className={`h-2 w-full rounded-full transition-colors ${
                  filled ? statusBarClass(phase) : "bg-surface-elevated"
                } ${isPast ? "opacity-70" : isCurrent ? "ring-1 ring-white/20" : ""}`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? "text-fg-primary" : isPast ? "text-fg-secondary" : "text-fg-faint"
                }`}
              >
                {PHASE_LABELS[phase]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-1">
        {phaseItems.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-elevated/80 ${
              item.na ? "opacity-60" : ""
            }`}
          >
            <button
              type="button"
              disabled={item.na}
              onClick={() => toggle(activePhase, item.id)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left text-sm disabled:cursor-not-allowed"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  item.na
                    ? "border-surface-border bg-surface-base"
                    : item.done
                      ? "border-brand-500 bg-brand-600 text-fg-on-accent"
                      : "border-surface-border-strong bg-surface-base"
                }`}
              >
                {item.done && !item.na && <Check size={12} />}
              </span>
              {editingId === item.id ? (
                <span className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <TextInput
                    value={editLabel}
                    onChange={setEditLabel}
                    placeholder="Task label"
                  />
                </span>
              ) : (
                <span
                  className={
                    item.na
                      ? "text-fg-muted line-through"
                      : item.done
                        ? "text-fg-muted line-through"
                        : "text-fg-body"
                  }
                >
                  {item.label}
                </span>
              )}
            </button>

            {item.na && (
              <span className="shrink-0 rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                N/A
              </span>
            )}

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {editingId === item.id ? (
                <>
                  <IconButton
                    label="Save"
                    onClick={() => commitEdit(activePhase, item.id)}
                  >
                    <Check size={14} />
                  </IconButton>
                  <IconButton
                    label="Cancel"
                    onClick={() => {
                      setEditingId(null);
                      setEditLabel("");
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                </>
              ) : (
                <>
                  <IconButton
                    label="Edit"
                    onClick={() => startEdit(item.id, item.label)}
                  >
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    label={item.na ? "Include in progress" : "Not applicable"}
                    onClick={() => toggleNa(activePhase, item.id)}
                  >
                    <span className="text-[10px] font-semibold">N/A</span>
                  </IconButton>
                  <IconButton
                    label="Delete"
                    onClick={() => removeItem(activePhase, item.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            value={newTaskLabel}
            onChange={setNewTaskLabel}
            placeholder={`Add ${PHASE_LABELS[activePhase].toLowerCase()} task…`}
          />
        </div>
        <button
          type="button"
          onClick={() => addTask(activePhase)}
          disabled={!newTaskLabel.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-surface-border-strong px-3 py-2 text-sm font-medium text-fg-body transition hover:border-surface-border-strong hover:text-fg-primary disabled:opacity-40"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {saving && <p className="mt-2 text-xs text-fg-muted">Saving…</p>}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded p-1.5 text-fg-muted transition hover:bg-surface-base hover:text-fg-primary"
    >
      {children}
    </button>
  );
}
