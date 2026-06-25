export type ProjectCacheKey =
  | "register"
  | "deliveryBoard"
  | "checklist"
  | "engagement"
  | "uat"
  | "actionItems"
  | "architecture";

export type DashboardCacheKey = "dashboard";

export type CacheKey = ProjectCacheKey | DashboardCacheKey;

export function projectCacheKey(projectPath: string, key: ProjectCacheKey): string {
  return `${projectPath}::${key}`;
}
