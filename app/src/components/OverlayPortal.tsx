import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface OverlayPortalProps {
  open: boolean;
  children: ReactNode;
  lockScroll?: boolean;
}

/** Renders children at document.body so fixed overlays escape scroll/containment parents. */
export function OverlayPortal({ open, children, lockScroll = true }: OverlayPortalProps) {
  useEffect(() => {
    if (!open || !lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  if (!open) return null;
  return createPortal(children, document.body);
}
