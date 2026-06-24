import { api } from "./api";
import type { EngagementStatus } from "../types";

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
