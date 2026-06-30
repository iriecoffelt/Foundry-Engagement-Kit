import dagre from "@dagrejs/dagre";
import type { ArchitectureGraph } from "../types";

/** Match rendered ArchNode size (label + optional RID line). */
const NODE_W = 176;
const NODE_H = 88;
const GRID_COLS = 6;
const GRID_COLS_LARGE = 14;
const GRID_GAP_X = 240;
const GRID_GAP_Y = 130;
const GRID_GAP_X_COMPACT = 168;
const GRID_GAP_Y_COMPACT = 72;

function layoutOntologyGrid(
  graph: ArchitectureGraph,
  objectIds: Set<string>,
  cols = GRID_COLS,
  compact = false,
): ArchitectureGraph {
  const objectNodes = graph.nodes.filter((n) => objectIds.has(n.id));
  const positioned = new Map<string, { x: number; y: number }>();
  const gapX = compact ? GRID_GAP_X_COMPACT : GRID_GAP_X;
  const gapY = compact ? GRID_GAP_Y_COMPACT : GRID_GAP_Y;

  objectNodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positioned.set(node.id, {
      x: 64 + col * gapX,
      y: 64 + row * gapY,
    });
  });

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const pos = positioned.get(node.id);
      return pos ? { ...node, position: pos } : node;
    }),
  };
}

/** Apply left-to-right dagre layout to object-type nodes; grid fallback when sparse. */
export function layoutOntologyGraph(graph: ArchitectureGraph): ArchitectureGraph {
  const objectNodes = graph.nodes.filter((n) => n.type === "objectType");
  if (objectNodes.length === 0) return graph;

  const objectIds = new Set(objectNodes.map((n) => n.id));
  const objectEdges = graph.edges.filter(
    (e) => objectIds.has(e.source) && objectIds.has(e.target),
  );

  // Very large graphs: grid is faster and more predictable than dagre.
  if (objectNodes.length > 150) {
    return layoutOntologyGrid(graph, objectIds, GRID_COLS_LARGE, true);
  }

  // Dagre with zero edges stacks every node in one vertical column — use a grid instead.
  if (objectEdges.length < Math.max(3, Math.floor(objectNodes.length * 0.08))) {
    return layoutOntologyGrid(graph, objectIds);
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "LR",
    align: "UL",
    ranker: "network-simplex",
    nodesep: 56,
    ranksep: 160,
    marginx: 64,
    marginy: 64,
  });

  for (const node of objectNodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }

  for (const edge of objectEdges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positioned = graph.nodes.map((node) => {
    if (!objectIds.has(node.id)) return node;
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    };
  });

  return { ...graph, nodes: positioned };
}

export function countObjectTypeEdges(graph: ArchitectureGraph): number {
  const objectIds = new Set(
    graph.nodes.filter((n) => n.type === "objectType").map((n) => n.id),
  );
  return graph.edges.filter(
    (e) => objectIds.has(e.source) && objectIds.has(e.target),
  ).length;
}
