import { loadEngagementJson, saveEngagementJson } from "./engagementData";
import { PHASE_ORDER } from "./phaseChecklist";
import type { EngagementStatus, ProjectMeta } from "../types";

export function slugFromProjectPath(projectPath: string): string {
  return projectPath.replace(/^project\//, "");
}

export function projectMetaPatchFromEngagement(
  eng: Record<string, unknown>,
): Partial<ProjectMeta> {
  const patch: Partial<ProjectMeta> = {};
  if (typeof eng.displayName === "string" && eng.displayName.trim()) {
    patch.display_name = eng.displayName.trim();
  }
  if (typeof eng.customer === "string") {
    patch.customer = eng.customer;
  }
  if (typeof eng.status === "string" && eng.status.trim()) {
    patch.status = eng.status.trim();
  }
  if (typeof eng.targetGoLive === "string") {
    patch.target_go_live = eng.targetGoLive;
  }
  return patch;
}

export function normalizeEngagementStatus(
  status: string | undefined,
  fallback: EngagementStatus = "discovery",
): EngagementStatus {
  if (status && PHASE_ORDER.includes(status as EngagementStatus)) {
    return status as EngagementStatus;
  }
  return PHASE_ORDER.includes(fallback) ? fallback : "discovery";
}

export async function loadEngagementStatus(
  projectPath: string,
  fallback: string = "discovery",
): Promise<EngagementStatus> {
  const eng = await loadEngagementJson(projectPath);
  return normalizeEngagementStatus(
    String(eng.status ?? ""),
    normalizeEngagementStatus(fallback),
  );
}

export async function updateEngagementStatus(
  projectPath: string,
  status: EngagementStatus,
): Promise<void> {
  const eng = await loadEngagementJson(projectPath);
  await saveEngagementJson(projectPath, { ...eng, status });
}
