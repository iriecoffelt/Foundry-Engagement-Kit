import { api } from "./api";
import { isOntologyImportStale } from "./foundryConnection";
import type { OntologyElement } from "../types";

export const ONTOLOGY_ELEMENTS_PATH = "02-design/ontology-elements.json";
const LEGACY_OBJECTS_PATH = "02-design/ontology-objects.json";

interface OntologyElementsFile {
  elements: OntologyElement[];
}

export function ontologyElementsPath(projectPath: string) {
  return `${projectPath}/${ONTOLOGY_ELEMENTS_PATH}`;
}

export function normalizeElementKind(raw: string | undefined): string {
  const kind = raw?.trim() || "objectType";
  const aliases: Record<string, string> = {
    objecttype: "objectType",
    "object-type": "objectType",
    linktype: "linkType",
    "link-type": "linkType",
    actiontype: "actionType",
    "action-type": "actionType",
    function: "function",
    interface: "interface",
    sharedproperty: "sharedProperty",
    "shared-property": "sharedProperty",
  };
  return aliases[kind.toLowerCase()] || kind;
}

function normalizeElement(raw: Partial<OntologyElement>): OntologyElement | null {
  const name = raw.name?.trim();
  if (!name) return null;
  const id = raw.id?.trim() || `ont-el-${Date.now()}`;
  return {
    id,
    kind: normalizeElementKind(raw.kind),
    name,
    description: raw.description?.trim() || "",
    primaryKey: raw.primaryKey?.trim() || undefined,
    properties: raw.properties ?? [],
    linkFrom: raw.linkFrom?.trim() || undefined,
    linkTo: raw.linkTo?.trim() || undefined,
    targetObject: raw.targetObject?.trim() || undefined,
    foundryRid: raw.foundryRid?.trim() || undefined,
    foundryApiName: raw.foundryApiName?.trim() || undefined,
  };
}

async function loadLegacyObjects(projectPath: string): Promise<OntologyElement[]> {
  try {
    const legacy = await api.readJson<
      Array<{
        id: string;
        name: string;
        description: string;
        primaryKey: string;
        properties: string[];
      }>
    >(`${projectPath}/${LEGACY_OBJECTS_PATH}`);
    return (legacy ?? []).map((o) => ({
      id: o.id,
      kind: "objectType",
      name: o.name,
      description: o.description || "",
      primaryKey: o.primaryKey || undefined,
      properties: o.properties ?? [],
    }));
  } catch {
    return [];
  }
}

export async function loadOntologyElements(projectPath: string): Promise<OntologyElement[]> {
  if (await isOntologyImportStale(projectPath)) {
    return [];
  }
  return loadRawOntologyElements(projectPath);
}

/** Load elements from disk without checking whether the selected ontology matches. */
export async function loadRawOntologyElements(projectPath: string): Promise<OntologyElement[]> {
  try {
    const data = await api.readJson<OntologyElementsFile>(ontologyElementsPath(projectPath));
    const elements = (data.elements ?? [])
      .map((e) => normalizeElement(e))
      .filter((e): e is OntologyElement => Boolean(e));
    if (elements.length) return elements;
  } catch {
    /* fall through to legacy */
  }
  return loadLegacyObjects(projectPath);
}

export async function saveOntologyElements(
  projectPath: string,
  elements: OntologyElement[],
): Promise<void> {
  const cleaned = elements
    .map((e) => normalizeElement(e))
    .filter((e): e is OntologyElement => Boolean(e));
  await api.writeJson(ontologyElementsPath(projectPath), { elements: cleaned });
}

export function parsePropertyList(value: string): string[] {
  return value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}
