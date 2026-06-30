import type { Node } from "@xyflow/react";
import type { ArchitectureGraph } from "../types";
import { layoutOntologyBrowseGrid } from "./ontologyGraphBrowse";

export type OntologyGraphPreparePhase = "layout" | "nodes" | "done";

export interface OntologyGraphPrepareProgress {
  phase: OntologyGraphPreparePhase;
  current: number;
  total: number;
  detail: string;
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => resolve(), { timeout: 120 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/** Lay out all types in a browse grid (no edges). */
export async function prepareOntologyBrowseGraph(
  graph: ArchitectureGraph,
  onProgress?: (progress: OntologyGraphPrepareProgress) => void,
): Promise<ArchitectureGraph> {
  onProgress?.({
    phase: "layout",
    current: 0,
    total: graph.nodes.length,
    detail: `Arranging ${graph.nodes.length} object types…`,
  });
  await yieldToMain();
  const laidOut = layoutOntologyBrowseGrid(graph);
  onProgress?.({
    phase: "layout",
    current: graph.nodes.length,
    total: graph.nodes.length,
    detail: "Layout complete",
  });
  return laidOut;
}

const NODE_CHUNK = 48;

/** Push nodes onto React Flow in chunks — edges are omitted in browse mode. */
export async function hydrateOntologyNodesInChunks(
  flowNodes: Node[],
  setNodes: (nodes: Node[]) => void,
  onProgress?: (progress: OntologyGraphPrepareProgress) => void,
): Promise<void> {
  setNodes([]);

  for (let i = 0; i < flowNodes.length; i += NODE_CHUNK) {
    await yieldToMain();
    const end = Math.min(i + NODE_CHUNK, flowNodes.length);
    setNodes(flowNodes.slice(0, end));
    onProgress?.({
      phase: "nodes",
      current: end,
      total: flowNodes.length,
      detail: `Loading types (${end}/${flowNodes.length})…`,
    });
  }

  onProgress?.({
    phase: "done",
    current: flowNodes.length,
    total: flowNodes.length,
    detail: "Ready — select a type to see its links",
  });
}
