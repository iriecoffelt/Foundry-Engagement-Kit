import { AlertCircle, Calendar, CalendarDays } from "lucide-react";
import type { CadenceAlert } from "../lib/cadence";

interface CadenceAlertsProps {
  alerts: CadenceAlert[];
  onStartStandup: () => void;
  onStartWeekly: () => void;
}

export function CadenceAlerts({ alerts, onStartStandup, onStartWeekly }: CadenceAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="card-kit mb-8 border-amber-900/30 bg-amber-950/15 p-4 ring-amber-500/10">
      <div className="flex items-center gap-2 text-amber-300">
        <AlertCircle size={18} />
        <span className="text-sm font-medium">Cadence reminders</span>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.slice(0, 4).map((a, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="text-fg-body">{a.message}</span>
            <button
              onClick={a.type === "standup" ? onStartStandup : onStartWeekly}
              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
            >
              {a.type === "standup" ? <Calendar size={12} /> : <CalendarDays size={12} />}
              Start now
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
