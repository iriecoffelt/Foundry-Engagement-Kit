import { api } from "./api";
import {
  cachedRead,
  cacheSet,
  invalidateDashboard,
  invalidatePortfolio,
  projectCacheKey,
} from "./workspaceStore";

type EngagementSaveListener = (projectPath: string, data: Record<string, unknown>) => void;
const saveListeners = new Set<EngagementSaveListener>();

export function subscribeEngagementSaved(listener: EngagementSaveListener): () => void {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}

export async function loadEngagementJson(
  projectPath: string,
): Promise<Record<string, unknown>> {
  return cachedRead(projectCacheKey(projectPath, "engagement"), async () => {
    try {
      return await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    } catch {
      return {};
    }
  });
}

export async function saveEngagementJson(
  projectPath: string,
  data: Record<string, unknown>,
): Promise<void> {
  await api.writeJson(`${projectPath}/engagement.json`, data);
  cacheSet(projectCacheKey(projectPath, "engagement"), data);
  invalidateDashboard();
  invalidatePortfolio();
  for (const listener of saveListeners) {
    listener(projectPath, data);
  }
}
