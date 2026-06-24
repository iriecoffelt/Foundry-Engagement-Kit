import { api } from "./api";
import type {
  ArchitectureGraph,
  DeliveryBoard,
  DeliveryCard,
  DeliveryComponentType,
  DeliveryStatus,
} from "../types";

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  "backlog",
  "in_dev",
  "in_uat",
  "blocked",
  "done",
];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  backlog: "Backlog",
  in_dev: "In dev",
  in_uat: "In UAT",
  blocked: "Blocked",
  done: "Done",
};

export const DELIVERY_TYPE_LABELS: Record<DeliveryComponentType, string> = {
  objectType: "Object type",
  pipeline: "Pipeline",
  workshop: "Workshop",
  function: "Function",
  other: "Other",
};

export function deliveryBoardPath(projectPath: string) {
  return `${projectPath}/03-build/delivery-board.json`;
}

export function newDeliveryId() {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyBoard(): DeliveryBoard {
  return { cards: [] };
}

export async function loadDeliveryBoard(projectPath: string): Promise<DeliveryBoard> {
  try {
    const data = await api.readJson<DeliveryBoard>(deliveryBoardPath(projectPath));
    return { cards: data.cards ?? [] };
  } catch {
    return emptyBoard();
  }
}

export async function saveDeliveryBoard(
  projectPath: string,
  board: DeliveryBoard,
): Promise<void> {
  await api.writeJson(deliveryBoardPath(projectPath), board);
}

export async function seedFromArchitecture(projectPath: string): Promise<DeliveryBoard> {
  const board = await loadDeliveryBoard(projectPath);
  if (board.cards.length > 0) return board;

  let graph: ArchitectureGraph | null = null;
  try {
    graph = await api.readJson<ArchitectureGraph>(`${projectPath}/02-design/architecture.json`);
  } catch {
    return board;
  }

  const typeMap: Partial<Record<string, DeliveryComponentType>> = {
    objectType: "objectType",
    pipeline: "pipeline",
    workshop: "workshop",
  };

  const now = new Date().toISOString();
  const cards: DeliveryCard[] = (graph.nodes ?? [])
    .filter((n) => typeMap[n.type])
    .map((n) => ({
      id: newDeliveryId(),
      title: n.data.label || n.type,
      type: typeMap[n.type]!,
      status: "backlog",
      owner: "",
      resourceId: n.data.foundryLink || "",
      notes: n.data.notes || "",
      createdAt: now,
      updatedAt: now,
    }));

  const next = { cards };
  if (cards.length) await saveDeliveryBoard(projectPath, next);
  return next;
}

export function boardByStatus(board: DeliveryBoard): Record<DeliveryStatus, DeliveryCard[]> {
  const grouped = Object.fromEntries(
    DELIVERY_STATUSES.map((s) => [s, [] as DeliveryCard[]]),
  ) as Record<DeliveryStatus, DeliveryCard[]>;

  for (const card of board.cards) {
    const status = DELIVERY_STATUSES.includes(card.status) ? card.status : "backlog";
    grouped[status].push(card);
  }
  return grouped;
}
