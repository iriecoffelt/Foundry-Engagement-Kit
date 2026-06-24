import { api } from "./api";
import type { UatScenario } from "../types";

export const UAT_STATUS_LABELS = {
  not_started: "Not started",
  pass: "Pass",
  fail: "Fail",
  blocked: "Blocked",
} as const;

export function uatPath(projectPath: string) {
  return `${projectPath}/03-build/uat-scenarios.json`;
}

export function newUatId() {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function loadUatScenarios(projectPath: string): Promise<UatScenario[]> {
  try {
    const data = await api.readJson<{ scenarios: UatScenario[] }>(uatPath(projectPath));
    return data.scenarios ?? [];
  } catch {
    return [];
  }
}

export async function saveUatScenarios(
  projectPath: string,
  scenarios: UatScenario[],
): Promise<void> {
  await api.writeJson(uatPath(projectPath), { scenarios });
}

function parseUatTable(content: string): Omit<UatScenario, "id" | "status">[] {
  const idx = content.indexOf("## UAT scenarios");
  if (idx === -1) return [];
  const section = content.slice(idx);
  const lines = section.split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 3) return [];
  return lines.slice(2).map((line) => {
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    return {
      scenario: cols[1] || cols[0] || "",
      steps: cols[2] || "",
      expected: cols[3] || "",
    };
  }).filter((s) => s.scenario);
}

export async function seedUatFromWorkshopSpec(projectPath: string): Promise<UatScenario[]> {
  const existing = await loadUatScenarios(projectPath);
  if (existing.length > 0) return existing;

  let content = "";
  try {
    content = await api.readFile(`${projectPath}/02-design/workshop-spec.md`);
  } catch {
    return [];
  }

  const parsed = parseUatTable(content);
  if (!parsed.length) return [];

  const scenarios: UatScenario[] = parsed.map((row) => ({
    id: newUatId(),
    ...row,
    status: "not_started",
  }));

  await saveUatScenarios(projectPath, scenarios);
  return scenarios;
}

export function uatProgress(scenarios: UatScenario[]): {
  pass: number;
  total: number;
  percent: number;
} {
  const applicable = scenarios.filter((s) => s.scenario.trim());
  const pass = applicable.filter((s) => s.status === "pass").length;
  const total = applicable.length;
  return {
    pass,
    total,
    percent: total ? Math.round((pass / total) * 100) : 0,
  };
}
