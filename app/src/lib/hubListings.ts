import { api } from "./api";
import type { FileEntry, ProjectMeta } from "../types";

export async function listDailyStandupsByProject(
  projects: ProjectMeta[],
): Promise<Record<string, FileEntry[]>> {
  const byProject: Record<string, FileEntry[]> = {};

  await Promise.all(
    projects.map(async (project) => {
      try {
        const files = await api.listDirectory(`daily/${project.slug}`, false);
        const md = files.filter((f) => !f.is_dir && f.name.endsWith(".md"));
        if (md.length) byProject[project.slug] = md;
      } catch {
        /* no daily folder for project */
      }
    }),
  );

  try {
    const root = await api.listDirectory("daily", false);
    const general = root.filter(
      (e) => !e.is_dir && e.name.endsWith(".md") && e.name !== "standup.md",
    );
    if (general.length) byProject["_general"] = general;
  } catch {
    /* no daily root */
  }

  return byProject;
}

export async function listWeeklyDocsByProject(
  projects: ProjectMeta[],
): Promise<Record<string, FileEntry[]>> {
  const byProject: Record<string, FileEntry[]> = {};

  await Promise.all(
    projects.map(async (project) => {
      try {
        const files = await api.listDirectory(`weekly/${project.slug}`, false);
        const md = files.filter((f) => !f.is_dir && f.name.endsWith(".md"));
        if (md.length) byProject[project.slug] = md;
      } catch {
        /* no weekly folder for project */
      }
    }),
  );

  return byProject;
}
