import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import { useEffect } from "react";
import type { OntologyGraphPrepareProgress } from "../../lib/ontologyGraphPrepare";

const LARGE_GRAPH_NODES = 80;

interface FitViewOnceProps {
  nodeCount: number;
  wideOverview?: boolean;
}

function FitViewOnce({ nodeCount, wideOverview }: FitViewOnceProps) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount === 0) return;
    const frame = requestAnimationFrame(() => {
      void fitView({
        padding: wideOverview ? 0.06 : 0.18,
        minZoom: wideOverview ? 0.03 : 0.35,
        maxZoom: wideOverview ? 0.45 : nodeCount > 30 ? 0.75 : 1,
        duration: wideOverview ? 0 : 300,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [nodeCount, wideOverview, fitView]);

  return null;
}

interface ProgressOverlayProps {
  progress: OntologyGraphPrepareProgress;
}

export function ProgressOverlay({ progress }: ProgressOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-base/90 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-raised p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-fg-primary">Loading ontology browser</p>
          <span className="rounded-full bg-brand-900/50 px-2 py-0.5 text-xs font-medium text-brand-300">
            {progress.phaseLabel}
          </span>
        </div>
        <p className="mt-2 text-sm text-fg-secondary">{progress.detail}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-base">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-200"
            style={{
              width: `${
                progress.total > 0
                  ? Math.round((progress.current / progress.total) * 100)
                  : progress.phase === "layout"
                    ? 25
                    : 100
              }%`,
            }}
          />
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          Types load in stages so the app stays responsive. Links are shown when you
          focus on a type.
        </p>
      </div>
    </div>
  );
}

export interface ArchitectureCanvasProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: (connection: Connection) => void;
  onSelectionChange: (selection: { nodes: Node[]; edges: Edge[] }) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  graphReady: boolean;
  ontologyCanvasMode: "preview" | "full" | null;
  ontologyBrowseMode: "all" | "focus";
  deliveryLinked: boolean;
  ontologyPrepareProgress: OntologyGraphPrepareProgress | null;
}

export function ArchitectureCanvas({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onNodeDoubleClick,
  graphReady,
  ontologyCanvasMode,
  ontologyBrowseMode,
  deliveryLinked,
  ontologyPrepareProgress,
}: ArchitectureCanvasProps) {
  return (
    <div className="relative h-full min-h-0">
      {ontologyPrepareProgress && <ProgressOverlay progress={ontologyPrepareProgress} />}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        onlyRenderVisibleElements={ontologyCanvasMode === "full" || nodes.length > LARGE_GRAPH_NODES}
        nodesDraggable={ontologyCanvasMode !== "full"}
        nodesConnectable={deliveryLinked}
        elementsSelectable
        minZoom={0.02}
        maxZoom={1.5}
        zoomOnScroll={false}
        panOnScroll
        proOptions={{ hideAttribution: true }}
        className="bg-surface-base"
      >
        {graphReady && nodes.length > 0 && (
          <FitViewOnce
            nodeCount={nodes.length}
            wideOverview={ontologyCanvasMode === "full" && ontologyBrowseMode === "all"}
          />
        )}
        <Background color="#334155" gap={20} />
        <Controls className="!bg-surface-raised !border-surface-border-strong" />
        {ontologyCanvasMode !== "full" && nodes.length <= LARGE_GRAPH_NODES && nodes.length > 0 && (
          <MiniMap className="!bg-surface-raised" />
        )}
      </ReactFlow>
    </div>
  );
}

interface FooterHintProps {
  deliveryLinked: boolean;
  ontologyCanvasMode: "preview" | "full" | null;
  ontologyBrowseMode: "all" | "focus";
}

export function FooterHint({ deliveryLinked, ontologyCanvasMode, ontologyBrowseMode }: FooterHintProps) {
  const text = deliveryLinked
    ? "Drag nodes to arrange. Double-click to rename. Select a node for notes and Foundry links, or an edge to add a label. Use Sync to keep the diagram and delivery board aligned both ways."
    : ontologyCanvasMode === "full"
      ? ontologyBrowseMode === "focus"
        ? "Focused link view — use Back to all types to return to the full browse grid."
        : "Browse all object types — double-click a type (or use Show links in the panel) to see its connections."
      : ontologyCanvasMode === "preview"
        ? "Preview of the most connected object types — use Back to index for the full list or Graph explorer."
        : "Foundry ontology reference — object types and their links. Functions and actions stay on the Ontology tab only.";

  return (
    <p className="border-t border-surface-border px-4 py-2 text-xs text-fg-muted">
      {text}
    </p>
  );
}
