import type {
  EngagementData,
  StandupData,
  WeeklyReviewData,
  ArchitectureGraph,
} from "../types";

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function engagementToJson(data: EngagementData) {
  return {
    displayName: data.displayName,
    customer: data.customer,
    fdeLead: data.fdeLead,
    startDate: data.startDate,
    targetGoLive: data.targetGoLive,
    status: data.status,
    description: data.description,
    updatedAt: new Date().toISOString(),
  };
}

export function generateProjectReadme(_slug: string, data: EngagementData): string {
  return `# ${data.displayName}

> ${data.description || "Foundry engagement"}

| Field | Value |
|-------|-------|
| Customer | ${data.customer} |
| Lead | ${data.fdeLead} |
| Start | ${data.startDate} |
| Target go-live | ${data.targetGoLive} |
| Status | ${data.status} |

## Problem

**Today:** ${data.asIs}

**Pain:** ${data.pain}

**Goal:** ${data.toBe}

**Out of scope:** ${data.outOfScope}
`;
}

export function generateDiscoveryMd(data: EngagementData): string {
  const stakeholderRows = data.stakeholders
    .filter((s) => s.name.trim())
    .map(
      (s) =>
        `| ${s.name} | ${s.role} | ${s.influence || "—"} | ${s.notes || "—"} |`,
    )
    .join("\n");

  return `# Discovery — ${data.displayName}

## Stakeholders

| Name | Role | Influence | Notes |
|------|------|-----------|-------|
${stakeholderRows || "| | | | |"}

## Problem statement

**As-is:** ${data.asIs}

**Pain:** ${data.pain}

**To-be:** ${data.toBe}

**Out of scope:** ${data.outOfScope}
`;
}

export function generateScopingMd(data: EngagementData): string {
  const metricRows = data.successMetrics
    .filter((m) => m.metric.trim())
    .map(
      (m) =>
        `| ${m.metric} | ${m.baseline || "—"} | ${m.target || "—"} | TBD |`,
    )
    .join("\n");

  return `# Scoping — ${data.displayName}

## Success metrics

| Metric | Baseline | Target | How measured |
|--------|----------|--------|--------------|
${metricRows || "| | | | |"}

## In scope

| Capability | Priority | Foundry surface |
|------------|----------|-----------------|
| Core workflow | Must | Ontology + Workshop |
`;
}

export function generateStandupMd(data: StandupData): string {
  const date = todayISO();
  const yesterday = data.yesterday
    .filter(Boolean)
    .map((y) => `- ${y}`)
    .join("\n");
  const todayRows = data.today
    .filter((t) => t.task.trim())
    .map(
      (t) =>
        `| ${t.priority || "P1"} | ${t.task} | ${t.surface || "—"} | Planned |`,
    )
    .join("\n");
  const blockerRows = data.blockers
    .filter((b) => b.blocker.trim())
    .map(
      (b) =>
        `| ${b.blocker} | ${b.owner || "—"} | ${b.escalate ? "Yes" : "No"} |`,
    )
    .join("\n");

  return `---
project: ${data.projectSlug}
projectDisplay: ${data.projectDisplay}
date: ${date}
type: standup
---

# Daily Standup — ${data.projectDisplay}

**Date:** ${date}  
**Project:** ${data.projectDisplay}  
**Milestone:** ${data.milestone || "—"}

## Yesterday

${yesterday || "- "}

## Today

| Priority | Task | Area | Status |
|----------|------|------|--------|
${todayRows || "| | | | |"}

## Blockers

| Blocker | Owner | Escalate? |
|---------|-------|-----------|
${blockerRows || "| | | |"}

## Customer touchpoints

${data.meetings || "None scheduled"}

## Notes

${data.notes || "—"}
`;
}

export function generateWeeklyMd(data: WeeklyReviewData): string {
  const date = todayISO();
  const wins = data.wins.filter(Boolean).map((w, i) => `${i + 1}. ${w}`).join("\n");
  const deliverableRows = data.deliverables
    .filter((d) => d.name.trim())
    .map(
      (d) =>
        `| ${d.name} | ${d.resource || "—"} | ${d.customerVisible ? "Yes" : "No"} |`,
    )
    .join("\n");
  const riskRows = data.risks
    .filter((r) => r.risk.trim())
    .map(
      (r) =>
        `| ${r.risk} | ${r.likelihood} | ${r.impact} | ${r.mitigation || "—"} |`,
    )
    .join("\n");
  const nextWeek = data.nextWeek
    .filter(Boolean)
    .map((n, i) => `${i + 1}. ${n}`)
    .join("\n");

  return `---
project: ${data.projectSlug}
projectDisplay: ${data.projectDisplay}
date: ${date}
type: weekly-review
---

# Weekly Review — ${data.projectDisplay}

**Week of:** ${date}  
**Project:** ${data.projectDisplay}  
**Phase:** ${data.phase || "—"}

## Wins

${wins || "1. "}

## Deliverables shipped

| Deliverable | Resource | Customer-visible |
|-------------|----------|------------------|
${deliverableRows || "| | | |"}

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
${riskRows || "| | | | |"}

## Next week

${nextWeek || "1. "}

## Open questions

${data.openQuestions || "—"}
`;
}

export function architectureToMermaid(graph: ArchitectureGraph): string {
  const lines = ["flowchart LR"];
  for (const node of graph.nodes) {
    const shape =
      node.type === "source"
        ? `[${node.data.label}]`
        : node.type === "user"
          ? `((${node.data.label}))`
          : `[${node.data.label}]`;
    lines.push(`  ${node.id}${shape}`);
  }
  for (const edge of graph.edges) {
    const label = edge.label ? `|${edge.label}|` : "";
    lines.push(`  ${edge.source} -->${label} ${edge.target}`);
  }
  return lines.join("\n");
}

export function generateDesignOverviewMermaid(graph: ArchitectureGraph): string {
  return `# Design Overview

## Architecture diagram

\`\`\`mermaid
${architectureToMermaid(graph)}
\`\`\`

_Edit visually in the Architecture tab. This file is auto-updated when you save the diagram._
`;
}
