import type { EngagementStatus } from "../types";

export interface PhaseCheckItem {
  id: string;
  label: string;
  done: boolean;
}

export interface PhaseChecklist {
  phases: Record<EngagementStatus, PhaseCheckItem[]>;
}

export const PHASE_ORDER: EngagementStatus[] = [
  "discovery",
  "scoping",
  "design",
  "build",
  "deploy",
  "handoff",
];

export const PHASE_LABELS: Record<EngagementStatus, string> = {
  discovery: "Discovery",
  scoping: "Scoping",
  design: "Design",
  build: "Build",
  deploy: "Deploy",
  handoff: "Handoff",
};

export const DEFAULT_CHECKLIST: PhaseChecklist = {
  phases: {
    discovery: [
      { id: "d1", label: "Problem statement agreed with sponsor", done: false },
      { id: "d2", label: "End-user interview completed", done: false },
      { id: "d3", label: "Data source inventory started", done: false },
      { id: "d4", label: "Constraints documented", done: false },
    ],
    scoping: [
      { id: "s1", label: "Scope document signed", done: false },
      { id: "s2", label: "Success metrics defined", done: false },
      { id: "s3", label: "Milestone plan agreed", done: false },
    ],
    design: [
      { id: "de1", label: "Ontology design reviewed", done: false },
      { id: "de2", label: "Pipeline design documented", done: false },
      { id: "de3", label: "Workshop spec approved", done: false },
      { id: "de4", label: "Architecture diagram saved", done: false },
    ],
    build: [
      { id: "b1", label: "Core pipelines running in dev", done: false },
      { id: "b2", label: "Ontology backing wired", done: false },
      { id: "b3", label: "Workshop app in UAT", done: false },
      { id: "b4", label: "UAT scenarios pass", done: false },
    ],
    deploy: [
      { id: "dp1", label: "Go-live checklist complete", done: false },
      { id: "dp2", label: "Runbook reviewed with customer", done: false },
      { id: "dp3", label: "Production smoke tests pass", done: false },
    ],
    handoff: [
      { id: "h1", label: "Knowledge transfer sessions done", done: false },
      { id: "h2", label: "Customer owner identified", done: false },
      { id: "h3", label: "Handoff sign-off obtained", done: false },
    ],
  },
};

export function checklistPath(projectPath: string) {
  return `${projectPath}/phase-checklist.json`;
}

export function computePhaseProgress(checklist: PhaseChecklist): {
  overall: number;
  byPhase: Record<EngagementStatus, number>;
} {
  const byPhase = {} as Record<EngagementStatus, number>;
  let total = 0;
  let done = 0;

  for (const phase of PHASE_ORDER) {
    const items = checklist.phases[phase] || [];
    const phaseDone = items.filter((i) => i.done).length;
    byPhase[phase] = items.length ? Math.round((phaseDone / items.length) * 100) : 0;
    total += items.length;
    done += phaseDone;
  }

  return { overall: total ? Math.round((done / total) * 100) : 0, byPhase };
}

export function computeHandoffReadiness(
  checklist: PhaseChecklist,
  hasRunbook: boolean,
  hasHandoffDoc: boolean,
  uploadCount: number,
): { score: number; items: { label: string; ok: boolean }[] } {
  const progress = computePhaseProgress(checklist);
  const handoffItems = checklist.phases.handoff.filter((i) => i.done).length;
  const handoffTotal = checklist.phases.handoff.length;

  const items = [
    { label: "Overall phase checklist ≥ 70%", ok: progress.overall >= 70 },
    { label: "Handoff checklist complete", ok: handoffItems === handoffTotal && handoffTotal > 0 },
    { label: "Runbook exists", ok: hasRunbook },
    { label: "Handoff doc exists", ok: hasHandoffDoc },
    { label: "Reference files uploaded", ok: uploadCount > 0 },
  ];

  const score = Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  return { score, items };
}
