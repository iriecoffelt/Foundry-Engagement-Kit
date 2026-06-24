import { Clock } from "lucide-react";
import { getRecent } from "../lib/recent";

interface RecentActivityProps {
  onOpen: (path: string) => void;
}

export function RecentActivity({ onOpen }: RecentActivityProps) {
  const items = getRecent();

  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-fg-primary">
        <Clock size={18} className="text-fg-muted" />
        Recent activity
      </h3>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => onOpen(item.path)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-fg-secondary hover:bg-surface-raised hover:text-fg-primary"
          >
            <span>{item.title}</span>
            <span className="text-xs text-fg-faint">{item.section}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
