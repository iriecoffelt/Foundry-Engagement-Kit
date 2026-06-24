import type { EngagementStatus } from "../types";

const STATUS_STYLES: Record<EngagementStatus, string> = {
  discovery: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25",
  scoping: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25",
  design: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25",
  build: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25",
  deploy: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25",
  handoff: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25",
};

const STATUS_BAR_COLORS: Record<EngagementStatus, string> = {
  discovery: "bg-sky-500",
  scoping: "bg-indigo-500",
  design: "bg-violet-500",
  build: "bg-amber-500",
  deploy: "bg-orange-500",
  handoff: "bg-emerald-500",
};

const STATUS_RING_STROKE: Record<EngagementStatus, string> = {
  discovery: "stroke-sky-500",
  scoping: "stroke-indigo-500",
  design: "stroke-violet-500",
  build: "stroke-amber-500",
  deploy: "stroke-orange-500",
  handoff: "stroke-emerald-500",
};

const FALLBACK_STYLE = "bg-surface-elevated/80 text-fg-secondary ring-1 ring-surface-border-strong/50";
const FALLBACK_BAR = "bg-brand-500";

export function normalizeStatus(status: string): EngagementStatus | null {
  const key = status.toLowerCase().replace(/\s+/g, "") as EngagementStatus;
  return key in STATUS_STYLES ? key : null;
}

export function statusBadgeClass(status: string): string {
  const key = normalizeStatus(status);
  return key ? STATUS_STYLES[key] : FALLBACK_STYLE;
}

export function statusBarClass(status: EngagementStatus): string {
  return STATUS_BAR_COLORS[status] ?? FALLBACK_BAR;
}

export function statusRingStrokeClass(status: string): string {
  const key = normalizeStatus(status);
  return key ? STATUS_RING_STROKE[key] : "stroke-brand-500";
}

export function formatStatusLabel(status: string): string {
  return status.replace(/-/g, " ");
}
