import { api } from "./api";
import { loadPhaseChecklist } from "./checklistData";
import {
  computePhaseProgress,
} from "./phaseChecklist";
import { loadDeliveryBoard, boardByStatus, DELIVERY_STATUS_LABELS } from "./deliveryBoard";
import { loadRegister, openBlockers, openRisks } from "./engagementRegister";
import { loadUatScenarios, uatProgress } from "./uatScenarios";
import { openActionItems, loadActionItems } from "./actionItems";
import { parseStandupMd, parseWeeklyMd } from "./markdown";
import type { ProjectMeta } from "../types";

function fileDate(name: string): string | null {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function weekStartDate(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function inWeek(date: string, start: string): boolean {
  return date >= start;
}

export async function buildWeeklyRollup(project: ProjectMeta): Promise<string> {
  const weekStart = weekStartDate();
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# Weekly rollup — ${project.display_name}`,
    `**Customer:** ${project.customer || "—"}`,
    `**Week of:** ${weekStart} → ${today}`,
    `**Phase:** ${project.status}`,
    "",
  ];

  let phasePct = 0;
  try {
    const cl = await loadPhaseChecklist(project.path);
    phasePct = computePhaseProgress(cl).overall;
  } catch {
    /* default */
  }
  lines.push(`**Checklist progress:** ${phasePct}%`, "");

  const standupDays: string[] = [];
  const standupHighlights: string[] = [];
  try {
    const dailyFiles = await api.listDirectory(`daily/${project.slug}`, false);
    const standups = dailyFiles
      .filter((f) => f.name.endsWith(".md"))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const f of standups) {
      const date = fileDate(f.name);
      if (!date || !inWeek(date, weekStart)) continue;
      standupDays.push(date);
      try {
        const content = await api.readFile(f.path);
        const parsed = parseStandupMd(content);
        const task = parsed?.today?.[0]?.task;
        const surface = parsed?.today?.[0]?.surface;
        if (task) {
          standupHighlights.push(`- **${date}** (${surface || "—"}): ${task}`);
        }
      } catch {
        standupDays.push(date);
      }
    }
  } catch {
    /* no standups */
  }

  lines.push("## This week's focus", "");
  if (standupHighlights.length) {
    lines.push(...standupHighlights, "");
  } else if (standupDays.length) {
    lines.push(`- Standups logged: ${standupDays.join(", ")}`, "");
  } else {
    lines.push("- No standups logged this week", "");
  }

  try {
    const weeklyFiles = await api.listDirectory(`weekly/${project.slug}`, false);
    const review = weeklyFiles
      .filter((f) => f.name.includes("weekly-review"))
      .sort((a, b) => b.name.localeCompare(a.name))[0];
    if (review) {
      const date = fileDate(review.name);
      if (date && inWeek(date, weekStart)) {
        const content = await api.readFile(review.path);
        const parsed = parseWeeklyMd(content);
        if (parsed?.wins?.filter(Boolean).length) {
          lines.push("## Wins", "");
          for (const w of parsed.wins.filter(Boolean)) {
            lines.push(`- ${w}`);
          }
          lines.push("");
        }
        if (parsed?.nextWeek?.filter(Boolean).length) {
          lines.push("## Planned next week", "");
          for (const n of parsed.nextWeek.filter(Boolean)) {
            lines.push(`- ${n}`);
          }
          lines.push("");
        }
      }
    }
  } catch {
    /* skip */
  }

  const [board, register, actions, uat] = await Promise.all([
    loadDeliveryBoard(project.path),
    loadRegister(project.path),
    loadActionItems(project.path),
    loadUatScenarios(project.path),
  ]);

  const grouped = boardByStatus(board);
  lines.push("## Delivery movement", "");
  for (const [status, cards] of Object.entries(grouped)) {
    if (!cards.length) continue;
    lines.push(
      `- **${DELIVERY_STATUS_LABELS[status as keyof typeof DELIVERY_STATUS_LABELS]}:** ${cards.length} (${cards
        .slice(0, 3)
        .map((c) => c.title)
        .join("; ")}${cards.length > 3 ? "…" : ""})`,
    );
  }
  lines.push("");

  const uatStat = uatProgress(uat);
  lines.push(`## UAT`, `**${uatStat.pass} / ${uatStat.total}** scenarios passing (${uatStat.percent}%)`, "");

  const blockers = openBlockers(register);
  if (blockers.length) {
    lines.push("## Open blockers", "");
    for (const b of blockers.slice(0, 8)) {
      lines.push(`- ${b.title}${b.owner ? ` (${b.owner})` : ""}`);
    }
    lines.push("");
  }

  const risks = openRisks(register);
  if (risks.length) {
    lines.push("## Open risks", "");
    for (const r of risks.slice(0, 5)) {
      lines.push(`- ${r.title} — ${r.likelihood}/${r.impact}`);
    }
    lines.push("");
  }

  const openActions = openActionItems(actions);
  if (openActions.length) {
    lines.push("## Open action items", "");
    for (const a of openActions.slice(0, 8)) {
      lines.push(
        `- ${a.title}${a.assignee ? ` → ${a.assignee}` : ""}${a.dueDate ? ` (due ${a.dueDate})` : ""}`,
      );
    }
    lines.push("");
  }

  lines.push("---", "_Generated by Foundry Engagement Kit_");
  return lines.join("\n");
}

export async function buildPortfolioWeeklyRollup(projects: ProjectMeta[]): Promise<string> {
  const weekStart = weekStartDate();
  const today = new Date().toISOString().slice(0, 10);
  const sections: string[] = [
    `# Portfolio weekly rollup`,
    `**Week of:** ${weekStart} → ${today}`,
    `**Engagements:** ${projects.length}`,
    "",
  ];

  for (const project of projects) {
    sections.push(`---`, "", await buildWeeklyRollup(project));
  }

  return sections.join("\n");
}
