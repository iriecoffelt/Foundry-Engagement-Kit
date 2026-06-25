import { api } from "./api";
import { cachedRead, cacheSet, invalidateDashboard, invalidatePortfolio, projectCacheKey } from "./workspaceStore";
import type { BlockerEntry, EngagementRegister, RiskEntry, StandupData, WeeklyReviewData } from "../types";

export function registerPath(projectPath: string) {
  return `${projectPath}/engagement-register.json`;
}

export function newRegisterId() {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyRegister(): EngagementRegister {
  return { blockers: [], risks: [] };
}

export async function loadRegister(projectPath: string): Promise<EngagementRegister> {
  return cachedRead(projectCacheKey(projectPath, "register"), async () => {
    try {
      const data = await api.readJson<EngagementRegister>(registerPath(projectPath));
      return {
        blockers: data.blockers ?? [],
        risks: data.risks ?? [],
      };
    } catch {
      return emptyRegister();
    }
  });
}

export async function saveRegister(
  projectPath: string,
  register: EngagementRegister,
): Promise<void> {
  await api.writeJson(registerPath(projectPath), register);
  cacheSet(projectCacheKey(projectPath, "register"), register);
  invalidateDashboard();
  invalidatePortfolio();
}

function normalizeLikelihood(v: string): "Low" | "Medium" | "High" {
  const u = v?.toLowerCase() ?? "";
  if (u.startsWith("l")) return "Low";
  if (u.startsWith("h")) return "High";
  return "Medium";
}

export async function importBlockersFromStandup(
  projectPath: string,
  data: StandupData,
  sourcePath: string,
): Promise<number> {
  const register = await loadRegister(projectPath);
  const existing = new Set(
    register.blockers.map((b) => b.title.toLowerCase().trim()),
  );
  let added = 0;
  const now = new Date().toISOString();

  for (const b of data.blockers) {
    const title = b.blocker?.trim();
    if (!title || title === "—" || title.toLowerCase() === "none") continue;
    if (existing.has(title.toLowerCase())) continue;
    register.blockers.push({
      id: newRegisterId(),
      title,
      owner: b.owner || "",
      escalate: b.escalate,
      status: "open",
      sourcePath,
      createdAt: now,
    });
    existing.add(title.toLowerCase());
    added++;
  }

  if (added) await saveRegister(projectPath, register);
  return added;
}

export async function importRisksFromWeekly(
  projectPath: string,
  data: WeeklyReviewData,
  sourcePath: string,
): Promise<number> {
  const register = await loadRegister(projectPath);
  const existing = new Set(register.risks.map((r) => r.title.toLowerCase().trim()));
  let added = 0;
  const now = new Date().toISOString();

  for (const r of data.risks) {
    const title = r.risk?.trim();
    if (!title || title === "—") continue;
    if (existing.has(title.toLowerCase())) continue;
    register.risks.push({
      id: newRegisterId(),
      title,
      likelihood: normalizeLikelihood(r.likelihood),
      impact: normalizeLikelihood(r.impact),
      mitigation: r.mitigation || "",
      status: "open",
      sourcePath,
      createdAt: now,
    });
    existing.add(title.toLowerCase());
    added++;
  }

  if (added) await saveRegister(projectPath, register);
  return added;
}

export function openBlockers(register: EngagementRegister): BlockerEntry[] {
  return register.blockers.filter((b) => b.status === "open");
}

export function openRisks(register: EngagementRegister): RiskEntry[] {
  return register.risks.filter((r) => r.status === "open");
}
