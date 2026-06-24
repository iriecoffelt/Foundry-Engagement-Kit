import { api } from "./api";
import { loadDecisions } from "./decisions";
import { loadRegister } from "./engagementRegister";
import { loadUatScenarios } from "./uatScenarios";

export type TimelineEventKind =
  | "start"
  | "milestone"
  | "standup"
  | "weekly"
  | "sync"
  | "decision"
  | "blocker"
  | "risk"
  | "uat";

export interface TimelineEvent {
  id: string;
  date: string;
  kind: TimelineEventKind;
  title: string;
  detail?: string;
  tab?: string;
}

function fileDate(name: string): string | null {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function isoDate(iso?: string): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export async function loadEngagementTimeline(
  projectPath: string,
  projectSlug: string,
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    const startDate = isoDate(String(eng.startDate || ""));
    if (startDate) {
      events.push({
        id: "start",
        date: startDate,
        kind: "start",
        title: "Engagement started",
        detail: String(eng.displayName || ""),
        tab: "overview",
      });
    }

    const milestones = (eng.milestones ?? []) as {
      id: string;
      name: string;
      targetDate?: string;
      status?: string;
    }[];
    for (const m of milestones) {
      if (!m.targetDate) continue;
      const done = m.status === "done";
      events.push({
        id: `ms-${m.id}`,
        date: m.targetDate,
        kind: "milestone",
        title: done ? `Milestone completed: ${m.name}` : `Milestone target: ${m.name}`,
        detail: done ? "Done" : m.status === "in_progress" ? "In progress" : "Pending",
        tab: "overview",
      });
    }
  } catch {
    /* no engagement.json */
  }

  try {
    const dailyFiles = await api.listDirectory(`daily/${projectSlug}`, false);
    for (const f of dailyFiles.filter((e) => e.name.endsWith(".md"))) {
      const date = fileDate(f.name);
      if (!date) continue;
      events.push({
        id: `standup-${f.name}`,
        date,
        kind: "standup",
        title: "Daily standup",
        detail: f.name.replace(".md", ""),
        tab: "overview",
      });
    }
  } catch {
    /* no standups */
  }

  try {
    const weeklyFiles = await api.listDirectory(`weekly/${projectSlug}`, false);
    for (const f of weeklyFiles.filter((e) => e.name.endsWith(".md"))) {
      const date = fileDate(f.name);
      if (!date) continue;
      if (f.name.includes("weekly-review")) {
        events.push({
          id: `weekly-${f.name}`,
          date,
          kind: "weekly",
          title: "Weekly review",
          tab: "overview",
        });
      } else if (f.name.includes("customer-sync")) {
        events.push({
          id: `sync-${f.name}`,
          date,
          kind: "sync",
          title: "Customer sync",
          tab: "documents",
        });
      }
    }
  } catch {
    /* no weekly */
  }

  const decisions = await loadDecisions(projectPath);
  for (const d of decisions) {
    const date = d.date || "1970-01-01";
    events.push({
      id: `adr-${d.number}`,
      date,
      kind: "decision",
      title: `ADR-${d.number}: ${d.title}`,
      detail: d.status,
      tab: "decisions",
    });
  }

  const register = await loadRegister(projectPath);
  for (const b of register.blockers) {
    const created = isoDate(b.createdAt);
    if (created) {
      events.push({
        id: `blk-open-${b.id}`,
        date: created,
        kind: "blocker",
        title: `Blocker opened: ${b.title}`,
        detail: b.owner ? `Owner: ${b.owner}` : undefined,
        tab: "register",
      });
    }
    const resolved = isoDate(b.resolvedAt);
    if (resolved && b.status === "resolved") {
      events.push({
        id: `blk-res-${b.id}`,
        date: resolved,
        kind: "blocker",
        title: `Blocker resolved: ${b.title}`,
        tab: "register",
      });
    }
  }

  for (const r of register.risks) {
    const created = isoDate(r.createdAt);
    if (created) {
      events.push({
        id: `risk-${r.id}`,
        date: created,
        kind: "risk",
        title: `Risk logged: ${r.title}`,
        detail: `${r.likelihood} / ${r.impact}`,
        tab: "register",
      });
    }
  }

  const uat = await loadUatScenarios(projectPath);
  for (const s of uat) {
    if (!s.testedAt || s.status === "not_started") continue;
    events.push({
      id: `uat-${s.id}`,
      date: s.testedAt,
      kind: "uat",
      title: `UAT ${s.status}: ${s.scenario}`,
      detail: s.tester ? `Tester: ${s.tester}` : undefined,
      tab: "uat",
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export const TIMELINE_KIND_LABELS: Record<TimelineEventKind, string> = {
  start: "Start",
  milestone: "Milestone",
  standup: "Standup",
  weekly: "Weekly",
  sync: "Customer sync",
  decision: "Decision",
  blocker: "Blocker",
  risk: "Risk",
  uat: "UAT",
};
