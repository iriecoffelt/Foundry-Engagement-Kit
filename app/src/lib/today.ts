import type { ProjectMeta, TodayItem } from "../types";
import { loadDashboardSnapshot } from "./dashboardSnapshot";

export async function loadTodayItems(projects: ProjectMeta[]): Promise<TodayItem[]> {
  return (await loadDashboardSnapshot(projects)).todayItems;
}
