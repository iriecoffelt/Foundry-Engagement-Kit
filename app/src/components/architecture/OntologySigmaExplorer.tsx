import "@react-sigma/core/lib/style.css";
import {
  ControlsContainer,
  SigmaContainer,
  useRegisterEvents,
  useSigma,
  ZoomControl,
} from "@react-sigma/core";
import Graph from "graphology";
import { ArrowLeft, Download, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings } from "sigma/settings";
import type { ArchitectureGraph } from "../../types";
import {
  applySigmaFocus,
  applySigmaSearchFilter,
  buildSigmaGraphologyGraph,
  clearSigmaFocus,
  getGraphNodeLabel,
  SIGMA_NODE_COLOR,
  SIGMA_EDGE_COLOR,
} from "../../lib/ontologyGraphSigma";
import { SecondaryButton } from "../forms/FormField";

const SIGMA_SETTINGS: Partial<Settings> = {
  renderEdgeLabels: false,
  renderLabels: true,
  labelFont: "Inter, system-ui, sans-serif",
  labelSize: 12,
  labelColor: { color: "#f1f5f9" },
  labelRenderedSizeThreshold: 4,
  defaultNodeColor: SIGMA_NODE_COLOR,
  defaultEdgeColor: SIGMA_EDGE_COLOR,
  labelDensity: 0.12,
  minCameraRatio: 0.015,
  maxCameraRatio: 24,
  hideEdgesOnMove: false,
  zIndex: true,
};

interface SigmaGraphControllerProps {
  searchQuery: string;
  focusNodeId: string | null;
  onFocusNode: (nodeId: string, label: string) => void;
  onClearFocus: () => void;
}

function SigmaGraphController({
  searchQuery,
  focusNodeId,
  onFocusNode,
  onClearFocus,
}: SigmaGraphControllerProps) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const onFocusNodeRef = useRef(onFocusNode);
  const onClearFocusRef = useRef(onClearFocus);

  onFocusNodeRef.current = onFocusNode;
  onClearFocusRef.current = onClearFocus;

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => {
        onFocusNodeRef.current(node, getGraphNodeLabel(sigma.getGraph(), node));
      },
      doubleClickStage: () => onClearFocusRef.current(),
    });
  }, [registerEvents, sigma]);

  useEffect(() => {
    const graph = sigma.getGraph();
    if (focusNodeId) {
      applySigmaFocus(graph, focusNodeId);
      applySigmaSearchFilter(graph, searchQuery, focusNodeId);
    } else {
      clearSigmaFocus(graph);
      applySigmaSearchFilter(graph, searchQuery, null);
    }
    sigma.refresh();
  }, [sigma, searchQuery, focusNodeId]);

  return null;
}

export interface OntologySigmaExplorerProps {
  graph: ArchitectureGraph;
  onBack: () => void;
  onExportGexf: () => void;
  exportingGexf?: boolean;
}

export function OntologySigmaExplorer({
  graph,
  onBack,
  onExportGexf,
  exportingGexf = false,
}: OntologySigmaExplorerProps) {
  const [sigmaGraph, setSigmaGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("Preparing graph…");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [focusLabel, setFocusLabel] = useState("");
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    setLoading(true);
    setSigmaGraph(null);
    setFocusNodeId(null);
    setFocusLabel("");
    setSearchQuery("");
    setError("");
    setProgress("Preparing graph…");

    void buildSigmaGraphologyGraph(graph, (detail) => {
      if (activeRef.current) setProgress(detail);
    })
      .then((built) => {
        if (!activeRef.current) return;
        clearSigmaFocus(built);
        setSigmaGraph(built);
        setLoading(false);
      })
      .catch((e) => {
        if (!activeRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to build graph");
        setLoading(false);
      });

    return () => {
      activeRef.current = false;
    };
  }, [graph]);

  const handleFocusNode = useCallback((nodeId: string, label: string) => {
    setFocusNodeId(nodeId);
    setFocusLabel(label);
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusNodeId(null);
    setFocusLabel("");
  }, []);

  return (
    <div className="ontology-sigma-explorer flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
        <SecondaryButton onClick={onBack}>
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft size={14} /> Back to index
          </span>
        </SecondaryButton>

        {!loading && (
          <>
            <div className="relative min-w-[12rem] flex-1 max-w-sm">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter object types…"
                className="w-full rounded-lg border border-surface-border bg-surface-base py-1.5 pl-8 pr-3 text-sm text-fg-primary"
              />
            </div>

            {focusNodeId && (
              <SecondaryButton onClick={handleClearFocus}>
                <span className="inline-flex items-center gap-1.5">
                  <X size={14} /> Clear focus
                </span>
              </SecondaryButton>
            )}

            <SecondaryButton onClick={onExportGexf} disabled={exportingGexf}>
              <span className="inline-flex items-center gap-1.5">
                <Download size={14} />
                {exportingGexf ? "Exporting…" : "Export GEXF…"}
              </span>
            </SecondaryButton>
          </>
        )}
      </div>

      {focusLabel ? (
        <div className="border-b border-surface-border bg-brand-950/20 px-4 py-2 text-sm text-brand-200">
          Focused on <span className="font-medium">{focusLabel}</span> — showing its links. Double-click
          the background to reset.
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="border-b border-surface-border bg-surface-raised/30 px-4 py-2 text-sm text-fg-secondary">
            Click a type to see its connections — edges are hidden until you focus one.
          </div>
        )
      )}

      <div className="relative min-h-0 flex-1 bg-[#0f172a]">
        {loading || !sigmaGraph ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            {error ? (
              <>
                <p className="text-sm font-medium text-red-300">Could not open graph explorer</p>
                <p className="text-sm text-fg-secondary">{error}</p>
                <SecondaryButton onClick={onBack}>Back to index</SecondaryButton>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-fg-primary">Loading graph explorer</p>
                <p className="text-sm text-fg-secondary">{progress}</p>
              </>
            )}
          </div>
        ) : (
          <SigmaContainer
            graph={sigmaGraph}
            settings={SIGMA_SETTINGS}
            className="!absolute inset-0 !h-full !w-full"
          >
            <SigmaGraphController
              searchQuery={searchQuery}
              focusNodeId={focusNodeId}
              onFocusNode={handleFocusNode}
              onClearFocus={handleClearFocus}
            />
            <ControlsContainer position="bottom-right">
              <ZoomControl />
            </ControlsContainer>
          </SigmaContainer>
        )}
      </div>

      <p className="border-t border-surface-border px-4 py-2 text-xs text-fg-muted">
        WebGL graph explorer — pan and zoom freely. Click a type to highlight its links; export GEXF
        to open the full ontology in Gephi or Cytoscape.
      </p>
    </div>
  );
}
