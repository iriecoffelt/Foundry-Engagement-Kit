import { api } from "./api";

export const DELIVERY_TYPES_PATH = "reference/delivery-types.json";

export interface DeliveryTypeDefinition {
  id: string;
  label: string;
  color: DeliveryTypeColor;
}

export type DeliveryTypeColor =
  | "emerald"
  | "sky"
  | "blue"
  | "cyan"
  | "amber"
  | "orange"
  | "violet"
  | "fuchsia"
  | "rose"
  | "indigo"
  | "slate";

export const DELIVERY_TYPE_COLORS: DeliveryTypeColor[] = [
  "emerald",
  "sky",
  "blue",
  "cyan",
  "amber",
  "orange",
  "violet",
  "fuchsia",
  "rose",
  "indigo",
  "slate",
];

/** Tailwind 500 hex — used for architecture diagram node borders. */
export const DELIVERY_COLOR_HEX: Record<DeliveryTypeColor, string> = {
  emerald: "#10b981",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  orange: "#f97316",
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  rose: "#f43f5e",
  indigo: "#6366f1",
  slate: "#94a3b8",
};

export const DELIVERY_COLOR_STYLES: Record<
  DeliveryTypeColor,
  { badge: string; accent: string; swatch: string }
> = {
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20",
    accent: "border-l-emerald-500",
    swatch: "bg-emerald-500",
  },
  sky: {
    badge: "bg-sky-500/15 text-sky-300 ring-sky-500/20",
    accent: "border-l-sky-500",
    swatch: "bg-sky-500",
  },
  blue: {
    badge: "bg-blue-500/15 text-blue-300 ring-blue-500/20",
    accent: "border-l-blue-500",
    swatch: "bg-blue-500",
  },
  cyan: {
    badge: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/20",
    accent: "border-l-cyan-500",
    swatch: "bg-cyan-500",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-300 ring-amber-500/20",
    accent: "border-l-amber-500",
    swatch: "bg-amber-500",
  },
  orange: {
    badge: "bg-orange-500/15 text-orange-300 ring-orange-500/20",
    accent: "border-l-orange-500",
    swatch: "bg-orange-500",
  },
  violet: {
    badge: "bg-violet-500/15 text-violet-300 ring-violet-500/20",
    accent: "border-l-violet-500",
    swatch: "bg-violet-500",
  },
  fuchsia: {
    badge: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/20",
    accent: "border-l-fuchsia-500",
    swatch: "bg-fuchsia-500",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-300 ring-rose-500/20",
    accent: "border-l-rose-500",
    swatch: "bg-rose-500",
  },
  indigo: {
    badge: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/20",
    accent: "border-l-indigo-500",
    swatch: "bg-indigo-500",
  },
  slate: {
    badge: "bg-surface-elevated text-fg-secondary ring-surface-border-strong",
    accent: "border-l-slate-400",
    swatch: "bg-slate-400",
  },
};

export const DEFAULT_DELIVERY_TYPES: DeliveryTypeDefinition[] = [
  { id: "objectType", label: "Object type", color: "emerald" },
  { id: "pipeline", label: "Pipeline", color: "sky" },
  { id: "workshop", label: "Workshop", color: "amber" },
  { id: "function", label: "Function", color: "violet" },
  { id: "other", label: "Other", color: "slate" },
];

interface DeliveryTypesFile {
  types: DeliveryTypeDefinition[];
}

function slugifyId(label: string): string {
  const base = label
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "type";
}

function normalizeType(raw: Partial<DeliveryTypeDefinition>): DeliveryTypeDefinition | null {
  const id = (raw.id || slugifyId(raw.label || "")).trim();
  const label = raw.label?.trim() || id;
  if (!id || !label) return null;
  const color = DELIVERY_TYPE_COLORS.includes(raw.color as DeliveryTypeColor)
    ? (raw.color as DeliveryTypeColor)
    : "slate";
  return { id, label, color };
}

export async function loadDeliveryTypes(): Promise<DeliveryTypeDefinition[]> {
  try {
    const data = await api.readJson<DeliveryTypesFile>(DELIVERY_TYPES_PATH);
    const types = (data.types ?? [])
      .map((t) => normalizeType(t))
      .filter((t): t is DeliveryTypeDefinition => Boolean(t));
    return types.length ? types : [...DEFAULT_DELIVERY_TYPES];
  } catch {
    try {
      await api.writeJson(DELIVERY_TYPES_PATH, { types: DEFAULT_DELIVERY_TYPES });
    } catch {
      /* workspace not ready */
    }
    return [...DEFAULT_DELIVERY_TYPES];
  }
}

export async function saveDeliveryTypes(types: DeliveryTypeDefinition[]): Promise<void> {
  const cleaned: DeliveryTypeDefinition[] = [];
  const seen = new Set<string>();
  for (const raw of types) {
    const t = normalizeType(raw);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    cleaned.push(t);
  }
  await api.writeJson(DELIVERY_TYPES_PATH, { types: cleaned });
}

export function findDeliveryType(
  types: DeliveryTypeDefinition[],
  id: string,
): DeliveryTypeDefinition | undefined {
  return types.find((t) => t.id === id);
}

export function deliveryTypeLabel(
  types: DeliveryTypeDefinition[],
  id: string,
): string {
  return findDeliveryType(types, id)?.label ?? id.replace(/([A-Z])/g, " $1").trim();
}

export function deliveryTypeStyles(
  types: DeliveryTypeDefinition[],
  id: string,
): { badge: string; accent: string } {
  const def = findDeliveryType(types, id);
  const color = def?.color ?? "slate";
  const styles = DELIVERY_COLOR_STYLES[color];
  return { badge: styles.badge, accent: styles.accent };
}

export function deliveryTypeSelectOptions(
  types: DeliveryTypeDefinition[],
  currentValue?: string,
) {
  const merged = [...types];
  const value = currentValue?.trim();
  if (value && !merged.some((t) => t.id === value)) {
    merged.unshift({ id: value, label: deliveryTypeLabel([], value), color: "slate" });
  }
  return [
    ...merged.map((t) => ({ value: t.id, label: t.label })),
  ];
}

export function newDeliveryTypeId(label: string, existing: DeliveryTypeDefinition[]): string {
  let id = slugifyId(label);
  if (!existing.some((t) => t.id === id)) return id;
  let n = 2;
  while (existing.some((t) => t.id === `${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}

export function defaultColorForNewType(existing: DeliveryTypeDefinition[]): DeliveryTypeColor {
  const used = new Set(existing.map((t) => t.color));
  return DELIVERY_TYPE_COLORS.find((c) => !used.has(c)) ?? "indigo";
}
