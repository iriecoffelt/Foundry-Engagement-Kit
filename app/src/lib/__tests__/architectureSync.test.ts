import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ArchitectureGraph, DeliveryBoard, OntologyElement } from "../../types";

vi.mock("../api", () => ({
  api: {
    readJson: vi.fn(),
    writeJson: vi.fn(),
  },
}));

vi.mock("../architectureNodeTypes", () => ({
  loadArchitectureNodeTypes: vi.fn().mockResolvedValue([
    { id: "pipeline", deliveryTypeId: "pipeline" },
    { id: "dataset", deliveryTypeId: "dataset" },
    { id: "objectType", deliveryTypeId: "objectType" },
  ]),
  archNodeTypeIdForDeliveryType: vi.fn((_, type) => {
    const map: Record<string, string> = {
      pipeline: "pipeline",
      dataset: "dataset",
      objectType: "objectType",
    };
    return map[type];
  }),
  deliveryTypeIdForArchNode: vi.fn((_, type) => {
    const map: Record<string, string> = {
      pipeline: "pipeline",
      dataset: "dataset",
      objectType: "objectType",
    };
    return map[type];
  }),
}));

vi.mock("../ontologyTypes", () => ({
  loadOntologyElementTypes: vi.fn().mockResolvedValue([
    { id: "objectType", architectureNodeTypeId: "objectType" },
  ]),
  findOntologyElementType: vi.fn((_, kind) => {
    if (kind === "objectType") return { id: "objectType", architectureNodeTypeId: "objectType" };
    return null;
  }),
}));

vi.mock("../foundrySync", () => ({
  extractOntologyLinkEdges: vi.fn().mockReturnValue([]),
}));

import { api } from "../api";
import {
  loadArchitectureGraph,
  saveArchitectureGraph,
  syncFromArchitecture,
  syncToArchitecture,
  syncArchitectureAndDelivery,
  deliveryStatusByArchNodeId,
  pruneOrphanDeliveryArchitectureNodes,
  removeArchitectureNodes,
  addOntologyElementToDiagram,
} from "../architectureSync";

const mockApi = api as unknown as {
  readJson: ReturnType<typeof vi.fn>;
  writeJson: ReturnType<typeof vi.fn>;
};

const sampleArchGraph: ArchitectureGraph = {
  nodes: [
    {
      id: "node-1",
      type: "pipeline",
      position: { x: 100, y: 100 },
      data: { label: "Orders Pipeline", notes: "Main pipeline", foundryLink: "ri.foundry.main.dataset.orders" },
    },
    {
      id: "node-2",
      type: "dataset",
      position: { x: 200, y: 100 },
      data: { label: "Customer Data" },
    },
  ],
  edges: [
    { id: "edge-1", source: "node-1", target: "node-2", label: "feeds" },
  ],
};

const sampleDeliveryBoard: DeliveryBoard = {
  cards: [
    {
      id: "card-1",
      title: "Orders Pipeline",
      type: "pipeline",
      status: "in_dev",
      owner: "Alice",
      architectureNodeId: "node-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "card-2",
      title: "Customer Data",
      type: "dataset",
      status: "backlog",
      owner: "Bob",
      architectureNodeId: "node-2",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadArchitectureGraph", () => {
  it("loads and returns architecture graph from JSON", async () => {
    mockApi.readJson.mockResolvedValueOnce(sampleArchGraph);

    const result = await loadArchitectureGraph("/projects/test");

    expect(mockApi.readJson).toHaveBeenCalledWith(
      "/projects/test/02-design/architecture.json",
    );
    expect(result).toEqual(sampleArchGraph);
  });

  it("loads ontology view when specified", async () => {
    mockApi.readJson.mockResolvedValueOnce(sampleArchGraph);

    await loadArchitectureGraph("/projects/test", "ontology");

    expect(mockApi.readJson).toHaveBeenCalledWith(
      "/projects/test/02-design/ontology-architecture.json",
    );
  });

  it("returns null when file does not exist", async () => {
    mockApi.readJson.mockRejectedValueOnce(new Error("File not found"));

    const result = await loadArchitectureGraph("/projects/test");

    expect(result).toBeNull();
  });

  it("returns null on parse error", async () => {
    mockApi.readJson.mockRejectedValueOnce(new Error("Invalid JSON"));

    const result = await loadArchitectureGraph("/projects/test");

    expect(result).toBeNull();
  });
});

describe("saveArchitectureGraph", () => {
  it("saves architecture graph to JSON file", async () => {
    mockApi.writeJson.mockResolvedValueOnce(undefined);

    await saveArchitectureGraph("/projects/test", sampleArchGraph);

    expect(mockApi.writeJson).toHaveBeenCalledWith(
      "/projects/test/02-design/architecture.json",
      sampleArchGraph,
    );
  });

  it("saves to ontology view when specified", async () => {
    mockApi.writeJson.mockResolvedValueOnce(undefined);

    await saveArchitectureGraph("/projects/test", sampleArchGraph, "ontology");

    expect(mockApi.writeJson).toHaveBeenCalledWith(
      "/projects/test/02-design/ontology-architecture.json",
      sampleArchGraph,
    );
  });
});

describe("syncFromArchitecture", () => {
  it("creates delivery cards for new architecture nodes", async () => {
    mockApi.readJson
      .mockResolvedValueOnce({ cards: [] })
      .mockResolvedValueOnce(sampleArchGraph);
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await syncFromArchitecture("/projects/test");

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.board.cards).toHaveLength(2);
    expect(result.board.cards[0].architectureNodeId).toBe("node-1");
    expect(result.board.cards[0].title).toBe("Orders Pipeline");
  });

  it("updates existing cards when architecture node changes", async () => {
    const existingBoard: DeliveryBoard = {
      cards: [
        {
          id: "card-1",
          title: "Old Title",
          type: "pipeline",
          status: "backlog",
          owner: "",
          architectureNodeId: "node-1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    };

    mockApi.readJson
      .mockResolvedValueOnce(existingBoard)
      .mockResolvedValueOnce({
        nodes: [
          {
            id: "node-1",
            type: "pipeline",
            position: { x: 100, y: 100 },
            data: { label: "New Title", foundryLink: "ri.new.link" },
          },
        ],
        edges: [],
      });
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await syncFromArchitecture("/projects/test");

    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.board.cards[0].title).toBe("New Title");
  });

  it("returns unchanged board when no architecture graph exists", async () => {
    mockApi.readJson
      .mockResolvedValueOnce({ cards: [] })
      .mockResolvedValueOnce(null);

    const result = await syncFromArchitecture("/projects/test");

    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.board.cards).toHaveLength(0);
  });

  it("prunes cards for deleted architecture nodes", async () => {
    const existingBoard: DeliveryBoard = {
      cards: [
        {
          id: "card-1",
          title: "Existing Card",
          type: "pipeline",
          status: "in_dev",
          owner: "Alice",
          architectureNodeId: "deleted-node",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "card-2",
          title: "Valid Card",
          type: "dataset",
          status: "backlog",
          owner: "Bob",
          architectureNodeId: "existing-node",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const graphWithOneNode: ArchitectureGraph = {
      nodes: [
        {
          id: "existing-node",
          type: "dataset",
          position: { x: 100, y: 100 },
          data: { label: "Valid Card" },
        },
      ],
      edges: [],
    };

    mockApi.readJson
      .mockResolvedValueOnce(existingBoard)
      .mockResolvedValueOnce(graphWithOneNode);
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await syncFromArchitecture("/projects/test");

    expect(result.board.cards).toHaveLength(1);
    expect(result.board.cards[0].id).toBe("card-2");
  });
});

describe("syncToArchitecture", () => {
  it("creates architecture nodes for delivery cards without nodes", async () => {
    const boardWithoutNodes: DeliveryBoard = {
      cards: [
        {
          id: "card-1",
          title: "New Pipeline",
          type: "pipeline",
          status: "backlog",
          owner: "",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    };

    mockApi.readJson
      .mockResolvedValueOnce(boardWithoutNodes)
      .mockResolvedValueOnce({ nodes: [], edges: [] });
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await syncToArchitecture("/projects/test");

    expect(result.added).toBe(1);
    expect(result.graph.nodes).toHaveLength(1);
    expect(result.graph.nodes[0].data.label).toBe("New Pipeline");
  });

  it("links delivery cards to existing matching nodes", async () => {
    const boardWithoutLink: DeliveryBoard = {
      cards: [
        {
          id: "card-1",
          title: "Orders Pipeline",
          type: "pipeline",
          status: "backlog",
          owner: "",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    };

    mockApi.readJson
      .mockResolvedValueOnce(boardWithoutLink)
      .mockResolvedValueOnce(sampleArchGraph);
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await syncToArchitecture("/projects/test");

    expect(result.linked).toBe(1);
    expect(result.added).toBe(0);
  });

  it("skips cards that already have valid architecture nodes", async () => {
    mockApi.readJson
      .mockResolvedValueOnce(sampleDeliveryBoard)
      .mockResolvedValueOnce(sampleArchGraph);
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await syncToArchitecture("/projects/test");

    expect(result.added).toBe(0);
    expect(result.linked).toBe(0);
  });
});

describe("syncArchitectureAndDelivery", () => {
  it("performs bidirectional sync", async () => {
    mockApi.readJson
      .mockResolvedValueOnce(sampleDeliveryBoard)
      .mockResolvedValueOnce(sampleArchGraph)
      .mockResolvedValueOnce(sampleDeliveryBoard)
      .mockResolvedValueOnce(sampleArchGraph)
      .mockResolvedValueOnce(sampleDeliveryBoard)
      .mockResolvedValueOnce(sampleArchGraph)
      .mockResolvedValueOnce(sampleArchGraph);
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await syncArchitectureAndDelivery("/projects/test");

    expect(result).toHaveProperty("board");
    expect(result).toHaveProperty("graph");
    expect(result).toHaveProperty("deliveryAdded");
    expect(result).toHaveProperty("deliveryUpdated");
    expect(result).toHaveProperty("archAdded");
    expect(result).toHaveProperty("archLinked");
    expect(result).toHaveProperty("archPruned");
  });
});

describe("deliveryStatusByArchNodeId", () => {
  it("creates a map of architecture node IDs to delivery cards", () => {
    const result = deliveryStatusByArchNodeId(sampleDeliveryBoard);

    expect(result.size).toBe(2);
    expect(result.get("node-1")).toEqual(sampleDeliveryBoard.cards[0]);
    expect(result.get("node-2")).toEqual(sampleDeliveryBoard.cards[1]);
  });

  it("handles cards without architecture node IDs", () => {
    const boardWithMissing: DeliveryBoard = {
      cards: [
        {
          id: "card-1",
          title: "No Link",
          type: "pipeline",
          status: "backlog",
          owner: "",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "card-2",
          title: "With Link",
          type: "dataset",
          status: "in_dev",
          owner: "",
          architectureNodeId: "node-2",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const result = deliveryStatusByArchNodeId(boardWithMissing);

    expect(result.size).toBe(1);
    expect(result.has("node-2")).toBe(true);
  });

  it("returns empty map for empty board", () => {
    const result = deliveryStatusByArchNodeId({ cards: [] });

    expect(result.size).toBe(0);
  });
});

describe("pruneOrphanDeliveryArchitectureNodes", () => {
  it("removes nodes prefixed with del- when card no longer exists", async () => {
    const graphWithOrphan: ArchitectureGraph = {
      nodes: [
        {
          id: "del-card-1",
          type: "pipeline",
          position: { x: 100, y: 100 },
          data: { label: "Orphan" },
        },
        {
          id: "del-card-2",
          type: "dataset",
          position: { x: 200, y: 100 },
          data: { label: "Valid" },
        },
      ],
      edges: [],
    };

    const boardWithOneCard: DeliveryBoard = {
      cards: [
        {
          id: "card-2",
          title: "Valid",
          type: "dataset",
          status: "backlog",
          owner: "",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    };

    mockApi.readJson
      .mockResolvedValueOnce(boardWithOneCard)
      .mockResolvedValueOnce(graphWithOrphan)
      .mockResolvedValueOnce(graphWithOrphan);
    mockApi.writeJson.mockResolvedValue(undefined);

    const removed = await pruneOrphanDeliveryArchitectureNodes("/projects/test");

    expect(removed).toBe(1);
  });

  it("preserves ontology nodes during pruning", async () => {
    const graphWithOntology: ArchitectureGraph = {
      nodes: [
        {
          id: "ont-element-1",
          type: "objectType",
          position: { x: 100, y: 100 },
          data: { label: "Order", ontologyElementId: "element-1" },
        },
        {
          id: "del-deleted-card",
          type: "pipeline",
          position: { x: 200, y: 100 },
          data: { label: "Orphan" },
        },
      ],
      edges: [],
    };

    mockApi.readJson
      .mockResolvedValueOnce({ cards: [] })
      .mockResolvedValueOnce(graphWithOntology)
      .mockResolvedValueOnce(graphWithOntology);
    mockApi.writeJson.mockResolvedValue(undefined);

    const removed = await pruneOrphanDeliveryArchitectureNodes("/projects/test");

    expect(removed).toBe(1);
    const writtenGraph = mockApi.writeJson.mock.calls[0][1] as ArchitectureGraph;
    expect(writtenGraph.nodes.some((n) => n.id === "ont-element-1")).toBe(true);
  });

  it("returns 0 when no graph exists", async () => {
    mockApi.readJson
      .mockResolvedValueOnce({ cards: [] })
      .mockResolvedValueOnce(null);

    const removed = await pruneOrphanDeliveryArchitectureNodes("/projects/test");

    expect(removed).toBe(0);
  });
});

describe("removeArchitectureNodes", () => {
  it("removes specified nodes and connected edges from graph", async () => {
    mockApi.readJson.mockResolvedValueOnce(sampleArchGraph);
    mockApi.writeJson.mockResolvedValueOnce(undefined);

    const removed = await removeArchitectureNodes("/projects/test", ["node-1"]);

    expect(removed).toBe(1);
    expect(mockApi.writeJson).toHaveBeenCalledTimes(1);
    const writtenGraph = mockApi.writeJson.mock.calls[0][1] as ArchitectureGraph;
    expect(writtenGraph.nodes).toHaveLength(1);
    expect(writtenGraph.nodes[0].id).toBe("node-2");
    expect(writtenGraph.edges).toHaveLength(0);
  });

  it("returns 0 for empty node IDs", async () => {
    const removed = await removeArchitectureNodes("/projects/test", []);

    expect(removed).toBe(0);
    expect(mockApi.readJson).not.toHaveBeenCalled();
  });

  it("returns 0 when graph does not exist", async () => {
    mockApi.readJson.mockResolvedValueOnce(null);

    const removed = await removeArchitectureNodes("/projects/test", ["node-1"]);

    expect(removed).toBe(0);
  });
});

describe("addOntologyElementToDiagram", () => {
  const sampleElement: OntologyElement = {
    id: "element-1",
    kind: "objectType",
    name: "Order",
    description: "An order object",
    properties: ["orderId", "status"],
    primaryKey: "orderId",
    foundryRid: "ri.ontology.main.object.order",
  };

  it("creates a new node for ontology element", async () => {
    mockApi.readJson.mockResolvedValueOnce({ nodes: [], edges: [] });
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await addOntologyElementToDiagram("/projects/test", sampleElement);

    expect(result.created).toBe(true);
    expect(result.nodeId).toBe("ont-element-1");
    expect(mockApi.writeJson).toHaveBeenCalled();
    const writtenGraph = mockApi.writeJson.mock.calls[0][1] as ArchitectureGraph;
    expect(writtenGraph.nodes).toHaveLength(1);
    expect(writtenGraph.nodes[0].data.ontologyElementId).toBe("element-1");
  });

  it("returns existing node when element already on diagram", async () => {
    const existingGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "ont-element-1",
          type: "objectType",
          position: { x: 100, y: 100 },
          data: { label: "Order", ontologyElementId: "element-1" },
        },
      ],
      edges: [],
    };

    mockApi.readJson.mockResolvedValueOnce(existingGraph);
    mockApi.writeJson.mockResolvedValue(undefined);

    const result = await addOntologyElementToDiagram("/projects/test", sampleElement);

    expect(result.created).toBe(false);
    expect(result.nodeId).toBe("ont-element-1");
  });

  it("skips elements without architectureNodeTypeId", async () => {
    const nonDiagramElement: OntologyElement = {
      id: "element-2",
      kind: "linkType",
      name: "OrderToCustomer",
      description: "Links orders to customers",
      properties: [],
      linkFrom: "Order",
      linkTo: "Customer",
    };

    const result = await addOntologyElementToDiagram("/projects/test", nonDiagramElement);

    expect(result.skipped).toBe(true);
    expect(result.created).toBe(false);
    expect(mockApi.readJson).not.toHaveBeenCalled();
  });
});
