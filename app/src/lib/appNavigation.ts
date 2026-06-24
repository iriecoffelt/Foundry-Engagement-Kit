import { useCallback, useMemo, useState } from "react";
import type { Section } from "../types";

export interface NavFrame {
  section: Section;
  projectSlug?: string;
  projectTab?: string;
}

const SECTION_LABELS: Record<Section, string> = {
  home: "Home",
  portfolio: "Portfolio",
  projects: "Projects",
  daily: "Daily",
  weekly: "Weekly",
  library: "Library",
  search: "Search",
  focus: "Focus",
  settings: "Settings",
};

export function frameLabel(frame: NavFrame, projectName?: string): string {
  if (frame.projectSlug) {
    const name = projectName || frame.projectSlug;
    if (frame.projectTab) {
      return `${name} · ${frame.projectTab}`;
    }
    return name;
  }
  return SECTION_LABELS[frame.section] || frame.section;
}

export function backLabelForFrame(frame: NavFrame, projectName?: string): string {
  return frameLabel(frame, projectName);
}

function framesEqual(a: NavFrame, b: NavFrame): boolean {
  return (
    a.section === b.section &&
    a.projectSlug === b.projectSlug &&
    a.projectTab === b.projectTab
  );
}

export const MAX_NAV_HISTORY = 10;

/** Append to a back stack and drop oldest entries beyond the limit. */
export function pushNavHistory<T>(stack: T[], item: T, max = MAX_NAV_HISTORY): T[] {
  const next = [...stack, item];
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}

export function useAppNavigation(initial: NavFrame) {
  const [current, setCurrent] = useState<NavFrame>(initial);
  const [history, setHistory] = useState<NavFrame[]>([]);

  const navigate = useCallback((next: NavFrame) => {
    setCurrent((prev) => {
      if (framesEqual(prev, next)) return prev;
      setHistory((h) => pushNavHistory(h, prev));
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setCurrent(prev);
      return h.slice(0, -1);
    });
  }, []);

  const canGoBack = history.length > 0;
  const previousFrame = history.length ? history[history.length - 1] : null;

  const replace = useCallback((next: NavFrame) => {
    setCurrent(next);
  }, []);

  return useMemo(
    () => ({
      current,
      canGoBack,
      previousFrame,
      navigate,
      goBack,
      replace,
    }),
    [current, canGoBack, previousFrame, navigate, goBack, replace],
  );
}
