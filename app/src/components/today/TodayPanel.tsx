import { ArrowRight, ListTodo } from "lucide-react";
import { useEffect, useState } from "react";
import { loadTodayItems } from "../../lib/today";
import type { ProjectMeta, TodayItem } from "../../types";

interface TodayPanelProps {
  projects: ProjectMeta[];
  onOpenProject?: (slug: string, tab?: string) => void;
}

const KIND_LABELS: Record<TodayItem["kind"], string> = {
  cadence: "Cadence",
  action: "Action",
  blocker: "Blocker",
  delivery: "Delivery",
  uat: "UAT",
  milestone: "Milestone",
};

const PRIORITY_STYLES: Record<TodayItem["priority"], string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-surface-border",
};

export function TodayPanel({ projects, onOpenProject }: TodayPanelProps) {
  const [items, setItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadTodayItems(projects).then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, [projects]);

  if (!projects.length) return null;

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <ListTodo size={20} className="text-brand-500" />
        <h3 className="text-lg font-semibold text-fg-primary">Today</h3>
        {!loading && (
          <span className="text-sm text-fg-muted">— {items.length} items across engagements</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-fg-muted">Loading priorities…</p>
      ) : items.length === 0 ? (
        <div className="card-kit border-dashed p-6 text-center text-sm text-fg-secondary">
          Nothing urgent — good time for deep work or customer prep.
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 12).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenProject?.(item.projectSlug, item.tab)}
              className={`card-kit-interactive flex w-full items-center gap-3 border-l-4 p-3 text-left ${PRIORITY_STYLES[item.priority]}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg-primary">{item.title}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {item.project}
                  {item.meta ? ` · ${item.meta}` : ""}
                  {" · "}
                  {KIND_LABELS[item.kind]}
                </p>
              </div>
              <ArrowRight size={14} className="shrink-0 text-fg-faint" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
