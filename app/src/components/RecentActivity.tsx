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
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <Clock size={18} className="text-slate-500" />
        Recent activity
      </h3>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => onOpen(item.path)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <span>{item.title}</span>
            <span className="text-xs text-slate-600">{item.section}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
