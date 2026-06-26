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
import { ExternalLink, ImageDown, Link2, RefreshCw } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import {
  deliveryStatusByArchNodeId,
  syncArchitectureAndDelivery,
  loadArchitectureGraph,
  removeDeliveryCardsForArchitectureNodes,
} from "../../lib/architectureSync";
import type { ResolvedArchNodeType } from "../../lib/architectureNodeTypes";
import { loadResolvedArchNodeTypes } from "../../lib/architectureNodeTypes";
import {
  foundryLinkPlaceholder,
  loadProjectStackUrl,
  openFoundryLink,
  supportsFoundryLink,
} from "../../lib/foundryLinks";
import { generateDesignOverviewMermaid } from "../../lib/markdown";
import {
  DELIVERY_STATUS_BADGE,
  DELIVERY_STATUS_LABELS,
  loadDeliveryBoard,
} from "../../lib/deliveryBoard";
import type { ArchitectureGraph, DeliveryCard } from "../../types";
import { SecondaryButton } from "../forms/FormField";
import { SlideOverBackdrop } from "../SlideOverBackdrop";
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
              <span className="truncate">{foundryLink}</span>
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

const nodeTypes = { arch: ArchNode };

function toFlowNodes(graph: ArchitectureGraph): Node[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: "arch",
    position: n.position,
    data: {
      label: n.data.label,
      nodeType: n.type,
      foundryLink: n.data.foundryLink || "",
      notes: n.data.notes || "",
      ontologyElementId: n.data.ontologyElementId || n.data.ontologyObjectId || "",
    },
  }));
}

function toFlowEdges(graph: ArchitectureGraph) {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: "#64748b" },
    labelStyle: { fill: "#94a3b8", fontSize: 11 },
    labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
    labelBgPadding: [4, 6] as [number, number],
    labelBgBorderRadius: 4,
  }));
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
}

function ArchitectureEditorInner({ projectPath, onOpenDelivery }: ArchitectureEditorProps) {
  const jsonPath = `${projectPath}/02-design/architecture.json`;
  const overviewPath = `${projectPath}/02-design/design-overview.md`;
  const pngPath = `${projectPath}/02-design/architecture.png`;
  const projectSlug = projectPath.split("/").pop() || "architecture";

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [resolvedTypes, setResolvedTypes] = useState<ResolvedArchNodeType[]>([]);
  const [deliveryByNodeId, setDeliveryByNodeId] = useState<Map<string, DeliveryCard>>(new Map());
  const [stackUrl, setStackUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

  const typeById = useMemo(
    () => new Map(resolvedTypes.map((t) => [t.id, t])),
    [resolvedTypes],
  );

  const refreshDelivery = useCallback(async () => {
    const board = await loadDeliveryBoard(projectPath);
    setDeliveryByNodeId(deliveryStatusByArchNodeId(board));
  }, [projectPath]);

  useEffect(() => {
    loadProjectStackUrl(projectPath).then(setStackUrl);
    loadResolvedArchNodeTypes().then(setResolvedTypes);
    refreshDelivery();
  }, [projectPath, refreshDelivery]);

  useEffect(() => {
    api
      .readJson<ArchitectureGraph>(jsonPath)
      .then((g) => {
        setNodes(toFlowNodes(g));
        setEdges(toFlowEdges(g));
      })
      .catch(() => {
        setNodes(toFlowNodes(defaultGraph));
        setEdges(toFlowEdges(defaultGraph));
      });
  }, [projectPath, jsonPath, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${Date.now()}`,
            animated: false,
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
    [],
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
      setSelectedNode((current) =>
        current?.id === nodeId ? { ...current, data: { ...current.data, [field]: value } } : current,
      );
    },
    [setNodes],
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
      const previousGraph = await loadArchitectureGraph(projectPath);
      const graph = fromFlow(nodes, edges);
      const previousIds = new Set(previousGraph?.nodes.map((n) => n.id) ?? []);
      const nextIds = new Set(graph.nodes.map((n) => n.id));
      const removedNodeIds = [...previousIds].filter((id) => !nextIds.has(id));
      if (removedNodeIds.length) {
        await removeDeliveryCardsForArchitectureNodes(projectPath, removedNodeIds);
      }
      await api.writeJson(jsonPath, graph);
      await api.writeFile(overviewPath, generateDesignOverviewMermaid(graph, resolvedTypes));
      if (removedNodeIds.length) {
        await refreshDelivery();
      }
      setMessage("Saved — architecture.json and design-overview.md updated.");
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

  const contextValue = useMemo<ArchEditorContextValue>(
    () => ({
      stackUrl,
      typeById,
      deliveryByNodeId,
      onOpenDelivery,
    }),
    [stackUrl, typeById, deliveryByNodeId, onOpenDelivery],
  );

  return (
    <ArchEditorContext.Provider value={contextValue}>
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-end gap-3 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
          <ProjectFoundryStackField
            projectPath={projectPath}
            value={stackUrl}
            onChange={setStackUrl}
            compact
          />
        </div>
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
        {message && (
          <div className="border-b border-surface-border bg-surface-raised/30 px-4 py-2 text-sm text-brand-300">
            {message}
          </div>
        )}
        <div className="flex min-h-0 flex-1">
          <div className="min-h-0 min-w-0 flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              zoomOnScroll={false}
              panOnScroll
              fitView
              className="bg-surface-base"
            >
              <Background color="#334155" gap={20} />
              <Controls className="!bg-surface-raised !border-surface-border-strong" />
              <MiniMap className="!bg-surface-raised" />
            </ReactFlow>
          </div>
          {(selectedNode || selectedEdge) && (
            <SlideOverBackdrop
              onClose={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
              }}
            />
          )}
          {selectedNode ? (
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
            />
          ) : selectedEdge ? (
            <EdgeDetailsPanel
              edge={selectedEdge}
              onUpdateLabel={updateEdgeLabel}
              onClose={() => setSelectedEdge(null)}
            />
          ) : null}
        </div>
        <p className="border-t border-surface-border px-4 py-2 text-xs text-fg-muted">
          Drag nodes to arrange. Double-click to rename. Select a node for notes and Foundry links,
          or an edge to add a label. Use Sync to keep the diagram and delivery board aligned both ways.
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
