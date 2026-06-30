import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { toPng } from "html-to-image";
import { Download, ArrowLeft, ExternalLink, ImageDown, Link2, RefreshCw, Search } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import {
  deliveryStatusByArchNodeId,
  syncArchitectureAndDelivery,
  loadArchitectureGraph,
  removeDeliveryCardsForArchitectureNodes,
  pruneOrphanDeliveryArchitectureNodes,
  saveArchitectureGraph,
  refreshOntologyArchitectureGraph,
} from "../../lib/architectureSync";
import {
  ARCHITECTURE_VIEWS,
  architectureRelativePath,
  architectureViewById,
  loadStoredArchitectureView,
  storeArchitectureView,
  type ArchitectureViewId,
} from "../../lib/architectureViews";
import type { ResolvedArchNodeType } from "../../lib/architectureNodeTypes";
import { loadResolvedArchNodeTypes } from "../../lib/architectureNodeTypes";
import {
  foundryLinkPlaceholder,
  loadProjectStackUrl,
  openFoundryLink,
  supportsFoundryLink,
} from "../../lib/foundryLinks";
import { generateDesignOverviewMermaid } from "../../lib/markdown";
import { createFoundryClient } from "../../lib/foundryApi";
import {
  isOntologyImportStale,
  loadFoundryConnection,
  saveImportedOntologyRid,
} from "../../lib/foundryConnection";
import { fetchOntologyMetadata } from "../../lib/foundrySync";
import { loadOntologyElements } from "../../lib/ontologyElements";
import {
  isLargeOntologyGraph,
  trimOntologyGraphForCanvas,
  dedupeOntologyGraph,
} from "../../lib/ontologyGraphDisplay";
import { layoutOntologyGraph } from "../../lib/ontologyGraphLayout";
import {
  hydrateOntologyNodesInChunks,
  prepareOntologyBrowseGraph,
  createFetchingProgress,
  type OntologyGraphPrepareProgress,
} from "../../lib/ontologyGraphPrepare";
import {
  countOntologyNodeConnections,
  extractOntologyFocusNeighborhood,
  filterOntologyNodesBySearch,
  layoutOntologyBrowseGrid,
} from "../../lib/ontologyGraphBrowse";
import { gexfToBytes, serializeOntologyGexf } from "../../lib/ontologyGraphGexf";
import { FoundryOntologySelect } from "../foundry/FoundryOntologySelect";
import { OntologyGraphOverview } from "./OntologyGraphOverview";
import { OntologyLiteNode } from "./OntologyLiteNode";
import { OntologySigmaExplorer } from "./OntologySigmaExplorer";
import {
  DELIVERY_STATUS_BADGE,
  DELIVERY_STATUS_LABELS,
  loadDeliveryBoard,
} from "../../lib/deliveryBoard";
import type { ArchitectureGraph, DeliveryCard } from "../../types";
import { SecondaryButton } from "../forms/FormField";
import { useEscapeKey } from "../../lib/useEscapeKey";
import { ArchNodeDetailsPanel, EdgeDetailsPanel } from "./ArchNodeDetailsPanel";
import { ProjectFoundryStackField } from "../projects/ProjectFoundryStackField";

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;

interface ArchEditorContextValue {
  stackUrl: string;
  typeById: Map<string, ResolvedArchNodeType>;
  deliveryByNodeId: Map<string, DeliveryCard>;
  onOpenDelivery?: (cardId: string) => void;
}

const ArchEditorContext = createContext<ArchEditorContextValue>({
  stackUrl: "",
  typeById: new Map(),
  deliveryByNodeId: new Map(),
});

function ArchNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const { stackUrl, typeById, deliveryByNodeId, onOpenDelivery } = useContext(ArchEditorContext);
  const nodeType = String(data.nodeType || "dataset");
  const meta = typeById.get(nodeType) ?? typeById.values().next().value;
  const Icon = meta?.Icon;
  const hexColor = meta?.hexColor ?? "#94a3b8";
  const labelFallback = meta?.label ?? nodeType;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(data.label || labelFallback));
  const foundryLink = String(data.foundryLink || "");
  const hasLink = foundryLink.trim().length > 0;
  const linkable = meta?.linkable ?? false;
  const deliveryCard = deliveryByNodeId.get(id);

  const commitLabel = () => {
    const label = draft.trim() || labelFallback;
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
    );
    setDraft(label);
    setEditing(false);
  };

  const startEditing = () => {
    setDraft(String(data.label || labelFallback));
    setEditing(true);
  };

  const jumpToFoundry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await openFoundryLink(stackUrl, foundryLink, api.openUrl);
    } catch (err) {
      alert(String(err));
    }
  };

  const openDelivery = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deliveryCard && onOpenDelivery) onOpenDelivery(deliveryCard.id);
  };

  return (
    <div
      className={`relative min-w-[140px] rounded-xl border-2 bg-surface-raised px-3 py-2 shadow-lg ${
        selected ? "ring-2 ring-brand-400/60" : ""
      }`}
      style={{ borderColor: hexColor }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-subtle" />
      {linkable && hasLink && (
        <button
          type="button"
          onClick={jumpToFoundry}
          title="Open in Foundry"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-brand-600 text-fg-on-accent shadow hover:bg-brand-500"
        >
          <ExternalLink size={12} />
        </button>
      )}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel();
            if (e.key === "Escape") {
              setDraft(String(data.label || labelFallback));
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded border border-surface-border-strong bg-surface-base px-2 py-1 text-sm text-fg-primary outline-none focus:border-brand-500"
        />
      ) : (
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} style={{ color: hexColor }} />}
            <span className="text-sm font-medium text-fg-primary">{data.label as string}</span>
          </div>
          {linkable && hasLink && (
            <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-brand-400">
              <Link2 size={10} className="shrink-0" />
              <span className="truncate">
                {foundryLink.length > 36 ? `${foundryLink.slice(0, 36)}…` : foundryLink}
              </span>
            </p>
          )}
          {deliveryCard && (
            <button
              type="button"
              onClick={openDelivery}
              className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${DELIVERY_STATUS_BADGE[deliveryCard.status]}`}
              title="Open on delivery board"
            >
              {DELIVERY_STATUS_LABELS[deliveryCard.status]}
            </button>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-surface-subtle" />
    </div>
  );
}

const nodeTypes = { arch: ArchNode, ontologyLite: OntologyLiteNode };

function toFlowNodes(
  graph: ArchitectureGraph,
  options?: { lite?: boolean; searchMatches?: Set<string> | null; centerId?: string },
): Node[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: options?.lite ? "ontologyLite" : "arch",
    position: n.position,
    data: {
      label: n.data.label,
      nodeType: n.type,
      foundryLink: n.data.foundryLink || "",
      notes: n.data.notes || "",
      ontologyElementId: n.data.ontologyElementId || n.data.ontologyObjectId || "",
      dimmed: options?.searchMatches ? !options.searchMatches.has(n.id) : false,
      isCenter: options?.centerId === n.id,
    },
  }));
}

function toFlowEdges(graph: ArchitectureGraph, lite = false) {
  const useLite = lite || graph.edges.length > 250 || graph.nodes.length > 120;
  const usePreview = graph.nodes.length > 20 && graph.nodes.length <= 80;
  return graph.edges.map((e) => {
    if (useLite || usePreview) {
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        style: { stroke: "#38bdf8", strokeWidth: 1.5, opacity: 0.45 },
      };
    }
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: false,
      style: { stroke: "#38bdf8", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed" as const, color: "#38bdf8", width: 16, height: 16 },
      labelStyle: { fill: "#e2e8f0", fontSize: 10 },
      labelBgStyle: { fill: "#0f172a", fillOpacity: 0.92 },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
    };
  });
}

const LARGE_GRAPH_NODES = 80;

function FitViewOnce({
  nodeCount,
  wideOverview,
}: {
  nodeCount: number;
  wideOverview?: boolean;
}) {
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

function fromFlow(nodes: Node[], edges: Edge[]): ArchitectureGraph {
  return {
    nodes: nodes.map((n) => {
      const data: ArchitectureGraph["nodes"][0]["data"] = {
        label: String(n.data.label || "Node"),
      };
      const link = String(n.data.foundryLink || "").trim();
      if (link) data.foundryLink = link;
      const notes = String(n.data.notes || "").trim();
      if (notes) data.notes = notes;
      const ontologyElementId = String(
        n.data.ontologyElementId || n.data.ontologyObjectId || "",
      ).trim();
      if (ontologyElementId) data.ontologyElementId = ontologyElementId;
      return {
        id: n.id,
        type: String(n.data.nodeType || "dataset"),
        position: n.position,
        data,
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" && e.label.trim() ? e.label.trim() : undefined,
    })),
  };
}

function dataUrlToBytes(dataUrl: string): number[] {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  return Array.from(binary, (char) => char.charCodeAt(0));
}

const defaultGraph: ArchitectureGraph = {
  nodes: [
    { id: "src1", type: "source", position: { x: 0, y: 80 }, data: { label: "Source System" } },
    { id: "pipe1", type: "pipeline", position: { x: 220, y: 80 }, data: { label: "Sync Pipeline" } },
    { id: "obj1", type: "objectType", position: { x: 440, y: 80 }, data: { label: "Object Type" } },
    { id: "app1", type: "workshop", position: { x: 660, y: 80 }, data: { label: "Workshop App" } },
  ],
  edges: [
    { id: "e1", source: "src1", target: "pipe1" },
    { id: "e2", source: "pipe1", target: "obj1" },
    { id: "e3", source: "obj1", target: "app1" },
  ],
};

interface ArchitectureEditorProps {
  projectPath: string;
  onOpenDelivery?: (cardId: string) => void;
  initialSelectedNodeId?: string | null;
  /** When false, defer graph load and skip React Flow (tab not visible). */
  visible?: boolean;
}

function getArchNodeStorageKey(projectPath: string) {
  return `arch-selected-node-${projectPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

function ArchitectureEditorInner({
  projectPath,
  onOpenDelivery,
  initialSelectedNodeId,
  visible = true,
}: ArchitectureEditorProps) {
  const [architectureView, setArchitectureView] = useState<ArchitectureViewId>(() =>
    loadStoredArchitectureView(projectPath),
  );
  const viewDef = architectureViewById(architectureView);
  const jsonPath = architectureRelativePath(projectPath, architectureView);
  const overviewPath = `${projectPath}/02-design/design-overview.md`;
  const pngPath = `${projectPath}/02-design/architecture.png`;
  const projectSlug = projectPath.split("/").pop() || "architecture";
  const deliveryLinked = viewDef.deliveryLinked;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeIdInternal] = useState<string | null>(() => {
    try {
      return localStorage.getItem(getArchNodeStorageKey(projectPath));
    } catch {
      return null;
    }
  });
  const [selectedNodeState, setSelectedNodeState] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [initialNodeHandled, setInitialNodeHandled] = useState(false);

  const setSelectedNode = useCallback((node: Node | null) => {
    setSelectedNodeState(node);
    setSelectedNodeIdInternal(node?.id ?? null);
    try {
      if (node) {
        localStorage.setItem(getArchNodeStorageKey(projectPath), node.id);
      } else {
        localStorage.removeItem(getArchNodeStorageKey(projectPath));
      }
    } catch {
      // localStorage unavailable
    }
  }, [projectPath]);

  const selectedNode = selectedNodeState;
  const [resolvedTypes, setResolvedTypes] = useState<ResolvedArchNodeType[]>([]);
  const [deliveryByNodeId, setDeliveryByNodeId] = useState<Map<string, DeliveryCard>>(new Map());
  const [stackUrl, setStackUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingGexf, setExportingGexf] = useState(false);
  const [refreshingOntology, setRefreshingOntology] = useState(false);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphReady, setGraphReady] = useState(false);
  const [canvasMode, setCanvasMode] = useState<"canvas" | "overview" | "explorer">("canvas");
  const [overviewGraph, setOverviewGraph] = useState<ArchitectureGraph | null>(null);
  const [ontologyCanvasMode, setOntologyCanvasMode] = useState<"preview" | "full" | null>(null);
  const [ontologyBrowseMode, setOntologyBrowseMode] = useState<"all" | "focus">("all");
  const [ontologySearch, setOntologySearch] = useState("");
  const [ontologyPrepareProgress, setOntologyPrepareProgress] =
    useState<OntologyGraphPrepareProgress | null>(null);
  const [message, setMessage] = useState("");
  const loadedPathRef = useRef<string | null>(null);
  const fullGraphLoadRef = useRef(0);
  const fullOntologyGraphRef = useRef<ArchitectureGraph | null>(null);

  const applyGraphToCanvas = useCallback(
    (graph: ArchitectureGraph, ontologyView: boolean) => {
      if (ontologyView) {
        const display = trimOntologyGraphForCanvas(graph);
        const laidOut = layoutOntologyGraph(display.graph);
        setOntologyCanvasMode("preview");
        setNodes(toFlowNodes(laidOut));
        setEdges(toFlowEdges(laidOut));
        setGraphReady(true);
        setCanvasMode("canvas");
        if (display.trimmed) {
          setMessage(
            `Showing ${display.graph.nodes.length} of ${display.totalNodes} object types (most connected). Full graph is too large for the canvas.`,
          );
        } else {
          setMessage("");
        }
        return;
      }
      setOntologyCanvasMode(null);
      setOntologyBrowseMode("all");
      setOntologySearch("");
      fullOntologyGraphRef.current = null;
      setNodes(toFlowNodes(graph));
      setEdges(toFlowEdges(graph));
      setGraphReady(true);
      setCanvasMode("canvas");
    },
    [setNodes, setEdges],
  );

  const loadFullOntologyToCanvas = useCallback(
    async (graph: ArchitectureGraph) => {
      const loadId = ++fullGraphLoadRef.current;
      fullOntologyGraphRef.current = graph;
      setOntologyPrepareProgress(createFetchingProgress(0, graph.nodes.length));
      setOntologyCanvasMode("full");
      setOntologyBrowseMode("all");
      setOntologySearch("");
      setCanvasMode("canvas");
      setGraphReady(false);
      setNodes([]);
      setEdges([]);
      setMessage("");

      try {
        const laidOut = await prepareOntologyBrowseGraph(graph, (progress) => {
          if (loadId === fullGraphLoadRef.current) {
            setOntologyPrepareProgress(progress);
          }
        });
        if (loadId !== fullGraphLoadRef.current) return;

        const flowNodes = toFlowNodes(laidOut, { lite: true });
        await hydrateOntologyNodesInChunks(flowNodes, setNodes, (progress) => {
          if (loadId === fullGraphLoadRef.current) {
            setOntologyPrepareProgress(progress);
          }
        });
        if (loadId !== fullGraphLoadRef.current) return;

        setEdges([]);
        setGraphReady(true);
        setMessage(
          `All ${graph.nodes.length} object types — search or double-click a type to explore its links (${graph.edges.length} total connections).`,
        );
      } catch (e) {
        if (loadId !== fullGraphLoadRef.current) return;
        setMessage(e instanceof Error ? e.message : "Failed to load ontology browser");
        setCanvasMode("overview");
        setOntologyCanvasMode(null);
        fullOntologyGraphRef.current = null;
      } finally {
        if (loadId === fullGraphLoadRef.current) {
          setOntologyPrepareProgress(null);
        }
      }
    },
    [setNodes, setEdges],
  );

  const showOntologyFocus = useCallback(
    (nodeId: string) => {
      const graph = fullOntologyGraphRef.current;
      if (!graph) return;

      const center = graph.nodes.find((n) => n.id === nodeId);
      const subgraph = extractOntologyFocusNeighborhood(graph, nodeId);
      const laidOut = layoutOntologyGraph(subgraph);

      setOntologyBrowseMode("focus");
      setOntologySearch("");
      setNodes(toFlowNodes(laidOut, { lite: true, centerId: nodeId }));
      setEdges(toFlowEdges(laidOut, true));
      setGraphReady(true);
      setMessage(
        `Links for ${center?.data.label ?? "type"} — ${laidOut.nodes.length} types, ${laidOut.edges.length} connections.`,
      );
    },
    [setNodes, setEdges],
  );

  const returnToOntologyBrowse = useCallback(() => {
    const graph = fullOntologyGraphRef.current;
    if (!graph) return;

    const laidOut = layoutOntologyBrowseGrid(graph);
    setOntologyBrowseMode("all");
    setOntologySearch("");
    setNodes(toFlowNodes(laidOut, { lite: true }));
    setEdges([]);
    setGraphReady(true);
    setMessage(
      `All ${graph.nodes.length} object types — search or double-click a type to explore its links.`,
    );
  }, [setNodes, setEdges]);

  const openGraphExplorer = useCallback(() => {
    if (!overviewGraph) return;
    setCanvasMode("explorer");
    setMessage("");
  }, [overviewGraph]);

  const returnToOntologyOverview = useCallback(() => {
    setCanvasMode("overview");
    setOntologyCanvasMode(null);
    setOntologyBrowseMode("all");
    setOntologySearch("");
    setNodes([]);
    setEdges([]);
    setGraphReady(false);
    setMessage("");
  }, [setNodes, setEdges]);

  const exportOntologyGexf = useCallback(
    async (graph: ArchitectureGraph) => {
      setExportingGexf(true);
      setMessage("");
      try {
        const content = serializeOntologyGexf(graph);
        const bytes = gexfToBytes(content);

        const dest = await saveDialog({
          title: "Export ontology graph",
          defaultPath: `${projectSlug}-ontology.gexf`,
          filters: [{ name: "GEXF graph", extensions: ["gexf"] }],
        });
        if (!dest) return;

        await api.writeBytesAbsolute(dest, bytes);
        setMessage(`GEXF exported to ${dest} — open in Gephi or Cytoscape.`);
      } catch (e) {
        setMessage(String(e));
      } finally {
        setExportingGexf(false);
      }
    },
    [projectSlug],
  );

  useEffect(() => {
    if (ontologyCanvasMode !== "full" || ontologyBrowseMode !== "all") return;
    const graph = fullOntologyGraphRef.current;
    if (!graph) return;

    const matches = filterOntologyNodesBySearch(graph, ontologySearch);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          dimmed: matches ? !matches.has(n.id) : false,
        },
      })),
    );
  }, [ontologySearch, ontologyCanvasMode, ontologyBrowseMode, setNodes]);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (ontologyCanvasMode === "full" && ontologyBrowseMode === "all") {
        showOntologyFocus(node.id);
      }
    },
    [ontologyCanvasMode, ontologyBrowseMode, showOntologyFocus],
  );

  const typeById = useMemo(
    () => new Map(resolvedTypes.map((t) => [t.id, t])),
    [resolvedTypes],
  );

  const selectedOntologyConnectionCount = useMemo(() => {
    if (!selectedNode || ontologyCanvasMode !== "full") return 0;
    const graph = fullOntologyGraphRef.current;
    if (!graph) return 0;
    return countOntologyNodeConnections(graph, selectedNode.id);
  }, [selectedNode, ontologyCanvasMode]);

  const refreshDelivery = useCallback(async () => {
    const board = await loadDeliveryBoard(projectPath);
    setDeliveryByNodeId(deliveryStatusByArchNodeId(board));
  }, [projectPath]);

  const refreshOntologyGraph = useCallback(async () => {
    setRefreshingOntology(true);
    try {
      const elements = await loadOntologyElements(projectPath);
      const conn = await loadFoundryConnection(projectPath);
      if (!conn?.ontologyRid || !conn.token) {
        setMessage("Connect to Foundry and select an ontology on the Ontology tab first.");
        return;
      }
      const client = createFoundryClient(conn);
      const ontologyRid = conn.ontologyRid;
      const result = await refreshOntologyArchitectureGraph(projectPath, elements, async () =>
        fetchOntologyMetadata(client, ontologyRid),
      );
      if (conn.ontologyRid) {
        await saveImportedOntologyRid(projectPath, conn.ontologyRid);
      }
      const graph = await loadArchitectureGraph(projectPath, "ontology");
      if (graph) {
        const normalized = dedupeOntologyGraph(graph);
        setOverviewGraph(normalized);
        if (isLargeOntologyGraph(normalized)) {
          setCanvasMode("overview");
          setNodes([]);
          setEdges([]);
          setGraphReady(false);
        } else {
          applyGraphToCanvas(normalized, true);
        }
      }
      setMessage(
        `Ontology graph refreshed — ${result.nodesAdded} nodes, ${result.edgesAdded} connections`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to refresh ontology graph");
    } finally {
      setRefreshingOntology(false);
    }
  }, [projectPath, setNodes, setEdges, applyGraphToCanvas]);

  useEffect(() => {
    loadProjectStackUrl(projectPath).then(setStackUrl);
    loadResolvedArchNodeTypes().then(setResolvedTypes);
    refreshDelivery();
  }, [projectPath, refreshDelivery]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    async function loadGraph() {
      setGraphLoading(true);
      setGraphReady(false);

      if (!deliveryLinked) {
        const stale = await isOntologyImportStale(projectPath);
        if (stale) {
          if (!cancelled) {
            setOverviewGraph(null);
            setCanvasMode("canvas");
            setNodes([]);
            setEdges([]);
            setGraphLoading(false);
            loadedPathRef.current = jsonPath;
            setMessage(
              "Selected ontology has not been imported yet — import on the Ontology tab first.",
            );
          }
          return;
        }
      }

      try {
        if (deliveryLinked) {
          await pruneOrphanDeliveryArchitectureNodes(projectPath);
        }
        const g = deliveryLinked
          ? (await loadArchitectureGraph(projectPath, "working")) ?? { nodes: [], edges: [] }
          : dedupeOntologyGraph(await api.readJson<ArchitectureGraph>(jsonPath));
        if (cancelled) return;

        loadedPathRef.current = jsonPath;

        if (!deliveryLinked && isLargeOntologyGraph(g)) {
          setOverviewGraph(g);
          setCanvasMode("overview");
          setNodes([]);
          setEdges([]);
          setGraphReady(false);
          setMessage(
            `Ontology has ${g.nodes.length} object types — use the index below or preview a subset on the canvas.`,
          );
        } else {
          setOverviewGraph(null);
          applyGraphToCanvas(g, !deliveryLinked);
          if (selectedNodeId) {
            const flowNodes = toFlowNodes(g);
            const restoredNode = flowNodes.find((n) => n.id === selectedNodeId);
            if (restoredNode) {
              setSelectedNodeState(restoredNode);
            } else {
              setSelectedNodeIdInternal(null);
              try {
                localStorage.removeItem(getArchNodeStorageKey(projectPath));
              } catch {
                // localStorage unavailable
              }
            }
          }
        }
      } catch {
        if (cancelled) return;
        setOverviewGraph(null);
        setCanvasMode("canvas");
        if (deliveryLinked) {
          applyGraphToCanvas(defaultGraph, false);
        } else {
          setNodes([]);
          setEdges([]);
        }
      } finally {
        if (!cancelled) setGraphLoading(false);
      }
    }

    void loadGraph();
    return () => {
      cancelled = true;
    };
  }, [visible, projectPath, jsonPath, deliveryLinked, applyGraphToCanvas]);

  const changeArchitectureView = useCallback(
    (viewId: ArchitectureViewId) => {
      setArchitectureView(viewId);
      storeArchitectureView(projectPath, viewId);
      setSelectedNode(null);
      setSelectedEdge(null);
      setMessage("");
      setOverviewGraph(null);
      setCanvasMode("canvas");
      loadedPathRef.current = null;
    },
    [projectPath, setSelectedNode],
  );

  useEffect(() => {
    if (initialSelectedNodeId && nodes.length > 0 && !initialNodeHandled) {
      const node = nodes.find((n) => n.id === initialSelectedNodeId);
      if (node) {
        setSelectedNode(node);
        setInitialNodeHandled(true);
      }
    }
  }, [initialSelectedNodeId, nodes, initialNodeHandled]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${Date.now()}`,
            animated: true,
            style: { stroke: "#64748b" },
            labelStyle: { fill: "#94a3b8", fontSize: 11 },
            labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
            labelBgPadding: [4, 6],
            labelBgBorderRadius: 4,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNode(selNodes.length === 1 ? selNodes[0] : null);
      setSelectedEdge(selNodes.length === 0 && selEdges.length === 1 ? selEdges[0] : null);
    },
    [setSelectedNode],
  );

  useEscapeKey(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, Boolean(selectedNode || selectedEdge));

  const updateNodeField = useCallback(
    (nodeId: string, field: "foundryLink" | "notes", value: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n)),
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [field]: value } });
      }
    },
    [setNodes, selectedNode, setSelectedNode],
  );

  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, label: label || undefined } : e)),
      );
      setSelectedEdge((current) =>
        current?.id === edgeId ? { ...current, label: label || undefined } : current,
      );
    },
    [setEdges],
  );

  const addNode = (type: string) => {
    const id = `n${Date.now()}`;
    const meta = typeById.get(type);
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "arch",
        position: { x: 100 + nds.length * 30, y: 100 + nds.length * 40 },
        data: { label: meta?.label ?? type, nodeType: type },
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const graph = fromFlow(nodes, edges);
      if (deliveryLinked) {
        const previousGraph = await loadArchitectureGraph(projectPath, "working");
        const previousIds = new Set(previousGraph?.nodes.map((n) => n.id) ?? []);
        const nextIds = new Set(graph.nodes.map((n) => n.id));
        const removedNodeIds = [...previousIds].filter((id) => !nextIds.has(id));
        if (removedNodeIds.length) {
          await removeDeliveryCardsForArchitectureNodes(projectPath, removedNodeIds);
        }
      }
      await saveArchitectureGraph(projectPath, graph, architectureView);
      if (deliveryLinked) {
        await api.writeFile(overviewPath, generateDesignOverviewMermaid(graph, resolvedTypes));
        await refreshDelivery();
      }
      setMessage(
        deliveryLinked
          ? "Saved — architecture.json and design-overview.md updated."
          : `Saved — ${viewDef.label} (${viewDef.path}).`,
      );
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  };

  const syncDelivery = async () => {
    setSyncing(true);
    setMessage("");
    try {
      if (nodes.length) {
        const graph = fromFlow(nodes, edges);
        await api.writeJson(jsonPath, graph);
      }
      const result = await syncArchitectureAndDelivery(projectPath);
      setNodes(toFlowNodes(result.graph));
      setEdges(toFlowEdges(result.graph));
      setDeliveryByNodeId(deliveryStatusByArchNodeId(result.board));
      const parts: string[] = [];
      if (result.archPruned) parts.push(`${result.archPruned} stale diagram node(s) removed`);
      if (result.archAdded) parts.push(`${result.archAdded} diagram node(s) added`);
      if (result.archLinked) parts.push(`${result.archLinked} linked on diagram`);
      if (result.deliveryAdded) parts.push(`${result.deliveryAdded} board card(s) added`);
      if (result.deliveryUpdated) parts.push(`${result.deliveryUpdated} board card(s) updated`);
      setMessage(
        parts.length
          ? `Synced with delivery board — ${parts.join(", ")}.`
          : "Already in sync with delivery board.",
      );
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSyncing(false);
    }
  };

  const capturePngDataUrl = async (): Promise<string> => {
    if (nodes.length === 0) {
      throw new Error("Add at least one node before exporting.");
    }

    const viewportEl = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewportEl) {
      throw new Error("Could not find diagram viewport.");
    }

    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(
      nodesBounds,
      IMAGE_WIDTH,
      IMAGE_HEIGHT,
      0.5,
      2,
      0.12,
    );

    return toPng(viewportEl, {
      backgroundColor: "#020617",
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        width: `${IMAGE_WIDTH}px`,
        height: `${IMAGE_HEIGHT}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    });
  };

  const exportPng = async () => {
    setExporting(true);
    setMessage("");
    try {
      const dataUrl = await capturePngDataUrl();
      const bytes = dataUrlToBytes(dataUrl);

      const dest = await saveDialog({
        title: "Save architecture diagram",
        defaultPath: `${projectSlug}-architecture.png`,
        filters: [{ name: "PNG image", extensions: ["png"] }],
      });
      if (!dest) return;

      await api.writeBytesAbsolute(dest, bytes);
      setMessage(`PNG exported to ${dest}`);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setExporting(false);
    }
  };

  const savePngToProject = async () => {
    setExporting(true);
    setMessage("");
    try {
      const dataUrl = await capturePngDataUrl();
      const bytes = dataUrlToBytes(dataUrl);
      await api.writeBinary(pngPath, bytes);
      setMessage(`PNG saved to ${pngPath}`);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setExporting(false);
    }
  };

  const selectedNodeType = selectedNode
    ? typeById.get(String(selectedNode.data.nodeType))
    : undefined;
  const selectedDelivery = selectedNode ? deliveryByNodeId.get(selectedNode.id) ?? null : null;
  const linkPlaceholder =
    selectedNode && supportsFoundryLink(String(selectedNode.data.nodeType))
      ? foundryLinkPlaceholder(String(selectedNode.data.nodeType) as Parameters<typeof foundryLinkPlaceholder>[0])
      : "Foundry URL or RID";

  const contextValue: ArchEditorContextValue = {
    stackUrl,
    typeById,
    deliveryByNodeId: deliveryLinked ? deliveryByNodeId : new Map(),
    onOpenDelivery,
  };

  return (
    <ArchEditorContext.Provider value={contextValue}>
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-end gap-3 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
          <div className="min-w-[12rem]">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-muted">
              Diagram
            </label>
            <select
              value={architectureView}
              onChange={(e) => changeArchitectureView(e.target.value as ArchitectureViewId)}
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
          {!deliveryLinked && (
            <FoundryOntologySelect
              projectPath={projectPath}
              onChange={() => {
                setNodes([]);
                setEdges([]);
                setGraphReady(false);
                setMessage(
                  "Ontology changed — import on the Ontology tab, then use Refresh graph links.",
                );
              }}
              className="min-w-[12rem]"
            />
          )}
          <ProjectFoundryStackField
            projectPath={projectPath}
            value={stackUrl}
            onChange={setStackUrl}
            compact
          />
        </div>
        {deliveryLinked && (
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
          <span className="mr-2 text-sm text-fg-secondary">Add:</span>
          {resolvedTypes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => addNode(n.id)}
              className="rounded-lg border border-surface-border-strong px-3 py-1.5 text-xs text-fg-body hover:border-surface-border-strong hover:text-fg-primary"
              style={{ borderLeftWidth: 3, borderLeftColor: n.hexColor }}
            >
              {n.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap gap-2">
            <SecondaryButton onClick={syncDelivery} disabled={syncing}>
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync with delivery board"}
              </span>
            </SecondaryButton>
            <SecondaryButton onClick={savePngToProject} disabled={exporting || nodes.length === 0}>
              <span className="inline-flex items-center gap-1.5">
                <ImageDown size={14} />
                {exporting ? "Exporting…" : "Save PNG to project"}
              </span>
            </SecondaryButton>
            <SecondaryButton onClick={exportPng} disabled={exporting || nodes.length === 0}>
              <span className="inline-flex items-center gap-1.5">
                <ImageDown size={14} />
                Export PNG…
              </span>
            </SecondaryButton>
            <SecondaryButton onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save diagram"}
            </SecondaryButton>
          </div>
        </div>
        )}
        {!deliveryLinked && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
          {ontologyCanvasMode === "preview" && overviewGraph && (
            <div className="mr-auto">
              <SecondaryButton onClick={returnToOntologyOverview}>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowLeft size={14} /> Back to index
                </span>
              </SecondaryButton>
            </div>
          )}
          {ontologyCanvasMode === "full" && (
            <>
              {ontologyBrowseMode === "focus" ? (
                <SecondaryButton onClick={returnToOntologyBrowse}>
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
                    onChange={(e) => setOntologySearch(e.target.value)}
                    placeholder="Filter object types…"
                    className="w-full rounded-lg border border-surface-border bg-surface-base py-1.5 pl-8 pr-3 text-sm text-fg-primary"
                  />
                </div>
              )}
              <SecondaryButton onClick={openGraphExplorer} disabled={!overviewGraph}>
                Graph explorer
              </SecondaryButton>
            </>
          )}
          <SecondaryButton onClick={refreshOntologyGraph} disabled={refreshingOntology}>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw size={14} className={refreshingOntology ? "animate-spin" : ""} />
              {refreshingOntology ? "Refreshing…" : "Refresh graph links"}
            </span>
          </SecondaryButton>
          <SecondaryButton
            onClick={() => overviewGraph && void exportOntologyGexf(overviewGraph)}
            disabled={exportingGexf || !overviewGraph}
          >
            <span className="inline-flex items-center gap-1.5">
              <Download size={14} />
              {exportingGexf ? "Exporting…" : "Export GEXF…"}
            </span>
          </SecondaryButton>
          <SecondaryButton onClick={exportPng} disabled={exporting || nodes.length === 0}>
            <span className="inline-flex items-center gap-1.5">
              <ImageDown size={14} />
              Export PNG…
            </span>
          </SecondaryButton>
          <SecondaryButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save layout"}
          </SecondaryButton>
        </div>
        )}
        {message && (
          <div className="border-b border-surface-border bg-surface-raised/30 px-4 py-2 text-sm text-brand-300">
            {message}
          </div>
        )}
        <div className="flex min-h-0 flex-1">
          <div className="min-h-0 min-w-0 flex-1">
            {!visible ? null : graphLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-fg-muted">
                Loading diagram…
              </div>
            ) : canvasMode === "overview" && overviewGraph ? (
              <OntologyGraphOverview
                graph={overviewGraph}
                onOpenExplorer={openGraphExplorer}
                onOpenPreview={() => applyGraphToCanvas(overviewGraph, true)}
                onLoadFullGraph={() => void loadFullOntologyToCanvas(overviewGraph)}
                onExportGexf={() => void exportOntologyGexf(overviewGraph)}
                loadingFullGraph={ontologyPrepareProgress !== null}
                exportingGexf={exportingGexf}
                onOpenWorkingView={() => changeArchitectureView("working")}
              />
            ) : canvasMode === "explorer" && overviewGraph ? (
              <OntologySigmaExplorer
                graph={overviewGraph}
                onBack={returnToOntologyOverview}
                onExportGexf={() => void exportOntologyGexf(overviewGraph)}
                exportingGexf={exportingGexf}
              />
            ) : (
              <div className="relative h-full min-h-0">
                {ontologyPrepareProgress && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-base/90 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-raised p-6 shadow-xl">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-fg-primary">Loading ontology browser</p>
                        <span className="rounded-full bg-brand-900/50 px-2 py-0.5 text-xs font-medium text-brand-300">
                          {ontologyPrepareProgress.phaseLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-fg-secondary">{ontologyPrepareProgress.detail}</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-base">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-200"
                          style={{
                            width: `${
                              ontologyPrepareProgress.total > 0
                                ? Math.round(
                                    (ontologyPrepareProgress.current / ontologyPrepareProgress.total) *
                                      100,
                                  )
                                : ontologyPrepareProgress.phase === "layout"
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
                )}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                onlyRenderVisibleElements={
                  ontologyCanvasMode === "full" || nodes.length > LARGE_GRAPH_NODES
                }
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
                    wideOverview={
                      ontologyCanvasMode === "full" && ontologyBrowseMode === "all"
                    }
                  />
                )}
                <Background color="#334155" gap={20} />
                <Controls className="!bg-surface-raised !border-surface-border-strong" />
                {ontologyCanvasMode !== "full" &&
                  nodes.length <= LARGE_GRAPH_NODES &&
                  nodes.length > 0 && (
                  <MiniMap className="!bg-surface-raised" />
                )}
              </ReactFlow>
              </div>
            )}
          </div>
          {canvasMode === "canvas" && selectedNode ? (
            <ArchNodeDetailsPanel
              node={selectedNode}
              stackUrl={stackUrl}
              linkable={selectedNodeType?.linkable ?? false}
              linkPlaceholder={linkPlaceholder}
              deliveryCard={selectedDelivery}
              onUpdateLink={(nodeId, v) => updateNodeField(nodeId, "foundryLink", v)}
              onUpdateNotes={(nodeId, v) => updateNodeField(nodeId, "notes", v)}
              onOpenDelivery={onOpenDelivery}
              onOpenFoundry={async () => {
                try {
                  await openFoundryLink(stackUrl, String(selectedNode.data.foundryLink || ""), api.openUrl);
                } catch (e) {
                  alert(String(e));
                }
              }}
              onClose={() => setSelectedNode(null)}
              ontologyConnectionCount={
                ontologyCanvasMode === "full" ? selectedOntologyConnectionCount : undefined
              }
              onShowOntologyLinks={
                ontologyCanvasMode === "full" && ontologyBrowseMode === "all"
                  ? () => showOntologyFocus(selectedNode.id)
                  : undefined
              }
            />
          ) : canvasMode === "canvas" && selectedEdge ? (
            <EdgeDetailsPanel
              edge={selectedEdge}
              onUpdateLabel={updateEdgeLabel}
              onClose={() => setSelectedEdge(null)}
            />
          ) : null}
        </div>
        <p className="border-t border-surface-border px-4 py-2 text-xs text-fg-muted">
          {deliveryLinked
            ? "Drag nodes to arrange. Double-click to rename. Select a node for notes and Foundry links, or an edge to add a label. Use Sync to keep the diagram and delivery board aligned both ways."
            : ontologyCanvasMode === "full"
              ? ontologyBrowseMode === "focus"
                ? "Focused link view — use Back to all types to return to the full browse grid."
                : "Browse all object types — double-click a type (or use Show links in the panel) to see its connections."
              : ontologyCanvasMode === "preview"
                ? "Preview of the most connected object types — use Back to index for the full list or Graph explorer."
                : "Foundry ontology reference — object types and their links. Functions and actions stay on the Ontology tab only."}
        </p>
      </div>
    </ArchEditorContext.Provider>
  );
}

export function ArchitectureEditor(props: ArchitectureEditorProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureEditorInner {...props} />
    </ReactFlowProvider>
  );
}
