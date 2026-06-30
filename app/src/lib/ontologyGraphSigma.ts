import Graph from "graphology";
import type { ArchitectureGraph } from "../types";
import { dedupeOntologyGraph } from "./ontologyGraphDisplay";
import { layoutOntologyBrowseGrid } from "./ontologyGraphBrowse";

/** Tuned for dark canvas background. */
export const SIGMA_NODE_COLOR = "#38bdf8";
export const SIGMA_NODE_COLOR_DIM = "#334155";
export const SIGMA_EDGE_COLOR = "#64748b";
export const SIGMA_EDGE_COLOR_FOCUS = "#7dd3fc";
export const SIGMA_EDGE_COLOR_DIM = "#1e293b";

const GRID_SCALE = 0.025;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function architectureToGraphology(graph: ArchitectureGraph): Graph {
  const normalized = dedupeOntologyGraph(graph);
  const g = new Graph({ multi: false, type: "undirected" });
  const objectNodes = normalized.nodes.filter((n) => n.type === "objectType");
  const objectIds = new Set(objectNodes.map((n) => n.id));

  for (const node of objectNodes) {
    if (g.hasNode(node.id)) continue;
    g.addNode(node.id, {
      label: node.data.label,
      foundryLink: node.data.foundryLink || "",
      x: 0,
      y: 0,
      size: 4,
      color: SIGMA_NODE_COLOR,
      baseColor: SIGMA_NODE_COLOR,
      baseSize: 4,
    });
  }

  const seenPairs = new Set<string>();
  for (const edge of normalized.edges) {
    if (!objectIds.has(edge.source) || !objectIds.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    const pairKey = [edge.source, edge.target].sort().join("|");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    if (!g.hasEdge(edge.source, edge.target)) {
      g.addEdge(edge.source, edge.target, {
        label: edge.label || "",
        size: 0.35,
        color: SIGMA_EDGE_COLOR,
        hidden: true,
      });
    }
  }

  g.forEachNode((node) => {
    const degree = g.degree(node);
    const size = Math.max(4, Math.min(16, 4 + Math.sqrt(degree) * 2));
    g.setNodeAttribute(node, "size", size);
    g.setNodeAttribute(node, "baseSize", size);
  });

  return g;
}

function applyGridLayout(g: Graph, archGraph: ArchitectureGraph): void {
  const laidOut = layoutOntologyBrowseGrid(archGraph);
  const positions = new Map(laidOut.nodes.map((n) => [n.id, n.position]));

  g.forEachNode((node) => {
    const pos = positions.get(node);
    if (!pos) return;
    g.setNodeAttribute(node, "x", pos.x * GRID_SCALE);
    g.setNodeAttribute(node, "y", pos.y * GRID_SCALE);
  });
}

/** Grid layout only — instant and stable (no ForceAtlas2 blocking). */
export async function buildSigmaGraphologyGraph(
  archGraph: ArchitectureGraph,
  onProgress?: (detail: string) => void,
): Promise<Graph> {
  onProgress?.("Building graph…");
  await yieldToMain();

  const graph = architectureToGraphology(archGraph);
  applyGridLayout(graph, archGraph);

  onProgress?.(`Ready — ${graph.order} types`);
  return graph;
}

export function applySigmaSearchFilter(
  graph: Graph,
  query: string,
  focusNodeId: string | null,
): void {
  const q = query.trim().toLowerCase();

  if (focusNodeId) {
    applySigmaFocus(graph, focusNodeId);
    if (!q) return;

    graph.forEachNode((node, attrs) => {
      const label = String(attrs.label || "").toLowerCase();
      const match = label.includes(q);
      if (!match && node !== focusNodeId && !graph.neighbors(focusNodeId).includes(node)) {
        graph.setNodeAttribute(node, "color", SIGMA_NODE_COLOR_DIM);
        graph.setNodeAttribute(node, "size", attrs.baseSize * 0.35);
      }
    });
    return;
  }

  graph.forEachNode((node, attrs) => {
    if (!q) {
      graph.setNodeAttribute(node, "hidden", false);
      graph.setNodeAttribute(node, "color", attrs.baseColor);
      graph.setNodeAttribute(node, "size", attrs.baseSize);
      return;
    }
    const label = String(attrs.label || "").toLowerCase();
    const match = label.includes(q);
    graph.setNodeAttribute(node, "hidden", false);
    graph.setNodeAttribute(node, "color", match ? attrs.baseColor : SIGMA_NODE_COLOR_DIM);
    graph.setNodeAttribute(node, "size", match ? attrs.baseSize : attrs.baseSize * 0.45);
  });
}

export function applySigmaFocus(graph: Graph, focusNodeId: string): void {
  const focusSet = new Set<string>([focusNodeId, ...graph.neighbors(focusNodeId)]);

  graph.forEachNode((node, attrs) => {
    const active = focusSet.has(node);
    graph.setNodeAttribute(node, "hidden", false);
    graph.setNodeAttribute(node, "color", active ? attrs.baseColor : SIGMA_NODE_COLOR_DIM);
    graph.setNodeAttribute(
      node,
      "size",
      node === focusNodeId ? attrs.baseSize * 1.35 : active ? attrs.baseSize : attrs.baseSize * 0.4,
    );
  });

  graph.forEachEdge((edge, _attr, source, target) => {
    const active = focusSet.has(source) && focusSet.has(target);
    graph.setEdgeAttribute(edge, "hidden", !active);
    graph.setEdgeAttribute(edge, "color", active ? SIGMA_EDGE_COLOR_FOCUS : SIGMA_EDGE_COLOR_DIM);
    graph.setEdgeAttribute(edge, "size", active ? 1.4 : 0.3);
  });
}

export function clearSigmaFocus(graph: Graph): void {
  graph.forEachNode((node, attrs) => {
    graph.setNodeAttribute(node, "hidden", false);
    graph.setNodeAttribute(node, "color", attrs.baseColor);
    graph.setNodeAttribute(node, "size", attrs.baseSize);
  });

  graph.forEachEdge((edge) => {
    graph.setEdgeAttribute(edge, "hidden", true);
    graph.setEdgeAttribute(edge, "color", SIGMA_EDGE_COLOR);
    graph.setEdgeAttribute(edge, "size", 0.35);
  });
}

export function getGraphNodeLabel(graph: Graph, nodeId: string): string {
  return String(graph.getNodeAttribute(nodeId, "label") || nodeId);
}
