import { api } from "./api";
import type { ProjectMeta } from "../types";
import { todayISO } from "./markdown";

export interface CadenceAlert {
  type: "standup" | "weekly";
  projectSlug: string;
  projectName: string;
  message: string;
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function latestFileDate(files: { name: string }[]): string | null {
  const dates = files
    .map((f) => {
      const m = f.name.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : null;
    })
    .filter(Boolean) as string[];
  return dates.sort().reverse()[0] ?? null;
}

export function cadenceAlertsForProject(
  project: ProjectMeta,
  dailyFiles: { name: string }[],
  weeklyFiles: { name: string }[],
): CadenceAlert[] {
  const alerts: CadenceAlert[] = [];
  const today = todayISO();
  const dayOfWeek = new Date().getDay();

  const hasTodayStandup = dailyFiles.some((f) => f.name.startsWith(today));
  if (!hasTodayStandup && dayOfWeek >= 1 && dayOfWeek <= 5) {
    alerts.push({
      type: "standup",
      projectSlug: project.slug,
      projectName: project.display_name,
      message: `No standup logged today for ${project.display_name}`,
    });
  }

  if (dayOfWeek === 5) {
    const latest = latestFileDate(weeklyFiles);
    if (!latest || daysSince(latest) > 7) {
      alerts.push({
        type: "weekly",
        projectSlug: project.slug,
        projectName: project.display_name,
        message: `Weekly review due for ${project.display_name}`,
      });
    }
  }

  return alerts;
}

export async function getCadenceAlerts(projects: ProjectMeta[]): Promise<CadenceAlert[]> {
  const alerts: CadenceAlert[] = [];

  for (const project of projects) {
    try {
      const dailyDir = `daily/${project.slug}`;
      let dailyFiles: { name: string }[] = [];
      try {
        dailyFiles = await api.listDirectory(dailyDir, false);
      } catch {
        /* no daily folder yet */
      }

      let weeklyFiles: { name: string }[] = [];
      if (new Date().getDay() === 5) {
        try {
          weeklyFiles = await api.listDirectory(`weekly/${project.slug}`, false);
        } catch {
          /* none */
        }
      }

      alerts.push(...cadenceAlertsForProject(project, dailyFiles, weeklyFiles));
    } catch {
      /* skip project */
    }
  }

  return alerts;
}
