import { loadEngagementJson, saveEngagementJson } from "./engagementData";
import type { ActionItem } from "../types";

export function newActionId() {
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function loadActionItems(projectPath: string): Promise<ActionItem[]> {
  const eng = await loadEngagementJson(projectPath);
  return (eng.actionItems as ActionItem[]) ?? [];
}

export async function saveActionItems(
  projectPath: string,
  items: ActionItem[],
): Promise<void> {
  const eng = await loadEngagementJson(projectPath);
  await saveEngagementJson(projectPath, { ...eng, actionItems: items });
}

export function openActionItems(items: ActionItem[]): ActionItem[] {
  return items.filter((i) => i.status === "open");
}

export function isOverdue(item: ActionItem): boolean {
  if (!item.dueDate || item.status === "done") return false;
  return item.dueDate < new Date().toISOString().slice(0, 10);
}
