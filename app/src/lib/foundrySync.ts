/**
 * Foundry Sync - Convert Foundry metadata to app formats
 * FDE-safe: Only syncs schema metadata, not customer data
 */

import type { OntologyElement } from "../types";
import type { FoundryApiClient } from "./foundryApi";
import type {
  FoundryObjectType,
  FoundryLinkType,
  FoundryActionType,
  FoundryFullMetadata,
} from "./foundryTypes";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readApiName(record: Record<string, unknown>): string | undefined {
  const name = record.apiName ?? record.api_name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

function unwrapObjectType(entry: unknown): FoundryObjectType | null {
  const record = asRecord(entry);
  if (!record) return null;

  const nested = record.objectType ?? record.object_type;
  const source = (nested && typeof nested === "object" ? nested : record) as Record<
    string,
    unknown
  >;
  const apiName = readApiName(source);
  if (!apiName) return null;

  return {
    ...(source as unknown as FoundryObjectType),
    apiName,
    displayName: String(
      source.displayName ?? source.display_name ?? apiName,
    ),
    primaryKey:
      (source.primaryKey as FoundryObjectType["primaryKey"]) ??
      (source.primary_key as FoundryObjectType["primaryKey"]) ??
      "",
    properties:
      (source.properties as FoundryObjectType["properties"]) ?? {},
    rid: String(source.rid ?? ""),
  };
}

function unwrapLinkType(entry: unknown): FoundryLinkType | null {
  const record = asRecord(entry);
  if (!record) return null;

  const nested = record.linkType ?? record.link_type;
  if (nested && typeof nested === "object") {
    return unwrapLinkType(nested);
  }

  const apiName = readApiName(record);
  if (apiName) {
    return {
      ...(record as unknown as FoundryLinkType),
      apiName,
      displayName: String(record.displayName ?? record.display_name ?? apiName),
      rid: String(record.rid ?? record.linkTypeRid ?? record.link_type_rid ?? ""),
    };
  }

  return null;
}

function unwrapActionType(entry: unknown): FoundryActionType | null {
  const record = asRecord(entry);
  if (!record) return null;

  if (typeof record.apiName === "string") {
    return record as unknown as FoundryActionType;
  }

  return null;
}

function normalizePrimaryKey(primaryKey: FoundryObjectType["primaryKey"]): string | undefined {
  if (Array.isArray(primaryKey)) {
    return primaryKey[0];
  }
  return primaryKey || undefined;
}

function normalizeFullMetadata(raw: FoundryFullMetadata): FoundryFullMetadata {
  const objectTypes: Record<string, FoundryObjectType> = {};
  for (const [key, entry] of Object.entries(raw.objectTypes || {})) {
    const obj = unwrapObjectType(entry);
    if (obj) objectTypes[obj.apiName || key] = obj;
  }

  const linkTypes: Record<string, FoundryLinkType> = {};
  const addLink = (link: FoundryLinkType) => {
    linkTypes[link.apiName] = link;
  };

  for (const entry of Object.values(raw.linkTypes || {})) {
    const link = unwrapLinkType(entry);
    if (link) addLink(link);
  }

  // Nested LinkTypeSideV2 entries on object types are handled in collectLinkTypeElements.

  const actionTypes: Record<string, FoundryActionType> = {};
  for (const [key, entry] of Object.entries(raw.actionTypes || {})) {
    const action = unwrapActionType(entry);
    if (action) actionTypes[action.apiName || key] = action;
  }

  return {
    ...raw,
    objectTypes,
    linkTypes,
    actionTypes,
    interfaceTypes: raw.interfaceTypes || {},
    queryTypes: raw.queryTypes || {},
  };
}

function objectTypeEntryKey(
  raw: FoundryFullMetadata,
  apiName: string,
  rid?: string,
): string | undefined {
  if (rid) {
    for (const [key, entry] of Object.entries(raw.objectTypes || {})) {
      const obj = unwrapObjectType(entry);
      if (obj?.rid === rid) return key;
    }
  }
  if (raw.objectTypes?.[apiName]) return apiName;
  for (const [key, entry] of Object.entries(raw.objectTypes || {})) {
    if (unwrapObjectType(entry)?.apiName === apiName) return key;
  }
  return undefined;
}

/** Attach outgoing link sides to object type wrappers when endpoints are missing. */
async function enrichMetadataWithOutgoingLinks(
  client: FoundryApiClient,
  ontologyRid: string,
  raw: FoundryFullMetadata,
): Promise<FoundryFullMetadata> {
  let enriched = await enrichViaOutgoingLinkBatch(client, ontologyRid, raw);
  enriched = await enrichViaOutgoingLinkLists(client, ontologyRid, enriched, true);
  return enriched;
}

async function enrichViaOutgoingLinkBatch(
  client: FoundryApiClient,
  ontologyRid: string,
  raw: FoundryFullMetadata,
): Promise<FoundryFullMetadata> {
  const normalized = normalizeFullMetadata(raw);
  const entries = Object.values(normalized.objectTypes || {}).filter((obj) => obj.rid);
  if (entries.length === 0) return raw;

  const objectTypes: Record<string, unknown> = { ...raw.objectTypes };
  const CHUNK = 100;

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    const rids = chunk.map((obj) => obj.rid);
    let response: { data?: Record<string, unknown[]> };
    try {
      response = await client.getOutgoingLinkTypesByRidBatch(ontologyRid, rids);
    } catch {
      continue;
    }

    for (const obj of chunk) {
      const linkSides =
        response.data?.[obj.rid] ??
        response.data?.[obj.rid.toLowerCase()] ??
        [];
      if (!Array.isArray(linkSides) || linkSides.length === 0) continue;

      const key = objectTypeEntryKey(raw, obj.apiName, obj.rid);
      if (!key) continue;

      const entry = objectTypes[key];
      const record = asRecord(entry) || {};
      objectTypes[key] = {
        ...record,
        linkTypes: linkSides,
        link_types: linkSides,
      };
    }
  }

  return { ...raw, objectTypes: objectTypes as FoundryFullMetadata["objectTypes"] };
}

async function enrichViaOutgoingLinkLists(
  client: FoundryApiClient,
  ontologyRid: string,
  raw: FoundryFullMetadata,
  onlyMissing = false,
): Promise<FoundryFullMetadata> {
  const normalized = normalizeFullMetadata(raw);
  const apiNames = Object.values(normalized.objectTypes || {})
    .filter((obj) => {
      if (!onlyMissing) return true;
      const key = objectTypeEntryKey(raw, obj.apiName, obj.rid);
      if (!key) return true;
      const record = asRecord(raw.objectTypes?.[key]);
      const nested = record?.linkTypes ?? record?.link_types;
      return !Array.isArray(nested) || nested.length === 0;
    })
    .map((obj) => obj.apiName);
  if (apiNames.length === 0) return raw;

  const objectTypes: Record<string, unknown> = { ...raw.objectTypes };
  const CONCURRENCY = 12;

  for (let i = 0; i < apiNames.length; i += CONCURRENCY) {
    const batch = apiNames.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (apiName) => {
        try {
          const linkSides = await client.listAllOutgoingLinkTypes(ontologyRid, apiName);
          if (!Array.isArray(linkSides) || linkSides.length === 0) return;

          const key = objectTypeEntryKey(raw, apiName);
          if (!key) return;

          const record = asRecord(objectTypes[key]) || {};
          objectTypes[key] = {
            ...record,
            linkTypes: linkSides,
            link_types: linkSides,
          };
        } catch {
          // Skip object types we cannot read.
        }
      }),
    );
  }

  return { ...raw, objectTypes: objectTypes as FoundryFullMetadata["objectTypes"] };
}

/**
 * Load ontology schema from Foundry, preferring fullMetadata with list-endpoint fallback.
 * Returns raw metadata (not normalized) so nested outgoing link sides are preserved.
 */
export async function fetchOntologyMetadata(
  client: FoundryApiClient,
  ontologyRid: string,
): Promise<FoundryFullMetadata> {
  let raw: FoundryFullMetadata;

  try {
    raw = await client.getFullMetadata(ontologyRid);
    const normalized = normalizeFullMetadata(raw);
    const hasContent =
      Object.keys(normalized.objectTypes).length > 0 ||
      Object.keys(normalized.linkTypes).length > 0 ||
      Object.keys(normalized.actionTypes).length > 0;

    if (!hasContent) throw new Error("fullMetadata empty");
  } catch {
    raw = await client.loadOntologySchema(ontologyRid);
  }

  return enrichMetadataWithOutgoingLinks(client, ontologyRid, raw);
}

/**
 * Convert Foundry object type to OntologyElement
 */
export function objectTypeToElement(obj: FoundryObjectType): OntologyElement {
  const properties = Object.values(obj.properties || {}).map(
    (p) => p.apiName || p.displayName || "unknown",
  );

  return {
    id: `foundry-obj-${obj.apiName}`,
    kind: "objectType",
    name: obj.displayName || obj.apiName,
    description: obj.description || "",
    primaryKey: normalizePrimaryKey(obj.primaryKey),
    properties,
    foundryRid: obj.rid,
    foundryApiName: obj.apiName,
  };
}

/**
 * Convert Foundry link type to OntologyElement
 */
function linkTypeEndpoints(link: FoundryLinkType): { from: string; to: string } {
  const raw = link as FoundryLinkType & Record<string, unknown>;
  const sideA = asRecord(raw.sideA ?? raw.side_a ?? raw.objectTypeSideA);
  const sideB = asRecord(raw.sideB ?? raw.side_b ?? raw.objectTypeSideB);
  const from =
    link.objectTypeApiNameA ||
    raw.objectTypeOneSide ||
    raw.objectTypeSideA ||
    raw.sourceObjectTypeApiName ||
    raw.object_type_one_side ||
    raw.object_type_api_name_a ||
    raw.object_type_side_a ||
    (sideA
      ? String(sideA.objectTypeApiName ?? sideA.object_type_api_name ?? "")
      : undefined);
  const to =
    link.objectTypeApiNameB ||
    raw.objectTypeOtherSide ||
    raw.objectTypeSideB ||
    raw.targetObjectTypeApiName ||
    raw.object_type_other_side ||
    raw.object_type_api_name_b ||
    raw.object_type_side_b ||
    (sideB
      ? String(sideB.objectTypeApiName ?? sideB.object_type_api_name ?? "")
      : undefined);
  return {
    from: typeof from === "string" ? from : "",
    to: typeof to === "string" ? to : "",
  };
}

function linkApiName(link: FoundryLinkType): string {
  const raw = link as FoundryLinkType & Record<string, unknown>;
  return String(link.apiName || raw.api_name || "link");
}

export function linkTypeToElement(link: FoundryLinkType): OntologyElement {
  const { from, to } = linkTypeEndpoints(link);
  const apiName = linkApiName(link);
  return {
    id: `foundry-link-${apiName}`,
    kind: "linkType",
    name: link.displayName || apiName,
    description: link.description || `${link.cardinality} relationship`,
    properties: [],
    linkFrom: from,
    linkTo: to,
    foundryRid: link.rid,
    foundryApiName: apiName,
  };
}

function collectLinkTypeElements(
  normalized: FoundryFullMetadata,
  raw: FoundryFullMetadata,
): OntologyElement[] {
  const links = new Map<string, OntologyElement>();
  const apiByRid = new Map<string, string>();

  for (const obj of Object.values(normalized.objectTypes || {})) {
    if (obj.rid && obj.apiName) apiByRid.set(obj.rid, obj.apiName);
  }

  const resolveEndpoint = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("ri.")) return apiByRid.get(trimmed) || "";
    return trimmed;
  };

  const add = (
    from: string,
    to: string,
    linkApi: string,
    label: string,
    rid?: string,
  ) => {
    const source = resolveEndpoint(from);
    const target = resolveEndpoint(to);
    const api = linkApi.trim();
    if (!source || !target || !api || source.startsWith("ri.")) return;
    const key = `${source.toLowerCase()}->${target.toLowerCase()}:${api.toLowerCase()}`;
    if (links.has(key)) return;
    links.set(key, {
      id: `foundry-link-${api}`,
      kind: "linkType",
      name: label || api,
      description: "",
      properties: [],
      linkFrom: source,
      linkTo: target,
      foundryRid: rid,
      foundryApiName: api,
    });
  };

  for (const link of Object.values(normalized.linkTypes || {})) {
    const el = linkTypeToElement(link);
    if (el.linkFrom && el.linkTo) {
      add(el.linkFrom, el.linkTo, linkApiName(link), el.name, link.rid);
    }
  }

  for (const [objKey, entry] of Object.entries(raw.objectTypes || {})) {
    const obj = unwrapObjectType(entry);
    const sourceApi = obj?.apiName || (objKey.startsWith("ri.") ? "" : objKey);
    if (!sourceApi) continue;
    const record = asRecord(entry);
    const nestedLinks = record?.linkTypes ?? record?.link_types;
    if (!Array.isArray(nestedLinks)) continue;

    for (const side of nestedLinks) {
      const sideRecord = asRecord(side);
      if (!sideRecord) continue;
      const linkApi = readApiName(sideRecord) || "";
      const targetApi = String(
        sideRecord.objectTypeApiName ??
          sideRecord.object_type_api_name ??
          "",
      );
      const label = String(
        sideRecord.displayName ?? sideRecord.display_name ?? linkApi,
      );
      const rid = String(
        sideRecord.linkTypeRid ?? sideRecord.link_type_rid ?? "",
      );
      add(sourceApi, targetApi, linkApi, label, rid || undefined);
    }
  }

  return [...links.values()];
}

export interface OntologyLinkEdgeSpec {
  fromApi: string;
  toApi: string;
  linkApi: string;
  label?: string;
}

/** Directed link edges for the ontology architecture graph. */
export function extractOntologyLinkEdges(
  metadata: FoundryFullMetadata,
): OntologyLinkEdgeSpec[] {
  const normalized = normalizeFullMetadata(metadata);
  return collectLinkTypeElements(normalized, metadata)
    .filter((el) => el.linkFrom && el.linkTo && el.foundryApiName)
    .map((el) => ({
      fromApi: el.linkFrom!,
      toApi: el.linkTo!,
      linkApi: el.foundryApiName!,
      label: el.name,
    }));
}

export function countWiredLinkTypes(metadata: FoundryFullMetadata): number {
  return extractOntologyLinkEdges(metadata).length;
}

/**
 * Convert Foundry action type to OntologyElement
 */
export function actionTypeToElement(action: FoundryActionType): OntologyElement {
  const paramNames = Object.keys(action.parameters || {});
  const targetObj = paramNames.length > 0 ? paramNames[0] : undefined;

  return {
    id: `foundry-action-${action.apiName}`,
    kind: "actionType",
    name: action.displayName || action.apiName,
    description: action.description || "",
    properties: paramNames,
    targetObject: targetObj,
    foundryRid: action.rid,
  };
}

/**
 * Convert full Foundry metadata to OntologyElements
 */
export function metadataToElements(
  metadata: FoundryFullMetadata,
): OntologyElement[] {
  const normalized = normalizeFullMetadata(metadata);
  const elements: OntologyElement[] = [];

  // Convert object types
  for (const obj of Object.values(normalized.objectTypes || {})) {
    elements.push(objectTypeToElement(obj));
  }

  // Link types from flat list + nested outgoing sides on each object type
  elements.push(...collectLinkTypeElements(normalized, metadata));

  // Convert action types
  for (const action of Object.values(normalized.actionTypes || {})) {
    elements.push(actionTypeToElement(action));
  }

  // Convert interface types as a special "interface" kind
  for (const iface of Object.values(normalized.interfaceTypes || {})) {
    const properties = Object.values(iface.properties || {}).map(
      (p) => p.apiName || "unknown",
    );
    elements.push({
      id: `foundry-iface-${iface.apiName}`,
      kind: "interface",
      name: iface.displayName || iface.apiName,
      description: iface.description || "",
      properties,
      foundryRid: iface.rid,
    });
  }

  // Convert query types (functions) 
  for (const query of Object.values(normalized.queryTypes || {})) {
    elements.push({
      id: `foundry-query-${query.apiName}`,
      kind: "function",
      name: query.displayName || query.apiName,
      description: query.description || "",
      properties: [],
      foundryRid: query.rid,
    });
  }

  return elements;
}

/**
 * Merge Foundry elements with existing elements
 * Foundry elements take precedence for matching names
 */
export function mergeElements(
  existing: OntologyElement[],
  fromFoundry: OntologyElement[],
): OntologyElement[] {
  const byName = new Map<string, OntologyElement>();

  // Add existing elements first
  for (const el of existing) {
    const key =
      el.kind === "linkType" && el.foundryApiName
        ? `linkType:${el.foundryApiName.toLowerCase()}`
        : `${el.kind}:${el.name.toLowerCase()}`;
    byName.set(key, el);
  }

  // Foundry elements override existing
  for (const el of fromFoundry) {
    const key =
      el.kind === "linkType" && el.foundryApiName
        ? `linkType:${el.foundryApiName.toLowerCase()}`
        : `${el.kind}:${el.name.toLowerCase()}`;
    const prev = byName.get(key);
    if (prev) {
      // Preserve local ID but update fields from Foundry
      byName.set(key, {
        ...el,
        id: prev.id,
        foundryRid: el.foundryRid || prev.foundryRid,
        foundryApiName: el.foundryApiName || prev.foundryApiName,
        linkFrom: el.linkFrom || prev.linkFrom,
        linkTo: el.linkTo || prev.linkTo,
      });
    } else {
      byName.set(key, el);
    }
  }

  return Array.from(byName.values());
}

/**
 * Count elements by kind
 */
export function countElementsByKind(
  elements: OntologyElement[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const el of elements) {
    counts[el.kind] = (counts[el.kind] || 0) + 1;
  }
  return counts;
}

/**
 * Generate sync summary message
 */
export function generateSyncSummary(
  elements: OntologyElement[],
): string {
  const counts = countElementsByKind(elements);
  const parts: string[] = [];

  if (counts.objectType) parts.push(`${counts.objectType} object types`);
  if (counts.linkType) parts.push(`${counts.linkType} link types`);
  if (counts.actionType) parts.push(`${counts.actionType} action types`);
  if (counts.interface) parts.push(`${counts.interface} interfaces`);
  if (counts.function) parts.push(`${counts.function} functions`);

  if (parts.length === 0) return "No elements found in Foundry ontology";
  return `Imported: ${parts.join(", ")}`;
}
