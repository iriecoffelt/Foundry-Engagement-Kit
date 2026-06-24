import { api } from "./api";
import type { DecisionSummary } from "../types";

export function parseAdrFilename(name: string): { number: number; slug: string } | null {
  const m = name.match(/^adr-(\d+)-(.+)\.md$/i);
  if (!m) return null;
  return { number: parseInt(m[1], 10), slug: m[2] };
}

export function parseAdrMeta(content: string): { title: string; status: string; date: string } {
  const titleMatch = content.match(/^#\s*ADR-\d+:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() || "Untitled";

  const statusMatch = content.match(/\|\s*Status\s*\|\s*([^|]+)\|/i);
  const dateMatch = content.match(/\|\s*Date\s*\|\s*([^|]+)\|/i);

  return {
    title,
    status: statusMatch?.[1]?.trim() || "Proposed",
    date: dateMatch?.[1]?.trim() || "",
  };
}

export async function loadDecisions(projectPath: string): Promise<DecisionSummary[]> {
  const adrDir = `${projectPath}/02-design/adrs`;
  let files: { name: string; path: string }[] = [];
  try {
    const entries = await api.listDirectory(adrDir, false);
    files = entries.filter((e) => !e.is_dir && e.name.endsWith(".md"));
  } catch {
    return [];
  }

  const decisions: DecisionSummary[] = [];
  for (const f of files) {
    const parsed = parseAdrFilename(f.name);
    if (!parsed) continue;
    let meta = { title: parsed.slug, status: "Proposed", date: "" };
    try {
      const content = await api.readFile(f.path);
      meta = parseAdrMeta(content);
    } catch {
      /* use filename */
    }
    decisions.push({
      number: parsed.number,
      title: meta.title,
      status: meta.status,
      date: meta.date,
      path: f.path,
    });
  }

  return decisions.sort((a, b) => a.number - b.number);
}

export function decisionStatusTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("accept")) return "text-emerald-400";
  if (s.includes("super")) return "text-fg-muted";
  if (s.includes("reject")) return "text-red-400";
  return "text-amber-400";
}
