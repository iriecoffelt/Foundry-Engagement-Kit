import { api } from "./api";
import { loadRegister, openBlockers, openRisks } from "./engagementRegister";
import type { ProjectMeta } from "../types";

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

function fileDate(name: string): string | null {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export async function loadWorkspaceInsights(projects: ProjectMeta[]): Promise<WorkspaceInsights> {
  const blockers: BlockerInsight[] = [];
  const risks: RiskInsight[] = [];
  const lastSyncs: SyncInsight[] = [];

  for (const project of projects) {
    try {
      const register = await loadRegister(project.path);

      for (const b of openBlockers(register)) {
        blockers.push({
          project: project.display_name,
          projectSlug: project.slug,
          blocker: b.title,
          owner: b.owner,
          escalate: b.escalate,
          date: b.createdAt.slice(0, 10),
          path: b.sourcePath || `${project.path}/engagement-register.json`,
        });
      }

      for (const r of openRisks(register)) {
        risks.push({
          project: project.display_name,
          projectSlug: project.slug,
          risk: r.title,
          likelihood: r.likelihood,
          impact: r.impact,
          date: r.createdAt.slice(0, 10),
          path: r.sourcePath || `${project.path}/engagement-register.json`,
        });
      }

      const weeklyFiles = await api.listDirectory(`weekly/${project.slug}`, false).catch(() => []);
      const syncs = weeklyFiles
        .filter((f) => f.name.includes("customer-sync"))
        .sort((a, b) => b.name.localeCompare(a.name));
      if (syncs[0]) {
        const content = await api.readFile(syncs[0].path);
        const fm = content.match(/meetingName:\s*(.+)/i);
        lastSyncs.push({
          project: project.display_name,
          projectSlug: project.slug,
          date: fileDate(syncs[0].name) || "",
          path: syncs[0].path,
          meetingName: fm?.[1]?.trim(),
        });
      }
    } catch {
      /* skip project */
    }
  }

  return { blockers, risks, lastSyncs };
}
