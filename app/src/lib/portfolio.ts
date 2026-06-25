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
import { normalizeEngagementStatus } from "./engagementMeta";
import { loadRegister, openBlockers, openRisks } from "./engagementRegister";
import { loadDeliveryBoard } from "./deliveryBoard";
import { uatProgress, loadUatScenarios } from "./uatScenarios";

export interface ProjectPortfolioRow {
  project: ProjectMeta;
  phaseProgress: number;
  handoffScore: number;
  overdueMilestones: number;
  openBlockers: number;
  openRisks: number;
  blockedCards: number;
  uatPercent: number;
  currentPhase: string;
  currentPhaseStatus: EngagementStatus;
}

export interface PortfolioSummary {
  projects: ProjectPortfolioRow[];
  phaseCounts: Record<string, number>;
  lowHandoff: ProjectPortfolioRow[];
  overdueMilestones: { project: string; projectSlug: string; name: string; date: string }[];
  totalOpenBlockers: number;
}

export async function loadPortfolioSummary(
  projects: ProjectMeta[],
): Promise<PortfolioSummary> {
  const rows: ProjectPortfolioRow[] = [];
  const phaseCounts: Record<string, number> = {};
  const overdueMilestones: PortfolioSummary["overdueMilestones"] = [];
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

    let status = normalizeEngagementStatus(project.status);
    let overdue = 0;
    try {
      const eng = await api.readJson<{
        status?: string;
        milestones?: { name: string; targetDate: string; status: string }[];
      }>(`${project.path}/engagement.json`);
      status = normalizeEngagementStatus(eng.status, status);
      for (const m of eng.milestones || []) {
        if (m.status !== "done" && m.targetDate && m.targetDate < today) {
          overdue += 1;
          overdueMilestones.push({
            project: project.display_name,
            projectSlug: project.slug,
            name: m.name,
            date: m.targetDate,
          });
        }
      }
    } catch {
      /* no engagement.json */
    }

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

    const register = await loadRegister(project.path);
    const board = await loadDeliveryBoard(project.path);
    const uat = await loadUatScenarios(project.path);

    rows.push({
      project,
      phaseProgress: progress.overall,
      handoffScore,
      overdueMilestones: overdue,
      openBlockers: openBlockers(register).length,
      openRisks: openRisks(register).length,
      blockedCards: board.cards.filter((c) => c.status === "blocked").length,
      uatPercent: uatProgress(uat).percent,
      currentPhase: PHASE_LABELS[status],
      currentPhaseStatus: status,
    });
  }

  const lowHandoff = rows.filter((r) => r.handoffScore < 50).sort((a, b) => a.handoffScore - b.handoffScore);
  const totalOpenBlockers = rows.reduce((n, r) => n + r.openBlockers, 0);

  return { projects: rows, phaseCounts, lowHandoff, overdueMilestones, totalOpenBlockers };
}
