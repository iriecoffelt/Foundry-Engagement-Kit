import { api } from "./api";
import {
  DEFAULT_CHECKLIST,
  checklistPath,
  computeHandoffReadiness,
  computePhaseProgress,
  mergeChecklist,
  PHASE_LABELS,
  type PhaseChecklist,
} from "./phaseChecklist";
import type { EngagementStatus, ProjectMeta } from "../types";

export interface ProjectPortfolioRow {
  project: ProjectMeta;
  phaseProgress: number;
  handoffScore: number;
  overdueMilestones: number;
  currentPhase: string;
}

export interface PortfolioSummary {
  projects: ProjectPortfolioRow[];
  phaseCounts: Record<string, number>;
  lowHandoff: ProjectPortfolioRow[];
  overdueMilestones: { project: string; name: string; date: string }[];
}

export async function loadPortfolioSummary(
  projects: ProjectMeta[],
): Promise<PortfolioSummary> {
  const rows: ProjectPortfolioRow[] = [];
  const phaseCounts: Record<string, number> = {};
  const overdueMilestones: { project: string; name: string; date: string }[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const project of projects) {
    let checklist: PhaseChecklist = DEFAULT_CHECKLIST;
    try {
      checklist = mergeChecklist(
        await api.readJson<PhaseChecklist>(checklistPath(project.path)),
      );
    } catch {
      /* default */
    }

    const progress = computePhaseProgress(checklist);
    const status = (project.status as EngagementStatus) || "discovery";
    phaseCounts[status] = (phaseCounts[status] || 0) + 1;

    let handoffScore = 0;
    try {
      const hasRunbook = await api
        .readFile(`${project.path}/04-deploy/runbook.md`)
        .then(() => true)
        .catch(() => false);
      const hasHandoff = await api
        .readFile(`${project.path}/05-handoff/handoff.md`)
        .then(() => true)
        .catch(() => false);
      let uploadCount = 0;
      try {
        const refs = await api.listDirectory(`${project.path}/references`, false);
        uploadCount = refs.filter((f) => !f.is_dir).length;
      } catch {
        /* none */
      }
      handoffScore = computeHandoffReadiness(
        checklist,
        hasRunbook,
        hasHandoff,
        uploadCount,
      ).score;
    } catch {
      /* skip */
    }

    let overdue = 0;
    try {
      const eng = await api.readJson<{ milestones?: { name: string; targetDate: string; status: string }[] }>(
        `${project.path}/engagement.json`,
      );
      for (const m of eng.milestones || []) {
        if (m.status !== "done" && m.targetDate && m.targetDate < today) {
          overdue += 1;
          overdueMilestones.push({
            project: project.display_name,
            name: m.name,
            date: m.targetDate,
          });
        }
      }
    } catch {
      /* no milestones */
    }

    rows.push({
      project,
      phaseProgress: progress.overall,
      handoffScore,
      overdueMilestones: overdue,
      currentPhase: PHASE_LABELS[status] || project.status,
    });
  }

  const lowHandoff = rows.filter((r) => r.handoffScore < 50).sort((a, b) => a.handoffScore - b.handoffScore);

  return { projects: rows, phaseCounts, lowHandoff, overdueMilestones };
}
