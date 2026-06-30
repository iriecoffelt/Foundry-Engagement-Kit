import type { ArchitectureGraph, DeliveryBoard, DeliveryCard, OntologyElement } from "../types";
import { api } from "./api";
import {
  type ArchitectureViewId,
  architectureRelativePath,
} from "./architectureViews";
import {
  archNodeTypeIdForDeliveryType,
  deliveryTypeIdForArchNode,
  loadArchitectureNodeTypes,
} from "./architectureNodeTypes";
import { findOntologyElementType, loadOntologyElementTypes } from "./ontologyTypes";
import type { FoundryFullMetadata } from "./foundryTypes";
import { extractOntologyLinkEdges } from "./foundrySync";
import { layoutOntologyGraph } from "./ontologyGraphLayout";
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

function architecturePath(projectPath: string, viewId: ArchitectureViewId = "working"): string {
  return architectureRelativePath(projectPath, viewId);
}

export async function loadArchitectureGraph(
  projectPath: string,
  viewId: ArchitectureViewId = "working",
): Promise<ArchitectureGraph | null> {
  try {
    return await api.readJson<ArchitectureGraph>(architecturePath(projectPath, viewId));
  } catch {
    return null;
  }
}

export async function saveArchitectureGraph(
  projectPath: string,
  graph: ArchitectureGraph,
  viewId: ArchitectureViewId = "working",
): Promise<void> {
  await api.writeJson(architecturePath(projectPath, viewId), graph);
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
  archPruned: number;
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

  const graph = await loadArchitectureGraph(projectPath, "working");
  if (!graph) return 0;

  const before = graph.nodes.length;
  graph.nodes = graph.nodes.filter((n) => !ids.has(n.id));
  graph.edges = pruneEdgesForNodes(graph, ids);
  const removed = before - graph.nodes.length;
  if (removed > 0) {
    await saveArchitectureGraph(projectPath, graph, "working");
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

/**
 * Remove diagram nodes left behind when delivery cards were deleted outside the app
 * (e.g. editing delivery-board.json). Keeps ontology nodes and unsynced manual nodes.
 */
export async function pruneOrphanDeliveryArchitectureNodes(
  projectPath: string,
): Promise<number> {
  const board = await loadDeliveryBoard(projectPath);
  const graph = await loadArchitectureGraph(projectPath, "working");
  if (!graph?.nodes.length) return 0;

  const cardIds = new Set(board.cards.map((c) => c.id));
  const linkedArchIds = new Set(
    board.cards
      .map((c) => c.architectureNodeId)
      .filter((id): id is string => Boolean(id)),
  );

  const removeIds: string[] = [];
  for (const node of graph.nodes) {
    if (node.data.ontologyElementId || node.data.ontologyObjectId) continue;
    if (node.id.startsWith("ont-")) continue;

    if (node.id.startsWith("del-")) {
      const cardId = node.id.slice("del-".length);
      if (!cardIds.has(cardId)) removeIds.push(node.id);
      continue;
    }

    if (linkedArchIds.has(node.id)) continue;
  }

  return removeArchitectureNodes(projectPath, removeIds);
}

/** Create or link architecture nodes for delivery cards missing a diagram node. */
export async function syncToArchitecture(
  projectPath: string,
): Promise<SyncToArchitectureResult> {
  const board = await loadDeliveryBoard(projectPath);
  const graph = (await loadArchitectureGraph(projectPath, "working")) ?? { nodes: [], edges: [] };
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
    await saveArchitectureGraph(projectPath, graph, "working");
    await saveDeliveryBoard(projectPath, { cards });
  }

  return { graph, added, linked };
}

export async function syncArchitectureAndDelivery(
  projectPath: string,
): Promise<SyncBidirectionalResult> {
  const archPruned = await pruneOrphanDeliveryArchitectureNodes(projectPath);
  const toArch = await syncToArchitecture(projectPath);
  const fromArch = await syncFromArchitecture(projectPath);
  const graph = (await loadArchitectureGraph(projectPath, "working")) ?? toArch.graph;
  return {
    board: fromArch.board,
    graph,
    deliveryAdded: fromArch.added,
    deliveryUpdated: fromArch.updated,
    archAdded: toArch.added,
    archLinked: toArch.linked,
    archPruned,
  };
}

export async function syncFromArchitecture(
  projectPath: string,
): Promise<SyncFromArchitectureResult> {
  const board = await loadDeliveryBoard(projectPath);
  const graph = await loadArchitectureGraph(projectPath, "working");
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
): Promise<{ nodeId: string; created: boolean; updated?: boolean; skipped?: boolean }> {
  const elementTypes = await loadOntologyElementTypes();
  const typeDef = findOntologyElementType(elementTypes, element.kind);
  const archNodeType = typeDef?.architectureNodeTypeId;

  if (!archNodeType) {
    return { nodeId: "", created: false, skipped: true };
  }

  const graph = (await loadArchitectureGraph(projectPath, "working")) ?? { nodes: [], edges: [] };
  const notes = buildOntologyElementNotes(element, typeDef);
  const foundryLink = element.foundryRid?.trim() || undefined;
  const nameKey = element.name.trim().toLowerCase();
  const existing = graph.nodes.find(
    (n) =>
      n.data.ontologyElementId === element.id ||
      n.data.ontologyObjectId === element.id ||
      (n.type === archNodeType && n.data.label.trim().toLowerCase() === nameKey),
  );

  if (existing) {
    let changed = false;
    if (!existing.data.ontologyElementId) {
      existing.data.ontologyElementId = element.id;
      changed = true;
    }
    if (foundryLink && existing.data.foundryLink !== foundryLink) {
      existing.data.foundryLink = foundryLink;
      changed = true;
    }
    if (changed) {
      await saveArchitectureGraph(projectPath, graph, "working");
    }
    return { nodeId: existing.id, created: false, updated: changed };
  }

  const nodeId = `ont-${element.id}`;
  graph.nodes.push({
    id: nodeId,
    type: archNodeType,
    position: defaultNodePosition(graph.nodes.length),
    data: {
      label: element.name,
      notes: notes || undefined,
      ontologyElementId: element.id,
      ...(foundryLink ? { foundryLink } : {}),
    },
  });

  await saveArchitectureGraph(projectPath, graph, "working");
  return { nodeId, created: true };
}

/** Rebuild the Foundry ontology reference diagram (separate from the working delivery diagram). */
export async function rebuildOntologyArchitecture(
  projectPath: string,
  elements: OntologyElement[],
  metadata?: FoundryFullMetadata,
): Promise<{ nodesAdded: number; edgesAdded: number }> {
  const graph = buildOntologyArchitectureGraph(elements);
  let edgesAdded = 0;

  if (metadata) {
    edgesAdded = syncOntologyLinkEdgesFromMetadata(graph, elements, metadata);
  }
  edgesAdded += syncOntologyLinkEdges(graph, elements);

  const laidOut = layoutOntologyGraph(graph);
  await saveArchitectureGraph(projectPath, laidOut, "ontology");
  return { nodesAdded: laidOut.nodes.length, edgesAdded: laidOut.edges.length };
}

/** Re-fetch link metadata from Foundry and rebuild the ontology reference graph. */
export async function refreshOntologyArchitectureGraph(
  projectPath: string,
  elements: OntologyElement[],
  fetchMetadata: () => Promise<FoundryFullMetadata | undefined>,
): Promise<{ nodesAdded: number; edgesAdded: number }> {
  const metadata = await fetchMetadata();
  return rebuildOntologyArchitecture(projectPath, elements, metadata);
}

function buildOntologyArchitectureGraph(elements: OntologyElement[]): ArchitectureGraph {
  const objectTypes = elements.filter((el) => el.kind === "objectType");
  const nodesById = new Map<string, ArchitectureGraph["nodes"][0]>();

  for (const el of objectTypes) {
    const apiName = objectTypeApiName(el);
    const id = apiName ? ontologyObjectNodeId(apiName) : `ont-${el.id}`;
    const next = {
      id,
      type: "objectType" as const,
      position: { x: 0, y: 0 },
      data: {
        label: el.name,
        ontologyElementId: el.id,
        ...(el.foundryRid ? { foundryLink: el.foundryRid } : {}),
      },
    };

    const existing = nodesById.get(id);
    if (!existing) {
      nodesById.set(id, next);
      continue;
    }
    if (!existing.data.foundryLink && next.data.foundryLink) {
      existing.data.foundryLink = next.data.foundryLink;
    }
  }

  return { nodes: [...nodesById.values()], edges: [] };
}

/** @deprecated Use rebuildOntologyArchitecture for Foundry imports */
export async function syncOntologyElementsToArchitecture(
  projectPath: string,
  elements: OntologyElement[],
): Promise<{ added: number; updated: number; skipped: number; edgesAdded: number }> {
  const result = await rebuildOntologyArchitecture(projectPath, elements);
  return {
    added: result.nodesAdded,
    updated: 0,
    skipped: 0,
    edgesAdded: result.edgesAdded,
  };
}

/** @deprecated Use addOntologyElementToDiagram */
export const addOntologyObjectToDiagram = addOntologyElementToDiagram;

function normalizeApiKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function isResourceId(value: string): boolean {
  return value.trim().startsWith("ri.");
}

/** Canonical graph node id for a Foundry object type API name. */
export function ontologyObjectNodeId(apiName: string): string {
  return `ont-foundry-obj-${apiName.trim()}`;
}

function objectTypeApiName(element: OntologyElement): string | undefined {
  if (element.foundryApiName?.trim()) return element.foundryApiName.trim();
  if (element.id.startsWith("foundry-obj-")) {
    return element.id.slice("foundry-obj-".length);
  }
  return undefined;
}

function buildObjectTypeNodeIndex(
  graph: ArchitectureGraph,
  elements: OntologyElement[],
): { apiIndex: Map<string, string>; displayIndex: Map<string, string> } {
  const apiIndex = new Map<string, string>();
  const displayIndex = new Map<string, string>();

  for (const node of graph.nodes) {
    if (node.type !== "objectType") continue;

    const elId = node.data.ontologyElementId || node.data.ontologyObjectId;
    if (typeof elId === "string" && elId.startsWith("foundry-obj-")) {
      const api = elId.slice("foundry-obj-".length);
      apiIndex.set(api.toLowerCase(), node.id);
      apiIndex.set(normalizeApiKey(api), node.id);
    }

    const label = node.data.label.trim().toLowerCase();
    if (label) displayIndex.set(label, node.id);
    displayIndex.set(normalizeApiKey(node.data.label), node.id);
  }

  for (const element of elements.filter((el) => el.kind === "objectType")) {
    const apiName = objectTypeApiName(element);
    const node = graph.nodes.find(
      (n) =>
        n.data.ontologyElementId === element.id ||
        n.data.ontologyObjectId === element.id ||
        (apiName && n.id === ontologyObjectNodeId(apiName)),
    );
    if (apiName && node) {
      apiIndex.set(apiName.toLowerCase(), node.id);
      apiIndex.set(normalizeApiKey(apiName), node.id);
    }
    if (node && element.name.trim()) {
      displayIndex.set(element.name.trim().toLowerCase(), node.id);
      displayIndex.set(normalizeApiKey(element.name), node.id);
    }
  }

  return { apiIndex, displayIndex };
}

function resolveObjectTypeNode(
  endpoint: string,
  apiIndex: Map<string, string>,
  displayIndex: Map<string, string>,
): string | undefined {
  const key = endpoint.trim();
  if (!key || isResourceId(key)) return undefined;
  const lower = key.toLowerCase();
  const compact = normalizeApiKey(key);
  return (
    apiIndex.get(lower) ??
    apiIndex.get(compact) ??
    displayIndex.get(lower) ??
    displayIndex.get(compact)
  );
}

/** Create architecture edges from Foundry ontology link types. */
function syncOntologyLinkEdges(
  graph: ArchitectureGraph,
  elements: OntologyElement[],
): number {
  const { apiIndex, displayIndex } = buildObjectTypeNodeIndex(graph, elements);
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  let edgesAdded = 0;
  const seen = new Set<string>();

  const resolveEndpoint = (endpoint: string): string | undefined => {
    const resolved = resolveObjectTypeNode(endpoint, apiIndex, displayIndex);
    if (resolved) return resolved;
    const directId = ontologyObjectNodeId(endpoint);
    return nodeIds.has(directId) ? directId : undefined;
  };

  for (const link of elements.filter((el) => el.kind === "linkType")) {
    const fromApi = link.linkFrom?.trim();
    const toApi = link.linkTo?.trim();
    if (!fromApi || !toApi) continue;

    const source = resolveEndpoint(fromApi);
    const target = resolveEndpoint(toApi);
    if (!source || !target || source === target) continue;

    const edgeKey = `${source}->${target}:${link.foundryApiName || link.id}`;
    if (seen.has(edgeKey)) continue;
    seen.add(edgeKey);

    const edgeId = link.id.startsWith("foundry-link-")
      ? `edge-${link.id}`
      : `edge-foundry-link-${link.id}`;
    const label = link.name.trim() || undefined;

    graph.edges.push({ id: edgeId, source, target, label });
    edgesAdded += 1;
  }

  return edgesAdded;
}

function syncOntologyLinkEdgesFromMetadata(
  graph: ArchitectureGraph,
  elements: OntologyElement[],
  metadata: FoundryFullMetadata,
): number {
  const { apiIndex, displayIndex } = buildObjectTypeNodeIndex(graph, elements);
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  let edgesAdded = 0;
  const seen = new Set<string>();

  const resolveEndpoint = (endpoint: string): string | undefined => {
    const resolved = resolveObjectTypeNode(endpoint, apiIndex, displayIndex);
    if (resolved) return resolved;
    const directId = ontologyObjectNodeId(endpoint);
    return nodeIds.has(directId) ? directId : undefined;
  };

  for (const spec of extractOntologyLinkEdges(metadata)) {
    const source = resolveEndpoint(spec.fromApi);
    const target = resolveEndpoint(spec.toApi);
    if (!source || !target || source === target) continue;

    const edgeKey = `${source}->${target}:${spec.linkApi}`;
    if (seen.has(edgeKey)) continue;
    seen.add(edgeKey);

    const edgeId = `edge-${spec.fromApi}-${spec.linkApi}-${spec.toApi}`.replace(
      /[^a-zA-Z0-9_-]+/g,
      "-",
    );

    graph.edges.push({
      id: edgeId,
      source,
      target,
      label: spec.label?.trim() || undefined,
    });
    edgesAdded += 1;
  }

  return edgesAdded;
}

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
