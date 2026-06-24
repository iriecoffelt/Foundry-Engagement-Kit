import { api } from "./api";
import { engagementFromJson } from "./markdown";
import type { Stakeholder } from "../types";

export const INFLUENCE_LEVELS = ["H", "M", "L"] as const;
export type InfluenceLevel = (typeof INFLUENCE_LEVELS)[number];

export function emptyStakeholder(): Stakeholder {
  return {
    id: `sh-${Date.now()}`,
    name: "",
    role: "",
    influence: "M",
    interest: "M",
    notes: "",
  };
}

export function normalizeLevel(value: string): InfluenceLevel {
  const v = value.trim().toUpperCase();
  if (v === "H" || v === "HIGH") return "H";
  if (v === "L" || v === "LOW") return "L";
  return "M";
}

export function levelLabel(level: InfluenceLevel): string {
  return level === "H" ? "High" : level === "L" ? "Low" : "Medium";
}

export function quadrantLabel(influence: string, interest: string): string {
  const inf = normalizeLevel(influence);
  const int = normalizeLevel(interest);
  if (inf === "H" && int === "H") return "Manage closely";
  if (inf === "H" && int === "L") return "Keep satisfied";
  if (inf === "L" && int === "H") return "Keep informed";
  if (inf === "L" && int === "L") return "Monitor";
  if (inf === "H" || int === "H") return "Key contact";
  return "Peripheral";
}

/** Map H/M/L to 15–85% for matrix placement with slight id-based offset. */
export function matrixPosition(
  influence: string,
  interest: string,
  id: string,
): { x: number; y: number } {
  const levelX = { L: 22, M: 50, H: 78 };
  const levelY = { L: 78, M: 50, H: 22 };
  const inf = normalizeLevel(influence);
  const int = normalizeLevel(interest);
  const jitter = (parseInt(id.replace(/\D/g, "").slice(-3) || "0", 10) % 7) - 3;
  return {
    x: Math.min(88, Math.max(12, levelX[inf] + jitter)),
    y: Math.min(88, Math.max(12, levelY[int] + jitter * 0.8)),
  };
}

function parseStakeholderTable(content: string): Stakeholder[] {
  const headings = ["Stakeholder map", "Stakeholders"];
  let section = "";
  for (const h of headings) {
    const body = content.match(new RegExp(`## ${h}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
    if (body?.[1]) {
      section = body[1];
      break;
    }
  }
  if (!section) return [];

  const lines = section.split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 3) return [];

  const header = lines[0].toLowerCase();
  const hasInterest = header.includes("interest");

  return lines.slice(2).flatMap((line, i) => {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (!cells[0] || cells[0] === "—") return [];

    if (hasInterest && cells.length >= 4) {
      return [
        {
          id: `sh-import-${i}`,
          name: cells[0],
          role: cells[1] || "",
          influence: normalizeLevel(cells[2] || "M"),
          interest: normalizeLevel(cells[3] || "M"),
          notes: cells[4] || "",
        },
      ];
    }

    return [
      {
        id: `sh-import-${i}`,
        name: cells[0],
        role: cells[1] || "",
        influence: normalizeLevel(cells[2] || "M"),
        interest: "M",
        notes: cells[3] || "",
      },
    ];
  });
}

function withIds(raw: unknown[]): Stakeholder[] {
  return raw.map((item, i) => {
    const s = item as Partial<Stakeholder>;
    return {
      id: s.id || `sh-${i}-${Date.now()}`,
      name: String(s.name || ""),
      role: String(s.role || ""),
      influence: normalizeLevel(String(s.influence || "M")),
      interest: normalizeLevel(String(s.interest || "M")),
      notes: String(s.notes || ""),
    };
  });
}

export async function loadStakeholders(
  projectPath: string,
  fallback?: { displayName?: string; customer?: string; status?: string; targetGoLive?: string },
): Promise<Stakeholder[]> {
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    const fromJson = eng.stakeholders;
    if (Array.isArray(fromJson) && fromJson.length > 0) {
      return withIds(fromJson).filter((s) => s.name.trim() || s.role.trim());
    }
    const data = engagementFromJson(eng, fallback);
    if (data.stakeholders.length) return data.stakeholders;
  } catch {
    /* fall through */
  }

  try {
    const discovery = await api.readFile(`${projectPath}/00-discovery/discovery.md`);
    return parseStakeholderTable(discovery);
  } catch {
    return [];
  }
}

export function stakeholderTableMarkdown(stakeholders: Stakeholder[]): string {
  const rows = stakeholders
    .filter((s) => s.name.trim() || s.role.trim())
    .map(
      (s) =>
        `| ${s.name || "—"} | ${s.role || "—"} | ${s.influence} | ${s.interest} | ${s.notes || "—"} |`,
    );
  return `## Stakeholder map

| Name | Role | Influence | Interest | Notes |
|------|------|-----------|----------|-------|
${rows.length ? rows.join("\n") : "| | | H / M / L | H / M / L | |"}
`;
}

export async function syncDiscoveryStakeholders(
  projectPath: string,
  stakeholders: Stakeholder[],
): Promise<void> {
  const discoveryPath = `${projectPath}/00-discovery/discovery.md`;
  const table = stakeholderTableMarkdown(stakeholders);

  try {
    let content = await api.readFile(discoveryPath);
    const marker = /## Stakeholder map[\s\S]*?(?=\n## |$)/;
    if (marker.test(content)) {
      content = content.replace(marker, table.trimEnd());
    } else {
      const stakeholdersHeading = /## Stakeholders[\s\S]*?(?=\n## |$)/;
      if (stakeholdersHeading.test(content)) {
        content = content.replace(stakeholdersHeading, table.trimEnd());
      } else {
        const insertAt = content.indexOf("\n## ");
        if (insertAt > 0) {
          content = `${content.slice(0, insertAt)}\n\n${table}${content.slice(insertAt)}`;
        } else {
          content = `${content.trimEnd()}\n\n${table}`;
        }
      }
    }
    await api.writeFile(discoveryPath, content);
  } catch {
    await api.writeFile(discoveryPath, `# Discovery\n\n${table}`);
  }
}

export async function saveStakeholders(
  projectPath: string,
  stakeholders: Stakeholder[],
): Promise<void> {
  const cleaned = stakeholders.map((s) => ({
    id: s.id || `sh-${Date.now()}`,
    name: s.name.trim(),
    role: s.role.trim(),
    influence: normalizeLevel(s.influence),
    interest: normalizeLevel(s.interest || "M"),
    notes: s.notes.trim(),
  }));

  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    await api.writeJson(`${projectPath}/engagement.json`, { ...eng, stakeholders: cleaned });
  } catch {
    await api.writeJson(`${projectPath}/engagement.json`, { stakeholders: cleaned });
  }

  await syncDiscoveryStakeholders(projectPath, cleaned);
}
