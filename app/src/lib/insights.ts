import type { ProjectMeta } from "../types";
import { loadDashboardSnapshot } from "./dashboardSnapshot";

export interface BlockerInsight {
  project: string;
  projectSlug: string;
  blocker: string;
  owner: string;
  escalate: boolean;
  date: string;
  path: string;
}

export interface RiskInsight {
  project: string;
  projectSlug: string;
  risk: string;
  likelihood: string;
  impact: string;
  date: string;
  path: string;
}

export interface SyncInsight {
  project: string;
  projectSlug: string;
  date: string;
  path: string;
  meetingName?: string;
}

export interface WorkspaceInsights {
  blockers: BlockerInsight[];
  risks: RiskInsight[];
  lastSyncs: SyncInsight[];
}

export async function loadWorkspaceInsights(projects: ProjectMeta[]): Promise<WorkspaceInsights> {
  return (await loadDashboardSnapshot(projects)).insights;
}
