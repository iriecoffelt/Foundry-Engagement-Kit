import { AlertCircle, Calendar, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { getCadenceAlerts, type CadenceAlert } from "../lib/cadence";
import type { ProjectMeta } from "../types";

interface CadenceAlertsProps {
  projects: ProjectMeta[];
  onStartStandup: () => void;
  onStartWeekly: () => void;
}

export function CadenceAlerts({ projects, onStartStandup, onStartWeekly }: CadenceAlertsProps) {
  const [alerts, setAlerts] = useState<CadenceAlert[]>([]);

  useEffect(() => {
    getCadenceAlerts(projects).then(setAlerts);
  }, [projects]);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
      <div className="flex items-center gap-2 text-amber-300">
        <AlertCircle size={18} />
        <span className="text-sm font-medium">Cadence reminders</span>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.slice(0, 4).map((a, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{a.message}</span>
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
