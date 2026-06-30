import { useMemo, useState } from "react";
import { Download, Loader2, Network, Orbit, Search } from "lucide-react";
import type { ArchitectureGraph } from "../../types";
import { PrimaryButton, SecondaryButton } from "../forms/FormField";

interface OntologyGraphOverviewProps {
  graph: ArchitectureGraph;
  onOpenExplorer: () => void;
  onOpenPreview: () => void;
  onLoadFullGraph: () => void;
  onExportGexf: () => void;
  loadingFullGraph?: boolean;
  exportingGexf?: boolean;
  onOpenWorkingView?: () => void;
}

export function OntologyGraphOverview({
  graph,
  onOpenExplorer,
  onOpenPreview,
  onLoadFullGraph,
  onExportGexf,
  loadingFullGraph = false,
  exportingGexf = false,
  onOpenWorkingView,
}: OntologyGraphOverviewProps) {
  const [search, setSearch] = useState("");

  const objectTypes = useMemo(
    () => graph.nodes.filter((n) => n.type === "objectType"),
    [graph.nodes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return objectTypes;
    return objectTypes.filter(
      (n) =>
        n.data.label.toLowerCase().includes(q) ||
        String(n.data.foundryLink || "").toLowerCase().includes(q),
    );
  }, [objectTypes, search]);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <h3 className="text-sm font-semibold text-amber-200">Large ontology</h3>
        <p className="mt-1 text-sm text-fg-secondary">
          {graph.nodes.length} object types, {graph.edges.length} connections. Use the WebGL graph
          explorer for the full interactive view, preview the most connected types on the canvas,
          or export GEXF for Gephi.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton onClick={onOpenExplorer} disabled={loadingFullGraph}>
            <span className="inline-flex items-center gap-2">
              <Orbit size={14} /> Graph explorer
            </span>
          </PrimaryButton>
          <SecondaryButton onClick={onOpenPreview} disabled={loadingFullGraph}>
            <span className="inline-flex items-center gap-2">
              <Network size={14} /> Preview top connected
            </span>
          </SecondaryButton>
          <SecondaryButton onClick={onLoadFullGraph} disabled={loadingFullGraph}>
            <span className="inline-flex items-center gap-2">
              {loadingFullGraph ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {loadingFullGraph ? "Loading…" : "Browse all types"}
            </span>
          </SecondaryButton>
          <SecondaryButton onClick={onExportGexf} disabled={exportingGexf || loadingFullGraph}>
            <span className="inline-flex items-center gap-2">
              <Download size={14} />
              {exportingGexf ? "Exporting…" : "Export GEXF…"}
            </span>
          </SecondaryButton>
          {onOpenWorkingView && (
            <SecondaryButton onClick={onOpenWorkingView} disabled={loadingFullGraph}>
              Switch to working diagram
            </SecondaryButton>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search object types…"
          className="w-full rounded-lg border border-surface-border bg-surface-base py-2 pl-9 pr-3 text-sm text-fg-primary"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-surface-border bg-surface-raised/30">
        <ul className="divide-y divide-surface-border">
          {filtered.map((node) => (
            <li key={node.id} className="px-4 py-3">
              <p className="font-medium text-fg-primary">{node.data.label}</p>
              {node.data.foundryLink && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-fg-muted">
                  {node.data.foundryLink}
                </p>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-fg-muted">No matches</li>
          )}
        </ul>
      </div>
    </div>
  );
}
