import { api } from "./api";
import { cachedRead, cacheSet, invalidateDashboard, invalidatePortfolio, invalidateProject, projectCacheKey } from "./workspaceStore";
import type { DeliveryBoard, DeliveryCard, DeliveryStatus } from "../types";

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

export const DELIVERY_STATUS_BADGE: Record<DeliveryStatus, string> = {
  backlog: "bg-surface-elevated text-fg-secondary ring-surface-border-strong",
  in_dev: "bg-sky-500/15 text-sky-300 ring-sky-500/20",
  in_uat: "bg-amber-500/15 text-amber-300 ring-amber-500/20",
  blocked: "bg-red-500/15 text-red-300 ring-red-500/20",
  done: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20",
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
  return cachedRead(projectCacheKey(projectPath, "deliveryBoard"), async () => {
    try {
      const data = await api.readJson<DeliveryBoard>(deliveryBoardPath(projectPath));
      return { cards: data.cards ?? [] };
    } catch {
      return emptyBoard();
    }
  });
}

export async function saveDeliveryBoard(
  projectPath: string,
  board: DeliveryBoard,
): Promise<void> {
  await api.writeJson(deliveryBoardPath(projectPath), board);
  cacheSet(projectCacheKey(projectPath, "deliveryBoard"), board);
  invalidateProject(projectPath, "architecture");
  invalidateDashboard();
  invalidatePortfolio();
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

export {
  seedFromArchitecture,
  syncFromArchitecture,
  syncToArchitecture,
  syncArchitectureAndDelivery,
  removeArchitectureNodes,
  removeArchitectureForDeliveryCard,
  removeDeliveryCardsForArchitectureNodes,
  pruneOrphanDeliveryArchitectureNodes,
} from "./architectureSync";
