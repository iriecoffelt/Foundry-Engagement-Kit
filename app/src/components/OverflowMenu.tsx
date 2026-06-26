import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface OverflowMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  primary?: boolean;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  align?: "left" | "right";
}

export function OverflowMenu({ items, align = "right" }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const run = (item: OverflowMenuItem) => {
    setOpen(false);
    item.onClick();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-surface-border-strong p-2 text-fg-secondary hover:text-fg-primary"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          className={`absolute bottom-full z-50 mb-2 min-w-[11rem] rounded-xl border border-surface-border bg-surface-raised py-1 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => run(item)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  item.primary
                    ? "text-brand-300 hover:bg-brand-600/15"
                    : "text-fg-body hover:bg-surface-elevated"
                }`}
              >
                {Icon && <Icon size={14} className="shrink-0 opacity-70" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
