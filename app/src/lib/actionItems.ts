import { api } from "./api";
import type { ActionItem } from "../types";

export function newActionId() {
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function loadActionItems(projectPath: string): Promise<ActionItem[]> {
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    return (eng.actionItems as ActionItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function saveActionItems(
  projectPath: string,
  items: ActionItem[],
): Promise<void> {
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    await api.writeJson(`${projectPath}/engagement.json`, { ...eng, actionItems: items });
  } catch {
    await api.writeJson(`${projectPath}/engagement.json`, { actionItems: items });
  }
}

export function openActionItems(items: ActionItem[]): ActionItem[] {
  return items.filter((i) => i.status === "open");
}

export function isOverdue(item: ActionItem): boolean {
  if (!item.dueDate || item.status === "done") return false;
  return item.dueDate < new Date().toISOString().slice(0, 10);
}
