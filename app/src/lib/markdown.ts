import type {
  EngagementData,
  StandupData,
  WeeklyReviewData,
  ArchitectureGraph,
  CustomerSyncData,
  OntologyObjectType,
  ProjectUser,
  Stakeholder,
  SuccessMetric,
} from "../types";
import { stackUrlFromEngagement } from "./foundryLinks";
import { buildProjectUsersFromWizard } from "./projectUsers";

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

const TEMPLATE_PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/;

export function isUnfilledTemplate(content: string): boolean {
  return TEMPLATE_PLACEHOLDER.test(content);
}

export function engagementFromJson(
  json: Record<string, unknown>,
  fallback?: { displayName?: string; customer?: string; status?: string; targetGoLive?: string },
): EngagementData {
  return {
    displayName: String(json.displayName || fallback?.displayName || ""),
    customer: String(json.customer || fallback?.customer || ""),
    fdeLead: String(json.fdeLead || ""),
    startDate: String(json.startDate || ""),
    targetGoLive: String(json.targetGoLive || fallback?.targetGoLive || ""),
    status: (json.status as EngagementData["status"]) || "discovery",
    description: String(json.description || ""),
    asIs: String(json.asIs || ""),
    pain: String(json.pain || ""),
    toBe: String(json.toBe || ""),
    outOfScope: String(json.outOfScope || ""),
    foundryStackUrl: stackUrlFromEngagement(json),
    stakeholders: Array.isArray(json.stakeholders)
      ? (json.stakeholders as Stakeholder[]).map((s, i) => ({
          id: String(s.id || `sh-${i}`),
          name: String(s.name || ""),
          role: String(s.role || ""),
          influence: String(s.influence || "M"),
          interest: String(s.interest || "M"),
          notes: String(s.notes || ""),
        }))
      : [],
    teamMembers: Array.isArray(json.projectUsers)
      ? (json.projectUsers as ProjectUser[])
          .filter((u) => u.kind === "team" || u.kind === "both")
          .map((u) => ({
            id: String(u.id),
            name: String(u.name || ""),
            role: String(u.role || ""),
            email: String(u.email || ""),
            organization: String(u.organization || ""),
            kind: u.kind,
            stakeholderId: u.stakeholderId,
          }))
      : [],
    successMetrics: Array.isArray(json.successMetrics)
      ? (json.successMetrics as SuccessMetric[]).map((m) => ({
          metric: String(m.metric || ""),
          baseline: String(m.baseline || ""),
          target: String(m.target || ""),
        }))
      : [],
  };
}

export function unfilledTemplateNotice(displayName: string): string {
  return `# ${displayName}

> This project was created from the template folder without running the **setup wizard**, so placeholder tags were never filled in.

Use **Projects → New engagement** and complete the guided setup to generate a proper overview, or open **Documents** and edit \`README.md\` directly.
`;
}

function parseFrontmatter(content: string): Record<string, string> {
  if (!content.startsWith("---")) return {};
  const end = content.indexOf("\n---", 3);
  if (end === -1) return {};
  const block = content.slice(3, end).trim();
  const out: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return out;
}

function bodyAfterFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).trimStart();
}

function sectionBody(body: string, heading: string): string {
  const re = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = body.match(re);
  return match?.[1]?.trim() ?? "";
}

function firstTableRow(body: string, tableHeader: string): string[] {
  const section = body.includes(tableHeader) ? body.slice(body.indexOf(tableHeader)) : body;
  const lines = section.split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 3) return [];
  const cells = lines[2]
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  return cells;
}

export function parseStandupMd(content: string): StandupData | null {
  const fm = parseFrontmatter(content);
  const body = bodyAfterFrontmatter(content);

  const milestoneMatch = body.match(/\*\*Milestone:\*\*\s*(.+)/);
  const milestone = milestoneMatch?.[1]?.trim().replace(/^—$/, "") || "";

  const yesterdayRaw = sectionBody(body, "Yesterday");
  const yesterday = yesterdayRaw
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter((l) => l && l !== "—");

  const todayCells = firstTableRow(body, "| Priority | Task");
  const today =
    todayCells.length >= 3 && todayCells[1]
      ? [
          {
            priority: todayCells[0] || "P1",
            task: todayCells[1],
            surface: todayCells[2] || "Workshop",
          },
        ]
      : [];

  const blockerCells = firstTableRow(body, "| Blocker | Owner");
  const blockers =
    blockerCells.length >= 1 && blockerCells[0]
      ? [
          {
            blocker: blockerCells[0],
            owner: blockerCells[1] || "",
            escalate: blockerCells[2]?.toLowerCase() === "yes",
          },
        ]
      : [];

  const meetings = sectionBody(body, "Customer touchpoints").replace(/^None scheduled$/, "");
  const notesRaw = sectionBody(body, "Notes");
  const notes = notesRaw === "—" ? "" : notesRaw;

  if (!fm.project && !fm.projectDisplay) return null;

  return {
    projectSlug: fm.project || "",
    projectDisplay: fm.projectDisplay || "",
    date: fm.date,
    milestone,
    yesterday,
    today,
    blockers,
    meetings,
    notes,
  };
}

export function parseWeeklyMd(content: string): WeeklyReviewData | null {
  const fm = parseFrontmatter(content);
  if (fm.type !== "weekly-review") return null;
  const body = bodyAfterFrontmatter(content);

  const phaseMatch = body.match(/\*\*Phase:\*\*\s*(.+)/);
  const phase = phaseMatch?.[1]?.trim().replace(/^—$/, "") || "Build";

  const winsRaw = sectionBody(body, "Wins");
  const wins = winsRaw
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  const deliverableCells = firstTableRow(body, "| Deliverable | Resource");
  const deliverables =
    deliverableCells.length >= 2 && deliverableCells[0]
      ? [
          {
            name: deliverableCells[0],
            resource: deliverableCells[1] || "",
            customerVisible: deliverableCells[2]?.toLowerCase() === "yes",
          },
        ]
      : [{ name: "", resource: "", customerVisible: false }];

  const riskCells = firstTableRow(body, "| Risk | Likelihood");
  const risks =
    riskCells.length >= 3 && riskCells[0]
      ? [
          {
            risk: riskCells[0],
            likelihood: riskCells[1] || "Medium",
            impact: riskCells[2] || "Medium",
            mitigation: riskCells[3] || "",
          },
        ]
      : [{ risk: "", likelihood: "Medium", impact: "Medium", mitigation: "" }];

  const nextWeekRaw = sectionBody(body, "Next week");
  const nextWeek = nextWeekRaw
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  const openQuestions = sectionBody(body, "Open questions");

  return {
    projectSlug: fm.project || "",
    projectDisplay: fm.projectDisplay || "",
    date: fm.date,
    phase,
    wins: wins.length ? wins : [""],
    deliverables,
    risks,
    nextWeek: nextWeek.length ? nextWeek : [""],
    openQuestions: openQuestions === "—" ? "" : openQuestions,
  };
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
    asIs: data.asIs,
    pain: data.pain,
    toBe: data.toBe,
    outOfScope: data.outOfScope,
    ...(data.foundryStackUrl ? { foundryStackUrl: data.foundryStackUrl } : {}),
    stakeholders: data.stakeholders
      .filter((s) => s.name.trim() || s.role.trim())
      .map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        influence: s.influence || "M",
        interest: s.interest || "M",
        notes: s.notes,
      })),
    projectUsers: buildProjectUsersFromWizard(
      data.fdeLead,
      data.teamMembers,
      data.stakeholders.filter((s) => s.name.trim() || s.role.trim()),
    ),
    successMetrics: data.successMetrics.filter((m) => m.metric.trim()),
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
        `| ${s.name} | ${s.role} | ${s.influence || "M"} | ${s.interest || "M"} | ${s.notes || "—"} |`,
    )
    .join("\n");

  return `# Discovery — ${data.displayName}

## Stakeholder map

| Name | Role | Influence | Interest | Notes |
|------|------|-----------|----------|-------|
${stakeholderRows || "| | | H / M / L | H / M / L | |"}

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
  const date = data.date || todayISO();
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
  const date = data.date || todayISO();
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

export function generateCustomerSyncMd(data: CustomerSyncData): string {
  const date = todayISO();
  return `---
project: ${data.projectSlug}
projectDisplay: ${data.projectDisplay}
date: ${date}
type: customer-sync
---

# Customer Sync — ${data.projectDisplay}

**Date:** ${date}  
**Meeting:** ${data.meetingName}  
**Attendees:** ${data.attendees}  
**Duration:** ${data.duration}

## Objective

${data.objective || "—"}

## Status summary (customer-facing)

> ${data.statusSummary || "Add a plain-language progress update."}

## Demo script

${data.demoActions || "1. "}

## Decisions needed

${data.decisionsNeeded || "—"}

## Risks to surface

${data.risks || "—"}
`;
}

export function generateOntologySection(objects: OntologyObjectType[]): string {
  if (objects.length === 0) return "";
  const sections = objects.map(
    (o) => `### ${o.name}

| Attribute | Value |
|-----------|-------|
| Primary key | ${o.primaryKey} |
| Description | ${o.description} |

**Properties:** ${o.properties.join(", ") || "—"}
`,
  );
  return `\n## Object types (quick-add)\n\n${sections.join("\n")}`;
}

