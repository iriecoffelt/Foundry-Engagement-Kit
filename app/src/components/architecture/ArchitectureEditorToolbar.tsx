import { ArrowLeft, Download, ImageDown, RefreshCw, Search } from "lucide-react";
import type { ResolvedArchNodeType } from "../../lib/architectureNodeTypes";
import {
  ARCHITECTURE_VIEWS,
  architectureViewById,
  type ArchitectureViewId,
} from "../../lib/architectureViews";
import type { ArchitectureGraph } from "../../types";
import { SecondaryButton } from "../forms/FormField";
import { FoundryOntologySelect } from "../foundry/FoundryOntologySelect";
import { ProjectFoundryStackField } from "../projects/ProjectFoundryStackField";

interface ViewSwitcherProps {
  architectureView: ArchitectureViewId;
  onViewChange: (viewId: ArchitectureViewId) => void;
}

export function ViewSwitcher({ architectureView, onViewChange }: ViewSwitcherProps) {
  const viewDef = architectureViewById(architectureView);
  return (
    <div className="min-w-[12rem]">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-muted">
        Diagram
      </label>
      <select
        value={architectureView}
        onChange={(e) => onViewChange(e.target.value as ArchitectureViewId)}
        className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-fg-primary"
      >
        {ARCHITECTURE_VIEWS.map((view) => (
          <option key={view.id} value={view.id}>
            {view.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-fg-muted">{viewDef.description}</p>
    </div>
  );
}

interface TopToolbarProps {
  architectureView: ArchitectureViewId;
  onViewChange: (viewId: ArchitectureViewId) => void;
  projectPath: string;
  stackUrl: string;
  onStackUrlChange: (url: string) => void;
  deliveryLinked: boolean;
  onOntologyChange: () => void;
}

export function TopToolbar({
  architectureView,
  onViewChange,
  projectPath,
  stackUrl,
  onStackUrlChange,
  deliveryLinked,
  onOntologyChange,
}: TopToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
      <ViewSwitcher architectureView={architectureView} onViewChange={onViewChange} />
      {!deliveryLinked && (
        <FoundryOntologySelect
          projectPath={projectPath}
          onChange={onOntologyChange}
          className="min-w-[12rem]"
        />
      )}
      <ProjectFoundryStackField
        projectPath={projectPath}
        value={stackUrl}
        onChange={onStackUrlChange}
        compact
      />
    </div>
  );
}

interface WorkingDiagramToolbarProps {
  resolvedTypes: ResolvedArchNodeType[];
  onAddNode: (type: string) => void;
  onSync: () => void;
  syncing: boolean;
  onSavePng: () => void;
  onExportPng: () => void;
  exporting: boolean;
  onSave: () => void;
  saving: boolean;
  nodesCount: number;
}

export function WorkingDiagramToolbar({
  resolvedTypes,
  onAddNode,
  onSync,
  syncing,
  onSavePng,
  onExportPng,
  exporting,
  onSave,
  saving,
  nodesCount,
}: WorkingDiagramToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
      <span className="mr-2 text-sm text-fg-secondary">Add:</span>
      {resolvedTypes.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onAddNode(n.id)}
          className="rounded-lg border border-surface-border-strong px-3 py-1.5 text-xs text-fg-body hover:border-surface-border-strong hover:text-fg-primary"
          style={{ borderLeftWidth: 3, borderLeftColor: n.hexColor }}
        >
          {n.label}
        </button>
      ))}
      <div className="ml-auto flex flex-wrap gap-2">
        <SecondaryButton onClick={onSync} disabled={syncing}>
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync with delivery board"}
          </span>
        </SecondaryButton>
        <SecondaryButton onClick={onSavePng} disabled={exporting || nodesCount === 0}>
          <span className="inline-flex items-center gap-1.5">
            <ImageDown size={14} />
            {exporting ? "Exporting…" : "Save PNG to project"}
          </span>
        </SecondaryButton>
        <SecondaryButton onClick={onExportPng} disabled={exporting || nodesCount === 0}>
          <span className="inline-flex items-center gap-1.5">
            <ImageDown size={14} />
            Export PNG…
          </span>
        </SecondaryButton>
        <SecondaryButton onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save diagram"}
        </SecondaryButton>
      </div>
    </div>
  );
}

interface OntologyToolbarProps {
  ontologyCanvasMode: "preview" | "full" | null;
  ontologyBrowseMode: "all" | "focus";
  ontologySearch: string;
  onOntologySearchChange: (search: string) => void;
  overviewGraph: ArchitectureGraph | null;
  onBackToOverview: () => void;
  onBackToAllTypes: () => void;
  onOpenGraphExplorer: () => void;
  onRefreshOntology: () => void;
  refreshingOntology: boolean;
  onExportGexf: () => void;
  exportingGexf: boolean;
  onExportPng: () => void;
  exporting: boolean;
  onSave: () => void;
  saving: boolean;
  nodesCount: number;
}

export function OntologyToolbar({
  ontologyCanvasMode,
  ontologyBrowseMode,
  ontologySearch,
  onOntologySearchChange,
  overviewGraph,
  onBackToOverview,
  onBackToAllTypes,
  onOpenGraphExplorer,
  onRefreshOntology,
  refreshingOntology,
  onExportGexf,
  exportingGexf,
  onExportPng,
  exporting,
  onSave,
  saving,
  nodesCount,
}: OntologyToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
      {ontologyCanvasMode === "preview" && overviewGraph && (
        <div className="mr-auto">
          <SecondaryButton onClick={onBackToOverview}>
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft size={14} /> Back to index
            </span>
          </SecondaryButton>
        </div>
      )}
      {ontologyCanvasMode === "full" && (
        <>
          {ontologyBrowseMode === "focus" ? (
            <SecondaryButton onClick={onBackToAllTypes}>
              Back to all types
            </SecondaryButton>
          ) : (
            <div className="relative mr-auto w-full max-w-xs sm:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
              />
              <input
                type="search"
                value={ontologySearch}
                onChange={(e) => onOntologySearchChange(e.target.value)}
                placeholder="Filter object types…"
                className="w-full rounded-lg border border-surface-border bg-surface-base py-1.5 pl-8 pr-3 text-sm text-fg-primary"
              />
            </div>
          )}
          <SecondaryButton onClick={onOpenGraphExplorer} disabled={!overviewGraph}>
            Graph explorer
          </SecondaryButton>
        </>
      )}
      <SecondaryButton onClick={onRefreshOntology} disabled={refreshingOntology}>
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw size={14} className={refreshingOntology ? "animate-spin" : ""} />
          {refreshingOntology ? "Refreshing…" : "Refresh graph links"}
        </span>
      </SecondaryButton>
      <SecondaryButton onClick={onExportGexf} disabled={exportingGexf || !overviewGraph}>
        <span className="inline-flex items-center gap-1.5">
          <Download size={14} />
          {exportingGexf ? "Exporting…" : "Export GEXF…"}
        </span>
      </SecondaryButton>
      <SecondaryButton onClick={onExportPng} disabled={exporting || nodesCount === 0}>
        <span className="inline-flex items-center gap-1.5">
          <ImageDown size={14} />
          Export PNG…
        </span>
      </SecondaryButton>
      <SecondaryButton onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save layout"}
      </SecondaryButton>
    </div>
  );
}

interface MessageBarProps {
  message: string;
}

export function MessageBar({ message }: MessageBarProps) {
  if (!message) return null;
  return (
    <div className="border-b border-surface-border bg-surface-raised/30 px-4 py-2 text-sm text-brand-300">
      {message}
    </div>
  );
}
