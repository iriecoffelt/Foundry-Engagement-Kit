import { describe, it, expect } from "vitest";
import type { ArchitectureGraph } from "../../types";

import { layoutOntologyGraph, countObjectTypeEdges } from "../ontologyGraphLayout";

function createObjectNodes(count: number): ArchitectureGraph["nodes"] {
  return Array.from({ length: count }, (_, i) => ({
    id: `obj-${i}`,
    type: "objectType" as const,
    position: { x: 0, y: 0 },
    data: { label: `Object ${i}` },
  }));
}

function createLinearEdges(nodeCount: number): ArchitectureGraph["edges"] {
  return Array.from({ length: nodeCount - 1 }, (_, i) => ({
    id: `edge-${i}`,
    source: `obj-${i}`,
    target: `obj-${i + 1}`,
    label: `link-${i}`,
  }));
}

function createDenseEdges(nodeCount: number): ArchitectureGraph["edges"] {
  const edges: ArchitectureGraph["edges"] = [];
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < Math.min(i + 4, nodeCount); j++) {
      edges.push({
        id: `edge-${i}-${j}`,
        source: `obj-${i}`,
        target: `obj-${j}`,
      });
    }
  }
  return edges;
}

describe("layoutOntologyGraph", () => {
  describe("basic layout", () => {
    it("positions nodes with valid coordinates", () => {
      const nodes = createObjectNodes(5);
      const edges = createLinearEdges(5);
      const graph: ArchitectureGraph = { nodes, edges };

      const result = layoutOntologyGraph(graph);

      result.nodes.forEach((node) => {
        expect(typeof node.position.x).toBe("number");
        expect(typeof node.position.y).toBe("number");
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
      });
    });

    it("preserves node data during layout", () => {
      const nodes = createObjectNodes(3);
      nodes[0].data = { label: "Test Label", notes: "Some notes", foundryLink: "ri.test" };
      const graph: ArchitectureGraph = { nodes, edges: createLinearEdges(3) };

      const result = layoutOntologyGraph(graph);

      const layoutedNode = result.nodes.find((n) => n.id === "obj-0");
      expect(layoutedNode?.data.label).toBe("Test Label");
      expect(layoutedNode?.data.notes).toBe("Some notes");
      expect(layoutedNode?.data.foundryLink).toBe("ri.test");
    });

    it("preserves edge data during layout", () => {
      const graph: ArchitectureGraph = {
        nodes: createObjectNodes(3),
        edges: [
          { id: "e1", source: "obj-0", target: "obj-1", label: "connects" },
          { id: "e2", source: "obj-1", target: "obj-2" },
        ],
      };

      const result = layoutOntologyGraph(graph);

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].label).toBe("connects");
      expect(result.edges[1].label).toBeUndefined();
    });

    it("returns graph unchanged when no object type nodes", () => {
      const graph: ArchitectureGraph = {
        nodes: [
          { id: "pipeline-1", type: "pipeline", position: { x: 50, y: 50 }, data: { label: "P1" } },
        ],
        edges: [],
      };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes[0].position).toEqual({ x: 50, y: 50 });
    });

    it("preserves non-objectType nodes in original positions", () => {
      const graph: ArchitectureGraph = {
        nodes: [
          { id: "obj-0", type: "objectType", position: { x: 0, y: 0 }, data: { label: "Obj" } },
          { id: "pipeline-1", type: "pipeline", position: { x: 999, y: 888 }, data: { label: "P1" } },
        ],
        edges: [],
      };

      const result = layoutOntologyGraph(graph);

      const pipelineNode = result.nodes.find((n) => n.id === "pipeline-1");
      expect(pipelineNode?.position).toEqual({ x: 999, y: 888 });
    });
  });

  describe("grid fallback for sparse graphs", () => {
    it("uses grid layout when edge count is below threshold", () => {
      const nodeCount = 20;
      const nodes = createObjectNodes(nodeCount);
      const graph: ArchitectureGraph = { nodes, edges: [] };

      const result = layoutOntologyGraph(graph);

      const positions = result.nodes.map((n) => n.position);
      expect(positions.some((p) => p.x >= 64)).toBe(true);
      expect(positions.some((p) => p.y >= 64)).toBe(true);
    });

    it("grid layout arranges nodes in columns", () => {
      const nodes = createObjectNodes(12);
      const graph: ArchitectureGraph = { nodes, edges: [] };

      const result = layoutOntologyGraph(graph);

      const xPositions = new Set(result.nodes.map((n) => n.position.x));
      expect(xPositions.size).toBeLessThanOrEqual(6);
    });

    it("uses dagre when edge density is sufficient", () => {
      const nodes = createObjectNodes(10);
      const edges = createDenseEdges(10);
      const graph: ArchitectureGraph = { nodes, edges };

      const result = layoutOntologyGraph(graph);

      const positions = result.nodes.map((n) => `${n.position.x},${n.position.y}`);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(nodes.length);
    });
  });

  describe("large graph handling (>150 nodes)", () => {
    it("uses compact grid for large graphs", () => {
      const nodeCount = 160;
      const nodes = createObjectNodes(nodeCount);
      const edges = createLinearEdges(nodeCount);
      const graph: ArchitectureGraph = { nodes, edges };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(nodeCount);
      result.nodes.forEach((node) => {
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
      });
    });

    it("large graph uses more columns than normal grid", () => {
      const largeGraph: ArchitectureGraph = {
        nodes: createObjectNodes(160),
        edges: createLinearEdges(160),
      };
      const smallGraph: ArchitectureGraph = {
        nodes: createObjectNodes(20),
        edges: [],
      };

      const largeResult = layoutOntologyGraph(largeGraph);
      const smallResult = layoutOntologyGraph(smallGraph);

      const largeXPositions = new Set(largeResult.nodes.map((n) => n.position.x));
      const smallXPositions = new Set(smallResult.nodes.map((n) => n.position.x));
      expect(largeXPositions.size).toBeGreaterThan(smallXPositions.size);
    });

    it("handles exactly 150 nodes with dagre if edges sufficient", () => {
      const nodes = createObjectNodes(150);
      const edges = createDenseEdges(150);
      const graph: ArchitectureGraph = { nodes, edges };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(150);
    });

    it("handles 151 nodes with grid layout", () => {
      const nodes = createObjectNodes(151);
      const edges = createDenseEdges(151);
      const graph: ArchitectureGraph = { nodes, edges };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(151);
    });
  });

  describe("edge cases", () => {
    it("handles empty graph", () => {
      const graph: ArchitectureGraph = { nodes: [], edges: [] };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it("handles single node", () => {
      const graph: ArchitectureGraph = {
        nodes: [{ id: "obj-0", type: "objectType", position: { x: 0, y: 0 }, data: { label: "Only" } }],
        edges: [],
      };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(1);
      expect(Number.isFinite(result.nodes[0].position.x)).toBe(true);
    });

    it("handles edges referencing non-existent nodes", () => {
      const graph: ArchitectureGraph = {
        nodes: createObjectNodes(3),
        edges: [
          { id: "e1", source: "obj-0", target: "obj-1" },
          { id: "e2", source: "obj-0", target: "missing" },
          { id: "e3", source: "missing", target: "obj-2" },
        ],
      };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(3);
    });

    it("handles self-referencing edges", () => {
      const graph: ArchitectureGraph = {
        nodes: createObjectNodes(2),
        edges: [
          { id: "e1", source: "obj-0", target: "obj-0" },
          { id: "e2", source: "obj-0", target: "obj-1" },
        ],
      };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(2);
    });

    it("handles duplicate edges", () => {
      const graph: ArchitectureGraph = {
        nodes: createObjectNodes(2),
        edges: [
          { id: "e1", source: "obj-0", target: "obj-1" },
          { id: "e2", source: "obj-0", target: "obj-1" },
        ],
      };

      const result = layoutOntologyGraph(graph);

      expect(result.nodes).toHaveLength(2);
    });
  });
});

describe("countObjectTypeEdges", () => {
  it("counts edges between objectType nodes", () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: "obj-1", type: "objectType", position: { x: 0, y: 0 }, data: { label: "A" } },
        { id: "obj-2", type: "objectType", position: { x: 0, y: 0 }, data: { label: "B" } },
        { id: "obj-3", type: "objectType", position: { x: 0, y: 0 }, data: { label: "C" } },
      ],
      edges: [
        { id: "e1", source: "obj-1", target: "obj-2" },
        { id: "e2", source: "obj-2", target: "obj-3" },
      ],
    };

    const count = countObjectTypeEdges(graph);

    expect(count).toBe(2);
  });

  it("excludes edges to non-objectType nodes", () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: "obj-1", type: "objectType", position: { x: 0, y: 0 }, data: { label: "A" } },
        { id: "obj-2", type: "objectType", position: { x: 0, y: 0 }, data: { label: "B" } },
        { id: "pipeline", type: "pipeline", position: { x: 0, y: 0 }, data: { label: "P" } },
      ],
      edges: [
        { id: "e1", source: "obj-1", target: "obj-2" },
        { id: "e2", source: "obj-1", target: "pipeline" },
        { id: "e3", source: "pipeline", target: "obj-2" },
      ],
    };

    const count = countObjectTypeEdges(graph);

    expect(count).toBe(1);
  });

  it("returns 0 for empty graph", () => {
    const graph: ArchitectureGraph = { nodes: [], edges: [] };

    const count = countObjectTypeEdges(graph);

    expect(count).toBe(0);
  });

  it("returns 0 when no objectType nodes", () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: "p1", type: "pipeline", position: { x: 0, y: 0 }, data: { label: "P1" } },
        { id: "p2", type: "pipeline", position: { x: 0, y: 0 }, data: { label: "P2" } },
      ],
      edges: [{ id: "e1", source: "p1", target: "p2" }],
    };

    const count = countObjectTypeEdges(graph);

    expect(count).toBe(0);
  });

  it("returns 0 when objectType nodes have no edges", () => {
    const graph: ArchitectureGraph = {
      nodes: createObjectNodes(5),
      edges: [],
    };

    const count = countObjectTypeEdges(graph);

    expect(count).toBe(0);
  });

  it("handles edges referencing missing nodes", () => {
    const graph: ArchitectureGraph = {
      nodes: createObjectNodes(2),
      edges: [
        { id: "e1", source: "obj-0", target: "obj-1" },
        { id: "e2", source: "obj-0", target: "missing" },
      ],
    };

    const count = countObjectTypeEdges(graph);

    expect(count).toBe(1);
  });
});
