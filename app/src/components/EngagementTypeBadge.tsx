import {
  getEngagementTypeConfig,
  ENGAGEMENT_TYPE_COLORS,
  type EngagementType,
} from "../lib/engagementTypes";

const BADGE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-950/50 text-emerald-300 ring-emerald-800/50",
  amber: "bg-amber-950/50 text-amber-300 ring-amber-800/50",
  sky: "bg-sky-950/50 text-sky-300 ring-sky-800/50",
  violet: "bg-violet-950/50 text-violet-300 ring-violet-800/50",
};

interface EngagementTypeBadgeProps {
  type: EngagementType | undefined;
  className?: string;
  size?: "sm" | "md";
}

export function EngagementTypeBadge({
  type,
  className = "",
  size = "sm",
}: EngagementTypeBadgeProps) {
  if (!type) return null;

  const config = getEngagementTypeConfig(type);
  const color = ENGAGEMENT_TYPE_COLORS[type] || "sky";
  const badgeClass = BADGE_CLASSES[color] || BADGE_CLASSES.sky;

  const sizeClass = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium ring-1 ring-inset ${badgeClass} ${sizeClass} ${className}`}
      title={config.description}
    >
      {config.label}
    </span>
  );
}
