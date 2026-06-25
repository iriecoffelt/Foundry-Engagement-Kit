import { api } from "./api";
import { PHASE_ORDER } from "./phaseChecklist";
import type { EngagementStatus } from "../types";

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
  try {
    const eng = await api.readJson<{ status?: string }>(`${projectPath}/engagement.json`);
    return normalizeEngagementStatus(eng.status, normalizeEngagementStatus(fallback));
  } catch {
    return normalizeEngagementStatus(fallback);
  }
}

export async function updateEngagementStatus(
  projectPath: string,
  status: EngagementStatus,
): Promise<void> {
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    await api.writeJson(`${projectPath}/engagement.json`, { ...eng, status });
  } catch {
    await api.writeJson(`${projectPath}/engagement.json`, { status });
  }
}
