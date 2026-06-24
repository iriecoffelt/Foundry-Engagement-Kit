import { api } from "./api";
import type { JiraConfig, ProjectMeta } from "../types";
import { loadDeliveryBoard, boardByStatus, DELIVERY_STATUS_LABELS } from "./deliveryBoard";
import { loadRegister, openBlockers, openRisks } from "./engagementRegister";
import { loadActionItems, openActionItems } from "./actionItems";
import { loadUatScenarios, uatProgress } from "./uatScenarios";
import { computePhaseProgress, mergeChecklist, checklistPath, DEFAULT_CHECKLIST } from "./phaseChecklist";

export async function loadJiraConfig(projectPath: string): Promise<JiraConfig> {
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    return {
      baseUrl: (eng.jiraBaseUrl as string) || "",
      projectKey: (eng.jiraProjectKey as string) || "",
    };
  } catch {
    return {};
  }
}

export async function saveJiraConfig(projectPath: string, config: JiraConfig): Promise<void> {
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    await api.writeJson(`${projectPath}/engagement.json`, {
      ...eng,
      jiraBaseUrl: config.baseUrl?.trim() || undefined,
      jiraProjectKey: config.projectKey?.trim() || undefined,
    });
  } catch {
    await api.writeJson(`${projectPath}/engagement.json`, {
      jiraBaseUrl: config.baseUrl?.trim(),
      jiraProjectKey: config.projectKey?.trim(),
    });
  }
}

export function jiraIssueUrl(config: JiraConfig, issueKey: string): string | null {
  if (!config.baseUrl?.trim() || !issueKey.trim()) return null;
  const base = config.baseUrl.replace(/\/$/, "");
  return `${base}/browse/${issueKey.trim()}`;
}

export function jiraProjectUrl(config: JiraConfig): string | null {
  if (!config.baseUrl?.trim() || !config.projectKey?.trim()) return null;
  const base = config.baseUrl.replace(/\/$/, "");
  return `${base}/browse/${config.projectKey.trim()}`;
}

export async function buildJiraExportMarkdown(
  project: ProjectMeta,
): Promise<string> {
  const [board, register, actions, uat, jira] = await Promise.all([
    loadDeliveryBoard(project.path),
    loadRegister(project.path),
    loadActionItems(project.path),
    loadUatScenarios(project.path),
    loadJiraConfig(project.path),
  ]);

  let phasePct = 0;
  try {
    const cl = mergeChecklist(
      await api.readJson<typeof DEFAULT_CHECKLIST>(checklistPath(project.path)),
    );
    phasePct = computePhaseProgress(cl).overall;
  } catch {
    /* default 0 */
  }

  const grouped = boardByStatus(board);
  const uatStat = uatProgress(uat);
  const lines: string[] = [
    `# ${project.display_name} — status export`,
    ``,
    `**Customer:** ${project.customer || "—"}`,
    `**Phase:** ${project.status} (${phasePct}% checklist)`,
    `**Go-live:** ${project.target_go_live || "TBD"}`,
    ``,
  ];

  if (jira.projectKey) {
    lines.push(`**Jira project:** ${jira.projectKey}`, ``);
  }

  const blockers = openBlockers(register);
  if (blockers.length) {
    lines.push(`## Open blockers`, ``);
    for (const b of blockers) {
      lines.push(`- [ ] ${b.title}${b.owner ? ` (@${b.owner})` : ""}${b.escalate ? " **ESCALATE**" : ""}`);
    }
    lines.push(``);
  }

  const risks = openRisks(register);
  if (risks.length) {
    lines.push(`## Open risks`, ``);
    for (const r of risks) {
      lines.push(`- ${r.title} (${r.likelihood}/${r.impact}) — ${r.mitigation || "no mitigation yet"}`);
    }
    lines.push(``);
  }

  const openActs = openActionItems(actions);
  if (openActs.length) {
    lines.push(`## Stakeholder actions`, ``);
    for (const a of openActs) {
      lines.push(`- [ ] ${a.title}${a.assignee ? ` — ${a.assignee}` : ""}${a.dueDate ? ` (due ${a.dueDate})` : ""}`);
    }
    lines.push(``);
  }

  lines.push(`## Delivery board`, ``);
  for (const status of Object.keys(grouped) as (keyof typeof grouped)[]) {
    const cards = grouped[status];
    if (!cards.length) continue;
    lines.push(`### ${DELIVERY_STATUS_LABELS[status]}`, ``);
    for (const c of cards) {
      lines.push(`- ${c.title} (${c.type})${c.owner ? ` — ${c.owner}` : ""}`);
    }
    lines.push(``);
  }

  if (uat.length) {
    lines.push(`## UAT (${uatStat.pass}/${uatStat.total} pass)`, ``);
    for (const s of uat) {
      lines.push(`- [${s.status === "pass" ? "x" : " "}] ${s.scenario}`);
    }
    lines.push(``);
  }

  lines.push(`---`, `_Exported from Foundry Engagement Kit_`);
  return lines.join("\n");
}
