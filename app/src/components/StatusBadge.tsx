import { formatStatusLabel, statusBadgeClass } from "../lib/engagementStatus";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(status)} ${className}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
