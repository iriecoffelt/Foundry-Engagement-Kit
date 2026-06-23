import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Database, GitBranch, Layers, Monitor, Server, User } from "lucide-react";
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

function ArchNode({ data }: NodeProps) {
  const meta = NODE_TYPES.find((n) => n.type === data.nodeType) || NODE_TYPES[0];
  const Icon = meta.icon;
  return (
    <div
      className="min-w-[140px] rounded-xl border-2 bg-slate-900 px-3 py-2 shadow-lg"
      style={{ borderColor: meta.color }}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: meta.color }} />
        <span className="text-sm font-medium text-white">{data.label as string}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
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

export function ArchitectureEditor({ projectPath }: ArchitectureEditorProps) {
  const jsonPath = `${projectPath}/02-design/architecture.json`;
  const overviewPath = `${projectPath}/02-design/design-overview.md`;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newLabel, setNewLabel] = useState("New node");

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/40 px-4 py-3">
        <span className="mr-2 text-sm text-slate-400">Add:</span>
        {NODE_TYPES.map((n) => (
          <button
            key={n.type}
            type="button"
            onClick={() => addNode(n.type)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white"
          >
            {n.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <SecondaryButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save diagram"}
          </SecondaryButton>
        </div>
      </div>
      {message && (
        <div className="border-b border-slate-800 bg-slate-900/30 px-4 py-2 text-sm text-brand-300">
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
          className="bg-slate-950"
        >
          <Background color="#334155" gap={20} />
          <Controls className="!bg-slate-900 !border-slate-700" />
          <MiniMap className="!bg-slate-900" />
        </ReactFlow>
      </div>
      <p className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
        Drag nodes to arrange. Connect handles to show data flow. Mermaid export:{" "}
        <code className="text-brand-400">02-design/design-overview.md</code>
      </p>
    </div>
  );
}
