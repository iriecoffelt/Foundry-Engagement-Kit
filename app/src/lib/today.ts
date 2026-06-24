import { api } from "./api";
import type { ProjectMeta, TodayItem } from "../types";
import { getCadenceAlerts } from "./cadence";
import { loadActionItems, openActionItems, isOverdue } from "./actionItems";
import { loadRegister, openBlockers } from "./engagementRegister";
import { loadDeliveryBoard } from "./deliveryBoard";
import { loadUatScenarios } from "./uatScenarios";

export async function loadTodayItems(projects: ProjectMeta[]): Promise<TodayItem[]> {
  const items: TodayItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const cadence = await getCadenceAlerts(projects);
  for (const alert of cadence) {
    const project = projects.find((p) => p.slug === alert.projectSlug);
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

  for (const project of projects) {
  try {
      const milestones = await api
        .readJson<{ milestones?: { id: string; name: string; targetDate: string; status: string }[] }>(
          `${project.path}/engagement.json`,
        )
        .then((e) => e.milestones ?? [])
        .catch(() => []);

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
    } catch {
      /* skip */
    }

    const [actions, register, board, uat] = await Promise.all([
      loadActionItems(project.path),
      loadRegister(project.path),
      loadDeliveryBoard(project.path),
      loadUatScenarios(project.path),
    ]);

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
