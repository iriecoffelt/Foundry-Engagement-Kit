import { api } from "./api";
import { loadPhaseChecklist } from "./checklistData";
import {
  DEFAULT_CHECKLIST,
  computeHandoffReadiness,
  computePhaseProgress,
  PHASE_LABELS,
  type PhaseChecklist,
} from "./phaseChecklist";
import type { EngagementStatus, ProjectMeta } from "../types";
import { loadEngagementJson } from "./engagementData";
import { normalizeEngagementStatus } from "./engagementMeta";
import { loadRegister, openBlockers, openRisks } from "./engagementRegister";
import { loadDeliveryBoard } from "./deliveryBoard";
import { uatProgress, loadUatScenarios } from "./uatScenarios";
import { cachedRead } from "./workspaceStore";

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

async function loadProjectPortfolioRow(
  project: ProjectMeta,
  today: string,
): Promise<{
  row: ProjectPortfolioRow;
  phaseStatus: EngagementStatus;
  overdueMilestones: PortfolioSummary["overdueMilestones"];
}> {
  let checklist: PhaseChecklist = DEFAULT_CHECKLIST;
  try {
    checklist = await loadPhaseChecklist(project.path);
  } catch {
    /* default */
  }

  const progress = computePhaseProgress(checklist);

  let status = normalizeEngagementStatus(project.status);
  let overdue = 0;
  const projectOverdue: PortfolioSummary["overdueMilestones"] = [];

  try {
    const eng = await loadEngagementJson(project.path);
    status = normalizeEngagementStatus(String(eng.status ?? ""), status);
    const milestones =
      (eng.milestones as { name: string; targetDate: string; status: string }[]) ?? [];
    for (const m of milestones) {
      if (m.status !== "done" && m.targetDate && m.targetDate < today) {
        overdue += 1;
        projectOverdue.push({
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

  let handoffScore = 0;
  try {
    const [hasRunbook, hasHandoff, refs] = await Promise.all([
      api.readFile(`${project.path}/04-deploy/runbook.md`).then(
        () => true,
        () => false,
      ),
      api.readFile(`${project.path}/05-handoff/handoff.md`).then(
        () => true,
        () => false,
      ),
      api.listDirectory(`${project.path}/references`, false).catch(() => []),
    ]);
    const uploadCount = refs.filter((f) => !f.is_dir).length;
    handoffScore = computeHandoffReadiness(checklist, hasRunbook, hasHandoff, uploadCount).score;
  } catch {
    /* skip */
  }

  const [register, board, uat] = await Promise.all([
    loadRegister(project.path),
    loadDeliveryBoard(project.path),
    loadUatScenarios(project.path),
  ]);

  return {
    row: {
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
    },
    phaseStatus: status,
    overdueMilestones: projectOverdue,
  };
}

async function buildPortfolioSummary(projects: ProjectMeta[]): Promise<PortfolioSummary> {
  const today = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(projects.map((p) => loadProjectPortfolioRow(p, today)));

  const rows = results.map((r) => r.row);
  const phaseCounts: Record<string, number> = {};
  for (const { phaseStatus } of results) {
    phaseCounts[phaseStatus] = (phaseCounts[phaseStatus] || 0) + 1;
  }

  const overdueMilestones = results.flatMap((r) => r.overdueMilestones);
  const lowHandoff = rows.filter((r) => r.handoffScore < 50).sort((a, b) => a.handoffScore - b.handoffScore);
  const totalOpenBlockers = rows.reduce((n, r) => n + r.openBlockers, 0);

  return { projects: rows, phaseCounts, lowHandoff, overdueMilestones, totalOpenBlockers };
}

export async function loadPortfolioSummary(
  projects: ProjectMeta[],
): Promise<PortfolioSummary> {
  const slugKey = projects
    .map((p) => p.slug)
    .sort()
    .join(",");
  return cachedRead(`portfolio::${slugKey}`, () => buildPortfolioSummary(projects));
}
