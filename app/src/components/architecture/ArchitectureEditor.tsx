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
import { Database, GitBranch, ImageDown, Layers, Monitor, Server, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { generateDesignOverviewMermaid } from "../../lib/markdown";
import type { ArchNodeType, ArchitectureGraph } from "../../types";
import { SecondaryButton } from "../forms/FormField";

const NODE_TYPES: { type: ArchNodeType; label: string; icon: typeof Server; color: string }[] = [
  { type: "source", label: "Source System", icon: Server, color: "#6366f1" },
  { type: "dataset", label: "Dataset", icon: Database, color: "#0ea5e9" },
  { type: "pipeline", label: "Pipeline", icon: GitBranch, color: "#14b8a6" },
  { type: "objectType", label: "Object Type", icon: Layers, color: "#22c55e" },
  { type: "workshop", label: "Workshop App", icon: Monitor, color: "#f59e0b" },
  { type: "user", label: "User", icon: User, color: "#ec4899" },
];

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;

function ArchNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const meta = NODE_TYPES.find((n) => n.type === data.nodeType) || NODE_TYPES[0];
  const Icon = meta.icon;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(data.label || meta.label));

  const commitLabel = () => {
    const label = draft.trim() || meta.label;
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
    );
    setDraft(label);
    setEditing(false);
  };

  const startEditing = () => {
    setDraft(String(data.label || meta.label));
    setEditing(true);
  };

  return (
    <div
      className={`min-w-[140px] rounded-xl border-2 bg-surface-raised px-3 py-2 shadow-lg ${
        selected ? "ring-2 ring-brand-400/60" : ""
      }`}
      style={{ borderColor: meta.color }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-subtle" />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel();
            if (e.key === "Escape") {
              setDraft(String(data.label || meta.label));
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded border border-surface-border-strong bg-surface-base px-2 py-1 text-sm text-fg-primary outline-none focus:border-brand-500"
        />
      ) : (
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: meta.color }} />
          <span className="text-sm font-medium text-fg-primary">{data.label as string}</span>
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
    data: { label: n.data.label, nodeType: n.type },
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
  }));
}

function fromFlow(nodes: Node[], edges: Edge[]): ArchitectureGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.data.nodeType as ArchNodeType) || "dataset",
      position: n.position,
      data: { label: String(n.data.label || "Node") },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : undefined,
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
}

function ArchitectureEditorInner({ projectPath }: ArchitectureEditorProps) {
  const jsonPath = `${projectPath}/02-design/architecture.json`;
  const overviewPath = `${projectPath}/02-design/design-overview.md`;
  const pngPath = `${projectPath}/02-design/architecture.png`;
  const projectSlug = projectPath.split("/").pop() || "architecture";

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

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
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: "#64748b" } }, eds)),
    [setEdges],
  );

  const addNode = (type: ArchNodeType) => {
    const id = `n${Date.now()}`;
    const meta = NODE_TYPES.find((n) => n.type === type)!;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "arch",
        position: { x: 100 + nds.length * 30, y: 100 + nds.length * 40 },
        data: { label: meta.label, nodeType: type },
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const graph = fromFlow(nodes, edges);
      await api.writeJson(jsonPath, graph);
      await api.writeFile(overviewPath, generateDesignOverviewMermaid(graph));
      setMessage("Saved — architecture.json and design-overview.md updated.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-raised/40 px-4 py-3">
        <span className="mr-2 text-sm text-fg-secondary">Add:</span>
        {NODE_TYPES.map((n) => (
          <button
            key={n.type}
            type="button"
            onClick={() => addNode(n.type)}
            className="rounded-lg border border-surface-border-strong px-3 py-1.5 text-xs text-fg-body hover:border-surface-border-strong hover:text-fg-primary"
          >
            {n.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
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
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-surface-base"
        >
          <Background color="#334155" gap={20} />
          <Controls className="!bg-surface-raised !border-surface-border-strong" />
          <MiniMap className="!bg-surface-raised" />
        </ReactFlow>
      </div>
      <p className="border-t border-surface-border px-4 py-2 text-xs text-fg-muted">
        Drag nodes to arrange. Double-click a node to rename. Click Save diagram to persist changes.
        PNG export for slides; Mermaid via{" "}
        <code className="text-brand-400">02-design/design-overview.md</code>
      </p>
    </div>
  );
}

export function ArchitectureEditor(props: ArchitectureEditorProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureEditorInner {...props} />
    </ReactFlowProvider>
  );
}
