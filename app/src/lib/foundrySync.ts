/**
 * Foundry Sync - Convert Foundry metadata to app formats
 * FDE-safe: Only syncs schema metadata, not customer data
 */

import type { OntologyElement } from "../types";
import type {
  FoundryObjectType,
  FoundryLinkType,
  FoundryActionType,
  FoundryFullMetadata,
} from "./foundryTypes";

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
    primaryKey: obj.primaryKey,
    properties,
  };
}

/**
 * Convert Foundry link type to OntologyElement
 */
export function linkTypeToElement(link: FoundryLinkType): OntologyElement {
  return {
    id: `foundry-link-${link.apiName}`,
    kind: "linkType",
    name: link.displayName || link.apiName,
    description: link.description || `${link.cardinality} relationship`,
    properties: [],
    linkFrom: link.objectTypeApiNameA,
    linkTo: link.objectTypeApiNameB,
  };
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
  };
}

/**
 * Convert full Foundry metadata to OntologyElements
 */
export function metadataToElements(
  metadata: FoundryFullMetadata,
): OntologyElement[] {
  const elements: OntologyElement[] = [];

  // Convert object types
  for (const obj of Object.values(metadata.objectTypes || {})) {
    elements.push(objectTypeToElement(obj));
  }

  // Convert link types
  for (const link of Object.values(metadata.linkTypes || {})) {
    elements.push(linkTypeToElement(link));
  }

  // Convert action types
  for (const action of Object.values(metadata.actionTypes || {})) {
    elements.push(actionTypeToElement(action));
  }

  // Convert interface types as a special "interface" kind
  for (const iface of Object.values(metadata.interfaceTypes || {})) {
    const properties = Object.values(iface.properties || {}).map(
      (p) => p.apiName || "unknown",
    );
    elements.push({
      id: `foundry-iface-${iface.apiName}`,
      kind: "interface",
      name: iface.displayName || iface.apiName,
      description: iface.description || "",
      properties,
    });
  }

  // Convert query types (functions) 
  for (const query of Object.values(metadata.queryTypes || {})) {
    elements.push({
      id: `foundry-query-${query.apiName}`,
      kind: "function",
      name: query.displayName || query.apiName,
      description: query.description || "",
      properties: [],
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
    const key = `${el.kind}:${el.name.toLowerCase()}`;
    byName.set(key, el);
  }

  // Foundry elements override existing
  for (const el of fromFoundry) {
    const key = `${el.kind}:${el.name.toLowerCase()}`;
    const existing = byName.get(key);
    if (existing) {
      // Preserve local ID but update other fields
      byName.set(key, { ...el, id: existing.id });
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
