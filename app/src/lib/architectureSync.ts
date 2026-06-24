import type { ArchitectureGraph, DeliveryBoard, DeliveryCard, OntologyElement } from "../types";
import { api } from "./api";
import {
  archNodeTypeIdForDeliveryType,
  deliveryTypeIdForArchNode,
  loadArchitectureNodeTypes,
} from "./architectureNodeTypes";
import { findOntologyElementType, loadOntologyElementTypes } from "./ontologyTypes";
import {
  loadDeliveryBoard,
  newDeliveryId,
  saveDeliveryBoard,
} from "./deliveryBoard";

export interface SyncFromArchitectureResult {
  board: DeliveryBoard;
  added: number;
  updated: number;
}

function architecturePath(projectPath: string) {
  return `${projectPath}/02-design/architecture.json`;
}

export async function loadArchitectureGraph(
  projectPath: string,
): Promise<ArchitectureGraph | null> {
  try {
    return await api.readJson<ArchitectureGraph>(architecturePath(projectPath));
  } catch {
    return null;
  }
}

export async function saveArchitectureGraph(
  projectPath: string,
  graph: ArchitectureGraph,
): Promise<void> {
  await api.writeJson(architecturePath(projectPath), graph);
}

function cardFromArchNode(
  node: ArchitectureGraph["nodes"][0],
  deliveryTypeId: string,
): Omit<DeliveryCard, "id"> {
  const now = new Date().toISOString();
  return {
    title: node.data.label || node.type,
    type: deliveryTypeId,
    status: "backlog",
    owner: "",
    architectureNodeId: node.id,
    designRef: "02-design/architecture.json",
    resourceId: node.data.foundryLink || "",
    notes: node.data.notes || "",
    createdAt: now,
    updatedAt: now,
  };
}

function findLegacyCard(
  board: DeliveryBoard,
  node: ArchitectureGraph["nodes"][0],
  deliveryTypeId: string,
): DeliveryCard | undefined {
  return board.cards.find(
    (c) =>
      !c.architectureNodeId &&
      c.type === deliveryTypeId &&
      c.title.trim().toLowerCase() === (node.data.label || "").trim().toLowerCase(),
  );
}

export interface SyncToArchitectureResult {
  graph: ArchitectureGraph;
  added: number;
  linked: number;
}

export interface SyncBidirectionalResult {
  board: DeliveryBoard;
  graph: ArchitectureGraph;
  deliveryAdded: number;
  deliveryUpdated: number;
  archAdded: number;
  archLinked: number;
}

function defaultNodePosition(index: number): { x: number; y: number } {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 80 + col * 200, y: 80 + row * 120 };
}

function nodeFromDeliveryCard(
  card: DeliveryCard,
  archNodeTypeId: string,
  index: number,
): ArchitectureGraph["nodes"][0] {
  const data: ArchitectureGraph["nodes"][0]["data"] = {
    label: card.title,
  };
  if (card.notes?.trim()) data.notes = card.notes.trim();
  if (card.resourceId?.trim()) data.foundryLink = card.resourceId.trim();
  return {
    id: `del-${card.id}`,
    type: archNodeTypeId,
    position: defaultNodePosition(index),
    data,
  };
}

function findMatchingArchNode(
  graph: ArchitectureGraph,
  archNodeTypeId: string,
  title: string,
): ArchitectureGraph["nodes"][0] | undefined {
  const normalized = title.trim().toLowerCase();
  return graph.nodes.find(
    (n) =>
      n.type === archNodeTypeId && (n.data.label || "").trim().toLowerCase() === normalized,
  );
}

function pruneEdgesForNodes(
  graph: ArchitectureGraph,
  removedNodeIds: Set<string>,
): ArchitectureGraph["edges"] {
  return graph.edges.filter(
    (e) => !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target),
  );
}

/** Remove nodes (and connected edges) from architecture.json. Returns count removed. */
export async function removeArchitectureNodes(
  projectPath: string,
  nodeIds: string[],
): Promise<number> {
  const ids = new Set(nodeIds.filter(Boolean));
  if (!ids.size) return 0;

  const graph = await loadArchitectureGraph(projectPath);
  if (!graph) return 0;

  const before = graph.nodes.length;
  graph.nodes = graph.nodes.filter((n) => !ids.has(n.id));
  graph.edges = pruneEdgesForNodes(graph, ids);
  const removed = before - graph.nodes.length;
  if (removed > 0) {
    await saveArchitectureGraph(projectPath, graph);
  }
  return removed;
}

/** Remove delivery cards linked to deleted architecture nodes. */
export async function removeDeliveryCardsForArchitectureNodes(
  projectPath: string,
  nodeIds: string[],
): Promise<number> {
  const ids = new Set(nodeIds.filter(Boolean));
  if (!ids.size) return 0;

  const board = await loadDeliveryBoard(projectPath);
  const cards = board.cards.filter(
    (c) => !c.architectureNodeId || !ids.has(c.architectureNodeId),
  );
  const removed = board.cards.length - cards.length;
  if (removed > 0) {
    await saveDeliveryBoard(projectPath, { cards });
  }
  return removed;
}

/** When a delivery card is deleted, remove its linked diagram node(s). */
export async function removeArchitectureForDeliveryCard(
  projectPath: string,
  card: DeliveryCard,
): Promise<number> {
  const nodeIds = [`del-${card.id}`, card.architectureNodeId].filter(Boolean) as string[];
  return removeArchitectureNodes(projectPath, nodeIds);
}

/** Create or link architecture nodes for delivery cards missing a diagram node. */
export async function syncToArchitecture(
  projectPath: string,
): Promise<SyncToArchitectureResult> {
  const board = await loadDeliveryBoard(projectPath);
  const graph = (await loadArchitectureGraph(projectPath)) ?? { nodes: [], edges: [] };
  const archTypes = await loadArchitectureNodeTypes();
  const cards = [...board.cards];

  let added = 0;
  let linked = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const archNodeTypeId = archNodeTypeIdForDeliveryType(archTypes, card.type);
    if (!archNodeTypeId) continue;

    if (card.architectureNodeId) {
      const linkedNode = graph.nodes.find((n) => n.id === card.architectureNodeId);
      if (linkedNode) continue;
    }

    const matched = findMatchingArchNode(graph, archNodeTypeId, card.title);
    if (matched) {
      if (card.architectureNodeId !== matched.id) {
        cards[i] = {
          ...card,
          architectureNodeId: matched.id,
          updatedAt: new Date().toISOString(),
        };
        linked += 1;
      }
      continue;
    }

    const node = nodeFromDeliveryCard(card, archNodeTypeId, graph.nodes.length);
    graph.nodes.push(node);
    cards[i] = {
      ...card,
      architectureNodeId: node.id,
      designRef: card.designRef || "02-design/architecture.json",
      updatedAt: new Date().toISOString(),
    };
    added += 1;
  }

  if (added > 0 || linked > 0) {
    await saveArchitectureGraph(projectPath, graph);
    await saveDeliveryBoard(projectPath, { cards });
  }

  return { graph, added, linked };
}

export async function syncArchitectureAndDelivery(
  projectPath: string,
): Promise<SyncBidirectionalResult> {
  const toArch = await syncToArchitecture(projectPath);
  const fromArch = await syncFromArchitecture(projectPath);
  const graph = (await loadArchitectureGraph(projectPath)) ?? toArch.graph;
  return {
    board: fromArch.board,
    graph,
    deliveryAdded: fromArch.added,
    deliveryUpdated: fromArch.updated,
    archAdded: toArch.added,
    archLinked: toArch.linked,
  };
}

export async function syncFromArchitecture(
  projectPath: string,
): Promise<SyncFromArchitectureResult> {
  const board = await loadDeliveryBoard(projectPath);
  const graph = await loadArchitectureGraph(projectPath);
  if (!graph?.nodes?.length) {
    return { board, added: 0, updated: 0 };
  }

  const archTypes = await loadArchitectureNodeTypes();
  const graphNodeIds = new Set(graph.nodes.map((n) => n.id));
  let cards = board.cards.filter(
    (c) => !c.architectureNodeId || graphNodeIds.has(c.architectureNodeId),
  );
  const byArchId = new Map(
    cards.filter((c) => c.architectureNodeId).map((c) => [c.architectureNodeId!, c]),
  );

  let added = 0;
  let updated = 0;

  for (const node of graph.nodes) {
    const deliveryTypeId = deliveryTypeIdForArchNode(archTypes, node.type);
    if (!deliveryTypeId) continue;

    const existing =
      byArchId.get(node.id) ?? findLegacyCard(board, node, deliveryTypeId);

    if (existing) {
      const idx = cards.findIndex((c) => c.id === existing.id);
      if (idx === -1) continue;
      const next: DeliveryCard = {
        ...cards[idx],
        architectureNodeId: node.id,
        title: node.data.label || cards[idx].title,
        type: deliveryTypeId,
        resourceId: node.data.foundryLink || cards[idx].resourceId || "",
        notes: node.data.notes ?? cards[idx].notes,
        designRef: cards[idx].designRef || "02-design/architecture.json",
        updatedAt: new Date().toISOString(),
      };
      if (JSON.stringify(next) !== JSON.stringify(cards[idx])) {
        cards[idx] = next;
        updated += 1;
      }
      byArchId.set(node.id, next);
      continue;
    }

    const card: DeliveryCard = {
      id: newDeliveryId(),
      ...cardFromArchNode(node, deliveryTypeId),
    };
    cards.push(card);
    byArchId.set(node.id, card);
    added += 1;
  }

  const nextBoard = { cards };
  const pruned = board.cards.length - cards.length;
  if (added > 0 || updated > 0 || pruned > 0) {
    await saveDeliveryBoard(projectPath, nextBoard);
  }
  return { board: nextBoard, added, updated };
}

/** @deprecated Use syncFromArchitecture — kept for first-load auto seed */
export async function seedFromArchitecture(projectPath: string): Promise<DeliveryBoard> {
  const board = await loadDeliveryBoard(projectPath);
  if (board.cards.length > 0) return board;
  const result = await syncFromArchitecture(projectPath);
  return result.board;
}

export async function addOntologyElementToDiagram(
  projectPath: string,
  element: OntologyElement,
): Promise<{ nodeId: string; created: boolean; skipped?: boolean }> {
  const elementTypes = await loadOntologyElementTypes();
  const typeDef = findOntologyElementType(elementTypes, element.kind);
  const archNodeType = typeDef?.architectureNodeTypeId;

  if (!archNodeType) {
    return { nodeId: "", created: false, skipped: true };
  }

  const graph = (await loadArchitectureGraph(projectPath)) ?? { nodes: [], edges: [] };

  const existing = graph.nodes.find(
    (n) =>
      n.data.ontologyElementId === element.id ||
      n.data.ontologyObjectId === element.id,
  );
  if (existing) {
    return { nodeId: existing.id, created: false };
  }

  const nodeId = `ont-${element.id}`;
  const yOffset = graph.nodes.length * 40;
  const notes = buildOntologyElementNotes(element, typeDef);

  graph.nodes.push({
    id: nodeId,
    type: archNodeType,
    position: { x: 120 + graph.nodes.length * 24, y: 200 + yOffset },
    data: {
      label: element.name,
      notes: notes || undefined,
      ontologyElementId: element.id,
    },
  });

  await saveArchitectureGraph(projectPath, graph);
  return { nodeId, created: true };
}

/** @deprecated Use addOntologyElementToDiagram */
export const addOntologyObjectToDiagram = addOntologyElementToDiagram;

function buildOntologyElementNotes(
  element: OntologyElement,
  typeDef: ReturnType<typeof findOntologyElementType>,
): string {
  const lines = [element.description];
  if (typeDef?.showPrimaryKey && element.primaryKey) {
    lines.push(`Primary key: ${element.primaryKey}`);
  }
  if (typeDef?.showLinkEndpoints && (element.linkFrom || element.linkTo)) {
    lines.push(`Link: ${element.linkFrom || "—"} → ${element.linkTo || "—"}`);
  }
  if (typeDef?.showTargetObject && element.targetObject) {
    lines.push(`Target object: ${element.targetObject}`);
  }
  if (typeDef?.showProperties && element.properties.length) {
    lines.push(`Properties: ${element.properties.join(", ")}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function deliveryStatusByArchNodeId(
  board: DeliveryBoard,
): Map<string, DeliveryCard> {
  const map = new Map<string, DeliveryCard>();
  for (const card of board.cards) {
    if (card.architectureNodeId) {
      map.set(card.architectureNodeId, card);
    }
  }
  return map;
}
