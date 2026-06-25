import { api } from "./api";
import {
  DEFAULT_CHECKLIST,
  checklistPath,
  mergeChecklist,
  type PhaseChecklist,
} from "./phaseChecklist";
import {
  cachedRead,
  cacheSet,
  invalidateDashboard,
  invalidatePortfolio,
  projectCacheKey,
} from "./workspaceStore";

type ChecklistSaveListener = (projectPath: string, data: PhaseChecklist) => void;
const saveListeners = new Set<ChecklistSaveListener>();

export function subscribeChecklistSaved(listener: ChecklistSaveListener): () => void {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}

export async function loadPhaseChecklist(projectPath: string): Promise<PhaseChecklist> {
  return cachedRead(projectCacheKey(projectPath, "checklist"), async () => {
    try {
      const data = await api.readJson<PhaseChecklist>(checklistPath(projectPath));
      return mergeChecklist(data);
    } catch {
      return structuredClone(DEFAULT_CHECKLIST);
    }
  });
}

export async function savePhaseChecklist(
  projectPath: string,
  data: PhaseChecklist,
): Promise<void> {
  const merged = mergeChecklist(data);
  await api.writeJson(checklistPath(projectPath), merged);
  cacheSet(projectCacheKey(projectPath, "checklist"), merged);
  invalidateDashboard();
  invalidatePortfolio();
  for (const listener of saveListeners) {
    listener(projectPath, merged);
  }
}
