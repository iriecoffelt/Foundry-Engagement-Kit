import type { ArchitectureGraph } from "../types";

/** Above this size, skip React Flow canvas (prevents webview OOM). */
export const ONTOLOGY_CANVAS_MAX_NODES = 50;
export const ONTOLOGY_CANVAS_MAX_EDGES = 80;

/** Collapse duplicate node ids (same Foundry API name imported more than once). */
export function dedupeOntologyGraph(graph: ArchitectureGraph): ArchitectureGraph {
  const nodesById = new Map<string, ArchitectureGraph["nodes"][0]>();

  for (const node of graph.nodes) {
    const existing = nodesById.get(node.id);
    if (!existing) {
      nodesById.set(node.id, { ...node, data: { ...node.data } });
      continue;
    }
    if (!existing.data.foundryLink && node.data.foundryLink) {
      existing.data.foundryLink = node.data.foundryLink;
    }
    if (!existing.data.ontologyElementId && node.data.ontologyElementId) {
      existing.data.ontologyElementId = node.data.ontologyElementId;
    }
  }

  const nodeIds = new Set(nodesById.keys());
  const seenEdges = new Set<string>();
  const edges: ArchitectureGraph["edges"] = [];

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const key = `${edge.source}|${edge.target}|${edge.label ?? ""}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push(edge);
  }

  return { nodes: [...nodesById.values()], edges };
}

export function isLargeOntologyGraph(graph: ArchitectureGraph): boolean {
  const deduped = dedupeOntologyGraph(graph);
  return (
    deduped.nodes.length > ONTOLOGY_CANVAS_MAX_NODES ||
    deduped.edges.length > ONTOLOGY_CANVAS_MAX_EDGES
  );
}

export interface TrimmedOntologyGraph {
  graph: ArchitectureGraph;
  trimmed: boolean;
  totalNodes: number;
  totalEdges: number;
}

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

/** Keep a connected, high-degree subgraph for a readable canvas preview. */
export function trimOntologyGraphForCanvas(graph: ArchitectureGraph): TrimmedOntologyGraph {
  const normalized = dedupeOntologyGraph(graph);
  const totalNodes = normalized.nodes.length;
  const totalEdges = normalized.edges.length;

  if (!isLargeOntologyGraph(normalized)) {
    return { graph: normalized, trimmed: false, totalNodes, totalEdges };
  }

  const adjacency = buildAdjacency(normalized);
  const degree = new Map<string, number>();
  for (const node of normalized.nodes) {
    degree.set(node.id, adjacency.get(node.id)?.size ?? 0);
  }

  const sortedByDegree = [...normalized.nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
  );

  const keepIds = new Set<string>();
  const queue: string[] = [];

  for (const hub of sortedByDegree.slice(0, 3)) {
    if (keepIds.size >= ONTOLOGY_CANVAS_MAX_NODES) break;
    if (!keepIds.has(hub.id)) {
      keepIds.add(hub.id);
      queue.push(hub.id);
    }
  }

  while (queue.length > 0 && keepIds.size < ONTOLOGY_CANVAS_MAX_NODES) {
    const id = queue.shift()!;
    const neighbors = [...(adjacency.get(id) ?? [])].sort(
      (a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0),
    );
    for (const neighborId of neighbors) {
      if (keepIds.size >= ONTOLOGY_CANVAS_MAX_NODES) break;
      if (!keepIds.has(neighborId)) {
        keepIds.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  for (const node of sortedByDegree) {
    if (keepIds.size >= ONTOLOGY_CANVAS_MAX_NODES) break;
    keepIds.add(node.id);
  }

  const nodes = normalized.nodes.filter((n) => keepIds.has(n.id));
  const edges = normalized.edges
    .filter((e) => keepIds.has(e.source) && keepIds.has(e.target))
    .slice(0, ONTOLOGY_CANVAS_MAX_EDGES);

  return {
    graph: { nodes, edges },
    trimmed: true,
    totalNodes,
    totalEdges,
  };
}
