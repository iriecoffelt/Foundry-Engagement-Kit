import { api } from "./api";
import { cadenceAlertsForProject, type CadenceAlert } from "./cadence";
import { openActionItems, isOverdue } from "./actionItems";
import type { ActionItem, DeliveryBoard, EngagementRegister, ProjectMeta, TodayItem, UatScenario } from "../types";
import { loadEngagementJson } from "./engagementData";
import { loadDeliveryBoard } from "./deliveryBoard";
import { loadRegister, openBlockers, openRisks } from "./engagementRegister";
import type {
  BlockerInsight,
  RiskInsight,
  SyncInsight,
  WorkspaceInsights,
} from "./insights";
import { loadUatScenarios } from "./uatScenarios";
import { cachedRead } from "./workspaceStore";

export type { WorkspaceInsights } from "./insights";

export interface ProjectDashboardBundle {
  project: ProjectMeta;
  register: EngagementRegister;
  board: DeliveryBoard;
  uat: UatScenario[];
  engagement: Record<string, unknown>;
  dailyFiles: { name: string; path: string }[];
  weeklyFiles: { name: string; path: string }[];
}

export interface DashboardSnapshot {
  cadenceAlerts: CadenceAlert[];
  todayItems: TodayItem[];
  insights: WorkspaceInsights;
}

function fileDate(name: string): string | null {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

async function loadProjectBundle(project: ProjectMeta): Promise<ProjectDashboardBundle> {
  const [register, board, uat, engagement, dailyFiles, weeklyFiles] = await Promise.all([
    loadRegister(project.path),
    loadDeliveryBoard(project.path),
    loadUatScenarios(project.path),
    loadEngagementJson(project.path),
    api.listDirectory(`daily/${project.slug}`, false).catch(() => []),
    api.listDirectory(`weekly/${project.slug}`, false).catch(() => []),
  ]);

  return { project, register, board, uat, engagement, dailyFiles, weeklyFiles };
}

function buildTodayItems(bundles: ProjectDashboardBundle[], cadenceAlerts: CadenceAlert[]): TodayItem[] {
  const items: TodayItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const alert of cadenceAlerts) {
    const project = bundles.find((b) => b.project.slug === alert.projectSlug)?.project;
    items.push({
      id: `cadence-${alert.type}-${alert.projectSlug}`,
      kind: "cadence",
      project: alert.projectName,
      projectSlug: alert.projectSlug,
      projectPath: project?.path ?? `project/${alert.projectSlug}`,
      title: alert.message,
      priority: "high",
    });
  }

  for (const { project, register, board, uat, engagement } of bundles) {
    const milestones =
      (engagement.milestones as { id: string; name: string; targetDate: string; status: string }[]) ??
      [];

    for (const m of milestones) {
      if (m.status === "done" || !m.targetDate) continue;
      if (m.targetDate <= today) {
        items.push({
          id: `ms-${project.slug}-${m.id}`,
          kind: "milestone",
          project: project.display_name,
          projectSlug: project.slug,
          projectPath: project.path,
          title: `Milestone overdue: ${m.name}`,
          meta: `Due ${m.targetDate}`,
          priority: "high",
          tab: "overview",
        });
      }
    }

    const actions = (engagement.actionItems as ActionItem[]) ?? [];
    for (const a of openActionItems(actions)) {
      items.push({
        id: `act-${a.id}`,
        kind: "action",
        project: project.display_name,
        projectSlug: project.slug,
        projectPath: project.path,
        title: a.title,
        meta: a.assignee ? `${a.assignee}${a.dueDate ? ` · due ${a.dueDate}` : ""}` : a.dueDate,
        priority: isOverdue(a) ? "high" : a.dueDate === today ? "medium" : "low",
        tab: "stakeholders",
      });
    }

    for (const b of openBlockers(register)) {
      items.push({
        id: `blk-${b.id}`,
        kind: "blocker",
        project: project.display_name,
        projectSlug: project.slug,
        projectPath: project.path,
        title: b.title,
        meta: b.owner ? `Owner: ${b.owner}` : undefined,
        priority: b.escalate ? "high" : "medium",
        tab: "register",
      });
    }

    for (const c of board.cards.filter((x) => x.status === "blocked" || x.status === "in_uat")) {
      items.push({
        id: `del-${c.id}`,
        kind: "delivery",
        project: project.display_name,
        projectSlug: project.slug,
        projectPath: project.path,
        title: c.title,
        meta: c.status === "blocked" ? "Blocked on board" : "In UAT",
        priority: c.status === "blocked" ? "high" : "medium",
        tab: "delivery",
      });
    }

    for (const s of uat.filter((x) => x.status === "fail" || x.status === "blocked")) {
      items.push({
        id: `uat-${s.id}`,
        kind: "uat",
        project: project.display_name,
        projectSlug: project.slug,
        projectPath: project.path,
        title: s.scenario,
        meta: `UAT ${s.status}`,
        priority: s.status === "fail" ? "high" : "medium",
        tab: "uat",
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => order[a.priority] - order[b.priority]);
}

async function buildInsights(bundles: ProjectDashboardBundle[]): Promise<WorkspaceInsights> {
  const blockers: BlockerInsight[] = [];
  const risks: RiskInsight[] = [];
  const lastSyncs: SyncInsight[] = [];

  for (const { project, register, weeklyFiles } of bundles) {
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
  }

  return { blockers, risks, lastSyncs };
}

async function buildDashboardSnapshot(projects: ProjectMeta[]): Promise<DashboardSnapshot> {
  const bundles = await Promise.all(projects.map(loadProjectBundle));
  const cadenceAlerts = bundles.flatMap((b) =>
    cadenceAlertsForProject(b.project, b.dailyFiles, b.weeklyFiles),
  );
  const todayItems = buildTodayItems(bundles, cadenceAlerts);
  const insights = await buildInsights(bundles);
  return { cadenceAlerts, todayItems, insights };
}

export async function loadDashboardSnapshot(projects: ProjectMeta[]): Promise<DashboardSnapshot> {
  const slugKey = projects
    .map((p) => p.slug)
    .sort()
    .join(",");
  return cachedRead(`dashboard::${slugKey}`, () => buildDashboardSnapshot(projects));
}
