import { useState, useRef, useEffect, type ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 400,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-surface-elevated border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-surface-elevated border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-surface-elevated border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-surface-elevated border-y-transparent border-l-transparent",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-50 ${positionClasses[position]}`}
        >
          <div className="whitespace-nowrap rounded-lg bg-surface-elevated px-3 py-1.5 text-xs text-fg-secondary shadow-lg">
            {content}
          </div>
          <div
            className={`absolute border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}
