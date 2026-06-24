import { api } from "./api";
import {
  DELIVERY_COLOR_HEX,
  DELIVERY_COLOR_STYLES,
  DELIVERY_TYPE_COLORS,
  type DeliveryTypeColor,
} from "./deliveryTypes";

export const ONTOLOGY_ELEMENT_TYPES_PATH = "reference/ontology-element-types.json";

export interface OntologyElementTypeDefinition {
  id: string;
  label: string;
  color: DeliveryTypeColor;
  /** Show primary key field (object types) */
  showPrimaryKey: boolean;
  /** Show comma-separated properties field */
  showProperties: boolean;
  /** Show link from / link to fields */
  showLinkEndpoints: boolean;
  /** Show target object field (actions) */
  showTargetObject: boolean;
  /** Architecture diagram node type when using Add to diagram */
  architectureNodeTypeId?: string;
}

export const DEFAULT_ONTOLOGY_ELEMENT_TYPES: OntologyElementTypeDefinition[] = [
  {
    id: "objectType",
    label: "Object type",
    color: "emerald",
    showPrimaryKey: true,
    showProperties: true,
    showLinkEndpoints: false,
    showTargetObject: false,
    architectureNodeTypeId: "objectType",
  },
  {
    id: "linkType",
    label: "Link type",
    color: "cyan",
    showPrimaryKey: false,
    showProperties: false,
    showLinkEndpoints: true,
    showTargetObject: false,
  },
  {
    id: "actionType",
    label: "Action type",
    color: "orange",
    showPrimaryKey: false,
    showProperties: false,
    showLinkEndpoints: false,
    showTargetObject: true,
  },
  {
    id: "function",
    label: "Function",
    color: "violet",
    showPrimaryKey: false,
    showProperties: false,
    showLinkEndpoints: false,
    showTargetObject: false,
    architectureNodeTypeId: "function",
  },
  {
    id: "interface",
    label: "Interface",
    color: "indigo",
    showPrimaryKey: false,
    showProperties: true,
    showLinkEndpoints: false,
    showTargetObject: false,
  },
  {
    id: "sharedProperty",
    label: "Shared property",
    color: "slate",
    showPrimaryKey: false,
    showProperties: false,
    showLinkEndpoints: false,
    showTargetObject: false,
  },
];

interface OntologyElementTypesFile {
  types: OntologyElementTypeDefinition[];
}

function slugifyId(label: string): string {
  const base = label
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "element";
}

function normalizeElementType(
  raw: Partial<OntologyElementTypeDefinition>,
): OntologyElementTypeDefinition | null {
  const id = (raw.id || slugifyId(raw.label || "")).trim();
  const label = raw.label?.trim() || id;
  if (!id || !label) return null;
  const color = DELIVERY_TYPE_COLORS.includes(raw.color as DeliveryTypeColor)
    ? (raw.color as DeliveryTypeColor)
    : "slate";
  return {
    id,
    label,
    color,
    showPrimaryKey: Boolean(raw.showPrimaryKey),
    showProperties: Boolean(raw.showProperties),
    showLinkEndpoints: Boolean(raw.showLinkEndpoints),
    showTargetObject: Boolean(raw.showTargetObject),
    architectureNodeTypeId: raw.architectureNodeTypeId?.trim() || undefined,
  };
}

export async function loadOntologyElementTypes(): Promise<OntologyElementTypeDefinition[]> {
  try {
    const data = await api.readJson<OntologyElementTypesFile>(ONTOLOGY_ELEMENT_TYPES_PATH);
    const types = (data.types ?? [])
      .map((t) => normalizeElementType(t))
      .filter((t): t is OntologyElementTypeDefinition => Boolean(t));
    return types.length ? types : [...DEFAULT_ONTOLOGY_ELEMENT_TYPES];
  } catch {
    try {
      await api.writeJson(ONTOLOGY_ELEMENT_TYPES_PATH, {
        types: DEFAULT_ONTOLOGY_ELEMENT_TYPES,
      });
    } catch {
      /* workspace not ready */
    }
    return [...DEFAULT_ONTOLOGY_ELEMENT_TYPES];
  }
}

export async function saveOntologyElementTypes(
  types: OntologyElementTypeDefinition[],
): Promise<void> {
  const cleaned: OntologyElementTypeDefinition[] = [];
  const seen = new Set<string>();
  for (const raw of types) {
    const t = normalizeElementType(raw);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    cleaned.push(t);
  }
  await api.writeJson(ONTOLOGY_ELEMENT_TYPES_PATH, { types: cleaned });
}

export function findOntologyElementType(
  types: OntologyElementTypeDefinition[],
  id: string,
): OntologyElementTypeDefinition | undefined {
  return types.find((t) => t.id === id);
}

export function ontologyElementTypeLabel(
  types: OntologyElementTypeDefinition[],
  id: string,
): string {
  return findOntologyElementType(types, id)?.label ?? id.replace(/([A-Z])/g, " $1").trim();
}

export function ontologyElementTypeStyles(
  types: OntologyElementTypeDefinition[],
  id: string,
): { badge: string; hexColor: string } {
  const def = findOntologyElementType(types, id);
  const color = def?.color ?? "slate";
  return {
    badge: DELIVERY_COLOR_STYLES[color].badge,
    hexColor: DELIVERY_COLOR_HEX[color],
  };
}

export function ontologyElementTypeSelectOptions(
  types: OntologyElementTypeDefinition[],
  currentValue?: string,
) {
  const merged = [...types];
  const value = currentValue?.trim();
  if (value && !merged.some((t) => t.id === value)) {
    merged.unshift({
      id: value,
      label: ontologyElementTypeLabel([], value),
      color: "slate",
      showPrimaryKey: false,
      showProperties: false,
      showLinkEndpoints: false,
      showTargetObject: false,
    });
  }
  return merged.map((t) => ({ value: t.id, label: t.label }));
}

export function newOntologyElementTypeId(
  label: string,
  existing: OntologyElementTypeDefinition[],
): string {
  let id = slugifyId(label);
  if (!existing.some((t) => t.id === id)) return id;
  let n = 2;
  while (existing.some((t) => t.id === `${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}

export function defaultColorForNewOntologyElementType(
  existing: OntologyElementTypeDefinition[],
): DeliveryTypeColor {
  const used = new Set(existing.map((t) => t.color));
  return DELIVERY_TYPE_COLORS.find((c) => !used.has(c)) ?? "indigo";
}

export const ARCHITECTURE_NODE_TYPE_OPTIONS = [
  { value: "", label: "None (no diagram node)" },
  { value: "objectType", label: "Object type" },
  { value: "pipeline", label: "Pipeline" },
  { value: "workshop", label: "Workshop" },
  { value: "function", label: "Function" },
  { value: "dataset", label: "Dataset" },
];
