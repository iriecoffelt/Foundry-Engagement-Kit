import { FileText, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { decisionStatusTone, loadDecisions } from "../../lib/decisions";
import type { DecisionSummary } from "../../types";
import { SecondaryButton } from "../forms/FormField";

interface DecisionIndexViewProps {
  projectPath: string;
  onOpenAdr: (path: string) => void;
  onNewAdr: () => void;
}

export function DecisionIndexView({
  projectPath,
  onOpenAdr,
  onNewAdr,
}: DecisionIndexViewProps) {
  const [decisions, setDecisions] = useState<DecisionSummary[]>([]);

  const load = useCallback(async () => {
    setDecisions(await loadDecisions(projectPath));
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-fg-primary">Decision index</h3>
            <p className="mt-1 text-sm text-fg-secondary">
              Architecture decision records in <code className="text-brand-300">02-design/adrs/</code>
            </p>
          </div>
          <SecondaryButton onClick={onNewAdr}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} /> New ADR
            </span>
          </SecondaryButton>
        </div>

        {decisions.length === 0 ? (
          <div className="mt-8 card-kit border-dashed p-10 text-center">
            <FileText size={32} className="mx-auto text-fg-faint" />
            <p className="mt-3 text-fg-secondary">No ADRs yet.</p>
            <button
              type="button"
              onClick={onNewAdr}
              className="mt-2 text-sm text-brand-400 hover:text-brand-300"
            >
              Create your first ADR
            </button>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated/50 text-left text-xs text-fg-muted">
                  <th className="px-4 py-2">ADR</th>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <tr
                    key={d.path}
                    className="cursor-pointer border-b border-surface-border/60 transition hover:bg-surface-elevated/40"
                    onClick={() => onOpenAdr(d.path)}
                  >
                    <td className="px-4 py-3 font-mono text-brand-400">
                      {String(d.number).padStart(3, "0")}
                    </td>
                    <td className="px-4 py-3 text-fg-primary">{d.title}</td>
                    <td className={`px-4 py-3 ${decisionStatusTone(d.status)}`}>{d.status}</td>
                    <td className="px-4 py-3 text-fg-muted">{d.date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
