import { api } from "./api";

export interface DocumentTemplate {
  id: string;
  label: string;
  templatePath: string;
  destPattern: string;
  category: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "adr",
    label: "Architecture Decision Record",
    templatePath: "project/_template/02-design/adrs/adr-001-template.md",
    destPattern: "02-design/adrs/adr-{n}-{slug}.md",
    category: "Design",
  },
  {
    id: "pipeline-design",
    label: "Pipeline design",
    templatePath: "project/_template/02-design/pipeline-design.md",
    destPattern: "02-design/pipeline-design.md",
    category: "Design",
  },
  {
    id: "design-overview",
    label: "Design overview",
    templatePath: "project/_template/02-design/design-overview.md",
    destPattern: "02-design/design-overview.md",
    category: "Design",
  },
  {
    id: "workshop-spec",
    label: "Workshop spec",
    templatePath: "project/_template/02-design/workshop-spec.md",
    destPattern: "02-design/workshop-spec.md",
    category: "Design",
  },
  {
    id: "security",
    label: "Security & permissions",
    templatePath: "project/_template/02-design/security-permissions.md",
    destPattern: "02-design/security-permissions.md",
    category: "Design",
  },
  {
    id: "build-tracker",
    label: "Build tracker",
    templatePath: "project/_template/03-build/build-tracker.md",
    destPattern: "03-build/build-tracker.md",
    category: "Build",
  },
  {
    id: "go-live",
    label: "Go-live checklist",
    templatePath: "project/_template/04-deploy/go-live-checklist.md",
    destPattern: "04-deploy/go-live-checklist.md",
    category: "Deploy",
  },
  {
    id: "runbook",
    label: "Runbook",
    templatePath: "project/_template/04-deploy/runbook.md",
    destPattern: "04-deploy/runbook.md",
    category: "Deploy",
  },
  {
    id: "handoff",
    label: "Handoff doc",
    templatePath: "project/_template/05-handoff/handoff.md",
    destPattern: "05-handoff/handoff.md",
    category: "Handoff",
  },
  {
    id: "discovery",
    label: "Discovery notes",
    templatePath: "project/_template/00-discovery/discovery.md",
    destPattern: "00-discovery/discovery.md",
    category: "Discovery",
  },
  {
    id: "scoping",
    label: "Scoping doc",
    templatePath: "project/_template/01-scoping/scoping.md",
    destPattern: "01-scoping/scoping.md",
    category: "Scoping",
  },
];

export async function listDocumentTemplates(): Promise<DocumentTemplate[]> {
  const available: DocumentTemplate[] = [];
  for (const t of DOCUMENT_TEMPLATES) {
    try {
      await api.readFile(t.templatePath);
      available.push(t);
    } catch {
      /* missing */
    }
  }
  return available;
}

export async function nextAdrNumber(projectPath: string): Promise<number> {
  try {
    const entries = await api.listDirectory(`${projectPath}/02-design/adrs`, false);
    const nums = entries
      .map((e) => {
        const m = e.name.match(/^adr-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    return nums.length ? Math.max(...nums) + 1 : 1;
  } catch {
    return 1;
  }
}

export async function createFromTemplate(
  projectPath: string,
  template: DocumentTemplate,
): Promise<string> {
  const content = await api.readFile(template.templatePath);
  const destRelative = template.destPattern;
  const fullDest = `${projectPath}/${destRelative}`;
  try {
    await api.readFile(fullDest);
    throw new Error(`File already exists: ${destRelative}`);
  } catch (e) {
    if (String(e).includes("already exists")) throw e;
  }
  await api.createFile(fullDest, content);
  return fullDest;
}
