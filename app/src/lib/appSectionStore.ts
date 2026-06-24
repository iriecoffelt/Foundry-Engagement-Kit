import type { Section } from "../types";

let section: Section = "home";
let openFocusHandler: () => void = () => {};
const listeners = new Set<() => void>();

export function setAppSection(next: Section) {
  if (section === next) return;
  section = next;
  listeners.forEach((l) => l());
}

export function getAppSection() {
  return section;
}

export function subscribeAppSection(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setOpenFocusHandler(handler: () => void) {
  openFocusHandler = handler;
}

export function openFocusSession() {
  openFocusHandler();
}
