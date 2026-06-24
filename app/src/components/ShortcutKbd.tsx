import { shortcut } from "../lib/shortcuts";

const kbdClass =
  "rounded border border-surface-border-strong bg-surface-base px-1.5 py-0.5 font-mono text-xs text-fg-muted";

export function ShortcutKbd({ keys }: { keys: string }) {
  return <kbd className={kbdClass}>{shortcut(keys)}</kbd>;
}
