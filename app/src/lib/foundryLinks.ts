import { api } from "./api";

export type FoundryLinkableNodeType =
  | "dataset"
  | "objectType"
  | "workshop"
  | "pipeline"
  | "function";

const LINKABLE: FoundryLinkableNodeType[] = [
  "dataset",
  "objectType",
  "workshop",
  "pipeline",
  "function",
];

export function supportsFoundryLink(nodeType: string): nodeType is FoundryLinkableNodeType {
  return LINKABLE.includes(nodeType as FoundryLinkableNodeType);
}

export function normalizeStackUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** Read stack URL from engagement.json if present. */
export function stackUrlFromEngagement(eng: Record<string, unknown> | null): string {
  if (!eng) return "";
  const foundry = eng.foundry as Record<string, unknown> | undefined;
  const candidates = [
    eng.foundryStackUrl,
    eng.stackUrl,
    foundry?.stackUrl,
    foundry?.url,
    eng.enrollment,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return normalizeStackUrl(c);
  }
  return "";
}

export async function loadProjectStackUrl(projectPath: string): Promise<string> {
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    return stackUrlFromEngagement(eng);
  } catch {
    return "";
  }
}

export async function saveProjectStackUrl(projectPath: string, url: string): Promise<void> {
  const foundryStackUrl = normalizeStackUrl(url);
  try {
    const eng = await api.readJson<Record<string, unknown>>(`${projectPath}/engagement.json`);
    await api.writeJson(`${projectPath}/engagement.json`, { ...eng, foundryStackUrl });
  } catch {
    await api.writeJson(`${projectPath}/engagement.json`, { foundryStackUrl });
  }
}

const LINK_HINTS: Record<FoundryLinkableNodeType, string> = {
  dataset: "Dataset RID or URL — ri.foundry.main.dataset…",
  objectType: "Object type RID or ontology URL",
  workshop: "Workshop app RID or URL",
  pipeline: "Pipeline RID or URL",
  function: "Function or code repository RID or URL",
};

export function foundryLinkPlaceholder(nodeType: FoundryLinkableNodeType): string {
  return LINK_HINTS[nodeType];
}

/**
 * Resolve a pasted Foundry URL, RID, or workspace path into a browser-openable URL.
 * Uses Foundry's navigation resolver for RIDs when a stack base is configured.
 */
export function resolveFoundryUrl(stackUrl: string, linkOrRid: string): string {
  const value = linkOrRid.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  const base = normalizeStackUrl(stackUrl);
  if (!base) {
    throw new Error("Set this project's Foundry stack URL before opening RIDs.");
  }

  if (value.startsWith("ri.")) {
    return `${base}/workspace/navigation/resolve/${encodeURIComponent(value)}`;
  }

  if (value.startsWith("/")) {
    return `${base}${value}`;
  }

  if (value.startsWith("workspace/")) {
    return `${base}/${value}`;
  }

  return `${base}/workspace/navigation/resolve/${encodeURIComponent(value)}`;
}

export async function openFoundryLink(
  stackUrl: string,
  linkOrRid: string,
  openUrl: (url: string) => Promise<void>,
): Promise<void> {
  const url = resolveFoundryUrl(stackUrl, linkOrRid);
  if (!url) {
    throw new Error("No Foundry link configured for this node.");
  }
  await openUrl(url);
}
