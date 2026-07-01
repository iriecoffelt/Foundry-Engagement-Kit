import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Node } from "@xyflow/react";
import type { ArchitectureGraph } from "../../types";

vi.mock("../ontologyGraphBrowse", () => ({
  layoutOntologyBrowseGrid: vi.fn((graph: ArchitectureGraph) => ({
    ...graph,
    nodes: graph.nodes.map((n, i) => ({
      ...n,
      position: { x: 48 + (i % 20) * 168, y: 48 + Math.floor(i / 20) * 52 },
    })),
  })),
}));

import {
  prepareOntologyBrowseGraph,
  hydrateOntologyNodesInChunks,
  createFetchingProgress,
  createProcessingProgress,
  type OntologyGraphPrepareProgress,
} from "../ontologyGraphPrepare";

beforeEach(() => {
  vi.clearAllMocks();
});

function createSampleGraph(nodeCount: number): ArchitectureGraph {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: "objectType" as const,
    position: { x: 0, y: 0 },
    data: { label: `Object ${i}` },
  }));
  return { nodes, edges: [] };
}

function createSampleFlowNodes(count: number): Node[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: "objectType",
    position: { x: i * 168, y: 0 },
    data: { label: `Object ${i}` },
  }));
}

describe("prepareOntologyBrowseGraph", () => {
  it("applies layout to graph and returns positioned nodes", async () => {
    const graph = createSampleGraph(5);

    const result = await prepareOntologyBrowseGraph(graph);

    expect(result.nodes).toHaveLength(5);
    result.nodes.forEach((node) => {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    });
  });

  it("calls onProgress with layout phase", async () => {
    const graph = createSampleGraph(10);
    const progressCalls: OntologyGraphPrepareProgress[] = [];
    const onProgress = vi.fn((progress) => progressCalls.push({ ...progress }));

    await prepareOntologyBrowseGraph(graph, onProgress);

    expect(onProgress).toHaveBeenCalled();
    const layoutCalls = progressCalls.filter((p) => p.phase === "layout");
    expect(layoutCalls.length).toBeGreaterThanOrEqual(1);
    expect(layoutCalls[0].total).toBe(10);
    expect(layoutCalls[0].phaseLabel).toBe("Building graph");
  });

  it("reports completion progress", async () => {
    const graph = createSampleGraph(3);
    const progressCalls: OntologyGraphPrepareProgress[] = [];
    const onProgress = vi.fn((progress) => progressCalls.push({ ...progress }));

    await prepareOntologyBrowseGraph(graph, onProgress);

    const lastCall = progressCalls[progressCalls.length - 1];
    expect(lastCall.phase).toBe("layout");
    expect(lastCall.current).toBe(3);
    expect(lastCall.total).toBe(3);
  });

  it("handles empty graph", async () => {
    const graph = createSampleGraph(0);

    const result = await prepareOntologyBrowseGraph(graph);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("preserves edge data during layout", async () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: "a", type: "objectType", position: { x: 0, y: 0 }, data: { label: "A" } },
        { id: "b", type: "objectType", position: { x: 0, y: 0 }, data: { label: "B" } },
      ],
      edges: [{ id: "edge-1", source: "a", target: "b", label: "links" }],
    };

    const result = await prepareOntologyBrowseGraph(graph);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toEqual({ id: "edge-1", source: "a", target: "b", label: "links" });
  });

  it("works without onProgress callback", async () => {
    const graph = createSampleGraph(5);

    const result = await prepareOntologyBrowseGraph(graph);

    expect(result.nodes).toHaveLength(5);
  });
});

describe("hydrateOntologyNodesInChunks", () => {
  it("incrementally sets nodes in chunks", async () => {
    const flowNodes = createSampleFlowNodes(100);
    const setNodesCalls: Node[][] = [];
    const setNodes = vi.fn((nodes: Node[]) => setNodesCalls.push([...nodes]));

    await hydrateOntologyNodesInChunks(flowNodes, setNodes);

    expect(setNodes).toHaveBeenCalled();
    expect(setNodesCalls[0]).toHaveLength(0);
    const finalCall = setNodesCalls[setNodesCalls.length - 2];
    expect(finalCall.length).toBeGreaterThan(0);
  });

  it("calls onProgress during hydration", async () => {
    const flowNodes = createSampleFlowNodes(50);
    const setNodes = vi.fn();
    const progressCalls: OntologyGraphPrepareProgress[] = [];
    const onProgress = vi.fn((progress) => progressCalls.push({ ...progress }));

    await hydrateOntologyNodesInChunks(flowNodes, setNodes, onProgress);

    expect(onProgress).toHaveBeenCalled();
    const nodesCalls = progressCalls.filter((p) => p.phase === "nodes");
    expect(nodesCalls.length).toBeGreaterThan(0);
    expect(nodesCalls[0].phaseLabel).toBe("Loading types");
  });

  it("reports done phase when complete", async () => {
    const flowNodes = createSampleFlowNodes(20);
    const setNodes = vi.fn();
    const progressCalls: OntologyGraphPrepareProgress[] = [];
    const onProgress = vi.fn((progress) => progressCalls.push({ ...progress }));

    await hydrateOntologyNodesInChunks(flowNodes, setNodes, onProgress);

    const lastProgress = progressCalls[progressCalls.length - 1];
    expect(lastProgress.phase).toBe("done");
    expect(lastProgress.phaseLabel).toBe("Ready");
    expect(lastProgress.current).toBe(20);
    expect(lastProgress.total).toBe(20);
  });

  it("handles empty node array", async () => {
    const flowNodes: Node[] = [];
    const setNodes = vi.fn();
    const progressCalls: OntologyGraphPrepareProgress[] = [];
    const onProgress = vi.fn((progress) => progressCalls.push({ ...progress }));

    await hydrateOntologyNodesInChunks(flowNodes, setNodes, onProgress);

    expect(setNodes).toHaveBeenCalledWith([]);
    const lastProgress = progressCalls[progressCalls.length - 1];
    expect(lastProgress.phase).toBe("done");
    expect(lastProgress.current).toBe(0);
    expect(lastProgress.total).toBe(0);
  });

  it("processes in chunks of 48 nodes", async () => {
    const flowNodes = createSampleFlowNodes(100);
    const setNodesCalls: number[] = [];
    const setNodes = vi.fn((nodes: Node[]) => setNodesCalls.push(nodes.length));

    await hydrateOntologyNodesInChunks(flowNodes, setNodes);

    expect(setNodesCalls[0]).toBe(0);
    const nonZeroCalls = setNodesCalls.filter((n) => n > 0);
    expect(nonZeroCalls[0]).toBe(48);
    expect(nonZeroCalls[1]).toBe(96);
  });

  it("works without onProgress callback", async () => {
    const flowNodes = createSampleFlowNodes(10);
    const setNodes = vi.fn();

    await hydrateOntologyNodesInChunks(flowNodes, setNodes);

    expect(setNodes).toHaveBeenCalled();
  });
});

describe("createFetchingProgress", () => {
  it("creates progress object for fetching phase", () => {
    const result = createFetchingProgress(5, 10);

    expect(result.phase).toBe("fetching");
    expect(result.current).toBe(5);
    expect(result.total).toBe(10);
    expect(result.phaseLabel).toBe("Fetching metadata");
    expect(result.detail).toBe("Fetching metadata (5/10)…");
  });

  it("handles zero total", () => {
    const result = createFetchingProgress(0, 0);

    expect(result.phase).toBe("fetching");
    expect(result.detail).toBe("Fetching metadata…");
  });

  it("handles progress at beginning", () => {
    const result = createFetchingProgress(0, 100);

    expect(result.current).toBe(0);
    expect(result.total).toBe(100);
    expect(result.detail).toBe("Fetching metadata (0/100)…");
  });

  it("handles progress at end", () => {
    const result = createFetchingProgress(100, 100);

    expect(result.current).toBe(100);
    expect(result.total).toBe(100);
    expect(result.detail).toBe("Fetching metadata (100/100)…");
  });
});

describe("createProcessingProgress", () => {
  it("creates progress object for processing phase", () => {
    const result = createProcessingProgress(3, 8);

    expect(result.phase).toBe("processing");
    expect(result.current).toBe(3);
    expect(result.total).toBe(8);
    expect(result.phaseLabel).toBe("Processing types");
    expect(result.detail).toBe("Processing types (3/8)…");
  });

  it("handles zero values", () => {
    const result = createProcessingProgress(0, 0);

    expect(result.phase).toBe("processing");
    expect(result.current).toBe(0);
    expect(result.total).toBe(0);
    expect(result.detail).toBe("Processing types (0/0)…");
  });

  it("handles large numbers", () => {
    const result = createProcessingProgress(999, 1000);

    expect(result.current).toBe(999);
    expect(result.total).toBe(1000);
    expect(result.detail).toBe("Processing types (999/1000)…");
  });
});

describe("progress callback behavior", () => {
  it("progress callbacks are optional and don't throw when undefined", async () => {
    const graph = createSampleGraph(5);
    const flowNodes = createSampleFlowNodes(10);
    const setNodes = vi.fn();

    await expect(prepareOntologyBrowseGraph(graph, undefined)).resolves.toBeDefined();
    await expect(hydrateOntologyNodesInChunks(flowNodes, setNodes, undefined)).resolves.toBeUndefined();
  });

  it("progress objects have consistent structure", async () => {
    const graph = createSampleGraph(5);
    const progressCalls: OntologyGraphPrepareProgress[] = [];
    const onProgress = vi.fn((progress) => progressCalls.push({ ...progress }));

    await prepareOntologyBrowseGraph(graph, onProgress);

    progressCalls.forEach((progress) => {
      expect(progress).toHaveProperty("phase");
      expect(progress).toHaveProperty("current");
      expect(progress).toHaveProperty("total");
      expect(progress).toHaveProperty("detail");
      expect(progress).toHaveProperty("phaseLabel");
      expect(typeof progress.current).toBe("number");
      expect(typeof progress.total).toBe("number");
      expect(typeof progress.detail).toBe("string");
      expect(typeof progress.phaseLabel).toBe("string");
    });
  });
});
