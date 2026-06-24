import { todayISO } from "./markdown";

export const ADR_STATUSES = ["Proposed", "Accepted", "Deprecated", "Superseded"] as const;
export type AdrStatus = (typeof ADR_STATUSES)[number];

export interface AdrData {
  number: number;
  title: string;
  status: string;
  deciders: string;
  context: string;
  decision: string;
  alternativeA: string;
  alternativeB: string;
  consequences: string;
}

export function generateAdrMarkdown(data: AdrData): string {
  const num = String(data.number).padStart(3, "0");

  return `# ADR-${num}: ${data.title}

| Field | Value |
|-------|-------|
| Status | ${data.status || "Proposed"} |
| Date | ${todayISO()} |
| Deciders | ${data.deciders || "—"} |
| Supersedes | |

---

## Context

${data.context || "What is the issue or forcing function?"}

## Decision

${data.decision || "What did we decide?"}

## Alternatives considered

### Option A

${data.alternativeA || "**Pros:**\n**Cons:**"}

### Option B

${data.alternativeB || "**Pros:**\n**Cons:**"}

## Consequences

${data.consequences || "**Positive:**\n\n**Negative / tradeoffs:**\n\n**Follow-up actions:**"}

## References

- 
`;
}

export function adrDestPath(projectPath: string, data: AdrData): string {
  const num = String(data.number).padStart(3, "0");
  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "decision";
  return `${projectPath}/02-design/adrs/adr-${num}-${slug}.md`;
}
