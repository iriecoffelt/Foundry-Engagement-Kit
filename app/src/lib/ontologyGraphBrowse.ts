import type { ArchitectureGraph } from "../types";

const BROWSE_COLS = 20;
const BROWSE_GAP_X = 168;
const BROWSE_GAP_Y = 52;

function buildAdjacency(graph: ArchitectureGraph): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  return adjacency;
}

/** Alphabetical grid — no edges, readable at a glance. */
export function layoutOntologyBrowseGrid(graph: ArchitectureGraph): ArchitectureGraph {
  const objectNodes = graph.nodes
    .filter((n) => n.type === "objectType")
    .sort((a, b) => a.data.label.localeCompare(b.data.label));

  const positioned = new Map<string, { x: number; y: number }>();
  objectNodes.forEach((node, index) => {
    const col = index % BROWSE_COLS;
    const row = Math.floor(index / BROWSE_COLS);
    positioned.set(node.id, {
      x: 48 + col * BROWSE_GAP_X,
      y: 48 + row * BROWSE_GAP_Y,
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

export function countOntologyNodeConnections(graph: ArchitectureGraph, nodeId: string): number {
  return graph.edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
}

/** 1-hop neighborhood around a type — small enough to lay out with readable links. */
export function extractOntologyFocusNeighborhood(
  graph: ArchitectureGraph,
  centerId: string,
  maxNodes = 56,
): ArchitectureGraph {
  const adjacency = buildAdjacency(graph);
  const degree = new Map<string, number>();
  for (const node of graph.nodes) {
    degree.set(node.id, adjacency.get(node.id)?.size ?? 0);
  }

  const keepIds = new Set<string>([centerId]);
  const neighbors = [...(adjacency.get(centerId) ?? [])].sort(
    (a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0),
  );

  for (const neighborId of neighbors) {
    if (keepIds.size >= maxNodes) break;
    keepIds.add(neighborId);
  }

  const nodes = graph.nodes.filter((n) => keepIds.has(n.id));
  const edges = graph.edges.filter(
    (e) => keepIds.has(e.source) && keepIds.has(e.target),
  );

  return { nodes, edges };
}

export function filterOntologyNodesBySearch(
  graph: ArchitectureGraph,
  query: string,
): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const matches = new Set<string>();
  for (const node of graph.nodes) {
    if (
      node.data.label.toLowerCase().includes(q) ||
      String(node.data.foundryLink || "").toLowerCase().includes(q)
    ) {
      matches.add(node.id);
    }
  }
  return matches;
}
