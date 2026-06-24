import type { LucideIcon } from "lucide-react";
import {
  Code,
  Database,
  GitBranch,
  Layers,
  Monitor,
  Server,
  User,
} from "lucide-react";
import { api } from "./api";
import {
  DELIVERY_COLOR_HEX,
  DELIVERY_TYPE_COLORS,
  findDeliveryType,
  loadDeliveryTypes,
  type DeliveryTypeColor,
  type DeliveryTypeDefinition,
} from "./deliveryTypes";

export const ARCHITECTURE_NODE_TYPES_PATH = "reference/architecture-node-types.json";

export type ArchNodeIcon = "server" | "database" | "gitBranch" | "layers" | "monitor" | "user" | "code";

export interface ArchitectureNodeTypeDefinition {
  id: string;
  label: string;
  color: DeliveryTypeColor;
  icon: ArchNodeIcon;
  linkable: boolean;
  /** When set, maps to a delivery board type and inherits its color from delivery-types.json */
  deliveryTypeId?: string;
}

export interface ResolvedArchNodeType extends ArchitectureNodeTypeDefinition {
  hexColor: string;
  Icon: LucideIcon;
}

export const ARCH_NODE_ICONS: Record<ArchNodeIcon, LucideIcon> = {
  server: Server,
  database: Database,
  gitBranch: GitBranch,
  layers: Layers,
  monitor: Monitor,
  user: User,
  code: Code,
};

export const DEFAULT_ARCHITECTURE_NODE_TYPES: ArchitectureNodeTypeDefinition[] = [
  { id: "source", label: "Source System", color: "indigo", icon: "server", linkable: false },
  { id: "dataset", label: "Dataset", color: "blue", icon: "database", linkable: true, deliveryTypeId: "other" },
  { id: "pipeline", label: "Pipeline", color: "sky", icon: "gitBranch", linkable: true, deliveryTypeId: "pipeline" },
  { id: "objectType", label: "Object Type", color: "emerald", icon: "layers", linkable: true, deliveryTypeId: "objectType" },
  { id: "workshop", label: "Workshop App", color: "amber", icon: "monitor", linkable: true, deliveryTypeId: "workshop" },
  { id: "function", label: "Function", color: "violet", icon: "code", linkable: true, deliveryTypeId: "function" },
  { id: "user", label: "User", color: "rose", icon: "user", linkable: false },
];

interface ArchitectureNodeTypesFile {
  types: ArchitectureNodeTypeDefinition[];
}

function slugifyId(label: string): string {
  const base = label
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "node";
}

const VALID_ICONS = new Set<string>(Object.keys(ARCH_NODE_ICONS));

function normalizeArchNodeType(
  raw: Partial<ArchitectureNodeTypeDefinition>,
): ArchitectureNodeTypeDefinition | null {
  const id = (raw.id || slugifyId(raw.label || "")).trim();
  const label = raw.label?.trim() || id;
  if (!id || !label) return null;
  const color = DELIVERY_TYPE_COLORS.includes(raw.color as DeliveryTypeColor)
    ? (raw.color as DeliveryTypeColor)
    : "slate";
  const icon = VALID_ICONS.has(String(raw.icon)) ? (raw.icon as ArchNodeIcon) : "layers";
  return {
    id,
    label,
    color,
    icon,
    linkable: Boolean(raw.linkable),
    deliveryTypeId: raw.deliveryTypeId?.trim() || undefined,
  };
}

export async function loadArchitectureNodeTypes(): Promise<ArchitectureNodeTypeDefinition[]> {
  try {
    const data = await api.readJson<ArchitectureNodeTypesFile>(ARCHITECTURE_NODE_TYPES_PATH);
    const types = (data.types ?? [])
      .map((t) => normalizeArchNodeType(t))
      .filter((t): t is ArchitectureNodeTypeDefinition => Boolean(t));
    return types.length ? types : [...DEFAULT_ARCHITECTURE_NODE_TYPES];
  } catch {
    try {
      await api.writeJson(ARCHITECTURE_NODE_TYPES_PATH, { types: DEFAULT_ARCHITECTURE_NODE_TYPES });
    } catch {
      /* workspace not ready */
    }
    return [...DEFAULT_ARCHITECTURE_NODE_TYPES];
  }
}

export async function saveArchitectureNodeTypes(
  types: ArchitectureNodeTypeDefinition[],
): Promise<void> {
  const cleaned: ArchitectureNodeTypeDefinition[] = [];
  const seen = new Set<string>();
  for (const raw of types) {
    const t = normalizeArchNodeType(raw);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    cleaned.push(t);
  }
  await api.writeJson(ARCHITECTURE_NODE_TYPES_PATH, { types: cleaned });
}

export function resolveArchNodeTypes(
  archTypes: ArchitectureNodeTypeDefinition[],
  deliveryTypes: DeliveryTypeDefinition[],
): ResolvedArchNodeType[] {
  return archTypes.map((def) => {
    const deliveryMatch = def.deliveryTypeId
      ? findDeliveryType(deliveryTypes, def.deliveryTypeId)
      : undefined;
    const color = deliveryMatch?.color ?? def.color;
    return {
      ...def,
      color,
      hexColor: DELIVERY_COLOR_HEX[color],
      Icon: ARCH_NODE_ICONS[def.icon] ?? Layers,
    };
  });
}

export function findArchNodeType(
  types: ArchitectureNodeTypeDefinition[] | ResolvedArchNodeType[],
  id: string,
): ArchitectureNodeTypeDefinition | ResolvedArchNodeType | undefined {
  return types.find((t) => t.id === id);
}

export function archNodeTypeLabel(types: ArchitectureNodeTypeDefinition[], id: string): string {
  return findArchNodeType(types, id)?.label ?? id.replace(/([A-Z])/g, " $1").trim();
}

export function deliveryTypeIdForArchNode(
  types: ArchitectureNodeTypeDefinition[],
  archNodeTypeId: string,
): string | undefined {
  return findArchNodeType(types, archNodeTypeId)?.deliveryTypeId;
}

export function archNodeTypeIdForDeliveryType(
  types: ArchitectureNodeTypeDefinition[],
  deliveryTypeId: string,
): string | undefined {
  return types.find((t) => t.deliveryTypeId === deliveryTypeId)?.id;
}

export function newArchNodeTypeId(
  label: string,
  existing: ArchitectureNodeTypeDefinition[],
): string {
  let id = slugifyId(label);
  if (!existing.some((t) => t.id === id)) return id;
  let n = 2;
  while (existing.some((t) => t.id === `${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}

export function defaultColorForNewArchType(
  existing: ArchitectureNodeTypeDefinition[],
): DeliveryTypeColor {
  const used = new Set(existing.map((t) => t.color));
  return DELIVERY_TYPE_COLORS.find((c) => !used.has(c)) ?? "indigo";
}

export async function loadResolvedArchNodeTypes(): Promise<ResolvedArchNodeType[]> {
  const [archTypes, deliveryTypes] = await Promise.all([
    loadArchitectureNodeTypes(),
    loadDeliveryTypes(),
  ]);
  return resolveArchNodeTypes(archTypes, deliveryTypes);
}
