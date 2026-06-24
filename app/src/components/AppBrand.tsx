import { useId } from "react";

function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="28" y2="30">
          <stop offset="0%" stopColor="rgb(var(--brand-400))" />
          <stop offset="100%" stopColor="rgb(var(--brand-700))" />
        </linearGradient>
      </defs>
      <path
        d="M16 3.5 26.5 9.75v12.5L16 28.5 5.5 22.25V9.75L16 3.5Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        fill="rgb(var(--brand-600) / 0.1)"
      />
      <path
        d="M16 9 21.5 12.25v6.5L16 22 10.5 18.75v-6.5L16 9Z"
        stroke="rgb(var(--brand-500) / 0.55)"
        strokeWidth="1"
        fill="rgb(var(--brand-600) / 0.06)"
      />
      <circle cx="16" cy="16" r="2.25" fill="rgb(var(--brand-500))" />
    </svg>
  );
}

interface AppBrandProps {
  compact?: boolean;
  className?: string;
}

export function AppBrand({ compact, className = "" }: AppBrandProps) {
  return (
    <div className={`app-brand ${compact ? "app-brand-compact" : ""} ${className}`.trim()}>
      <LogoMark className={compact ? "h-7 w-7" : "h-9 w-9"} />
      <div className="min-w-0">
        <p className="app-brand-eyebrow">Foundry</p>
        <p className="app-brand-name">Engagement Kit</p>
      </div>
    </div>
  );
}
