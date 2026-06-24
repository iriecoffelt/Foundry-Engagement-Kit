import { api } from "./api";
import { parseStandupMd, parseWeeklyMd } from "./markdown";
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

function parseAllTableRows(body: string, headerPrefix: string): string[][] {
  const idx = body.indexOf(headerPrefix);
  if (idx === -1) return [];
  const section = body.slice(idx);
  const lines = section.split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 3) return [];
  return lines.slice(2).map((line) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean),
  );
}

function parseStandupBlockers(content: string): { blocker: string; owner: string; escalate: boolean }[] {
  const body = content.includes("---\n") ? content.split("---\n").slice(2).join("---\n") : content;
  const rows = parseAllTableRows(body, "| Blocker | Owner");
  return rows
    .filter((r) => r[0] && r[0] !== "—" && r[0] !== "None")
    .map((r) => ({
      blocker: r[0],
      owner: r[1] || "",
      escalate: r[2]?.toLowerCase() === "yes",
    }));
}

function parseWeeklyRisks(content: string): { risk: string; likelihood: string; impact: string }[] {
  const body = content.includes("---\n") ? content.split("---\n").slice(2).join("---\n") : content;
  const rows = parseAllTableRows(body, "| Risk | Likelihood");
  return rows
    .filter((r) => r[0] && r[0] !== "—")
    .map((r) => ({
      risk: r[0],
      likelihood: r[1] || "Medium",
      impact: r[2] || "Medium",
    }));
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
      const dailyFiles = await api.listDirectory(`daily/${project.slug}`, false).catch(() => []);
      const standups = dailyFiles
        .filter((f) => f.name.endsWith(".md"))
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 5);

      for (const f of standups) {
        const content = await api.readFile(f.path);
        const parsed = parseStandupMd(content);
        const date = fileDate(f.name) || parsed?.date || "";
        const items = parsed?.blockers?.length
          ? parsed.blockers
          : parseStandupBlockers(content);
        for (const b of items) {
          if (b.blocker) {
            blockers.push({
              project: project.display_name,
              projectSlug: project.slug,
              blocker: b.blocker,
              owner: b.owner,
              escalate: b.escalate,
              date,
              path: f.path,
            });
          }
        }
      }

      const weeklyFiles = await api.listDirectory(`weekly/${project.slug}`, false).catch(() => []);
      const reviews = weeklyFiles
        .filter((f) => f.name.includes("weekly-review"))
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 3);

      for (const f of reviews) {
        const content = await api.readFile(f.path);
        const parsed = parseWeeklyMd(content);
        const date = fileDate(f.name) || parsed?.date || "";
        const items = parsed?.risks?.filter((r) => r.risk) || parseWeeklyRisks(content);
        for (const r of items) {
          if (r.risk) {
            risks.push({
              project: project.display_name,
              projectSlug: project.slug,
              risk: r.risk,
              likelihood: r.likelihood,
              impact: r.impact,
              date,
              path: f.path,
            });
          }
        }
      }

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
