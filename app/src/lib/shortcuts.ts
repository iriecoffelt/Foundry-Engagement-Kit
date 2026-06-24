/** True when running in a macOS shell (Tauri webview or browser). */
export function isMacOs(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac/i.test(navigator.userAgent) || /mac/i.test(navigator.platform);
}

/** Modifier label for keyboard hints: ⌘ on macOS, Ctrl+ elsewhere. */
export function modKey(): string {
  return isMacOs() ? "⌘" : "Ctrl+";
}

/** Human-readable shortcut, e.g. ⌘K or Ctrl+K */
export function shortcut(key: string): string {
  return `${modKey()}${key}`;
}
