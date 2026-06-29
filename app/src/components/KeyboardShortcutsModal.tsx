import { Keyboard } from "lucide-react";
import { Modal } from "./Modal";
import { ShortcutKbd } from "./ShortcutKbd";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string;
  description: string;
}

const SHORTCUTS: { category: string; items: ShortcutEntry[] }[] = [
  {
    category: "Navigation",
    items: [
      { keys: "K", description: "Open command palette" },
      { keys: "[", description: "Go back to previous view" },
    ],
  },
  {
    category: "Editing",
    items: [{ keys: "S", description: "Save current document" }],
  },
  {
    category: "Focus Mode",
    items: [
      { keys: "Space", description: "Start/pause focus timer (when in focus mode)" },
    ],
  },
  {
    category: "General",
    items: [{ keys: "Escape", description: "Close modals and panels" }],
  },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal open={open} title="Keyboard Shortcuts" onClose={onClose} wide>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-fg-secondary">
          <Keyboard size={18} />
          <span className="text-sm">
            Use these shortcuts to navigate and work faster
          </span>
        </div>

        {SHORTCUTS.map((section) => (
          <div key={section.category}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {section.category}
            </h3>
            <div className="space-y-2">
              {section.items.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex items-center justify-between rounded-lg bg-surface-base/60 px-3 py-2"
                >
                  <span className="text-sm text-fg-body">{shortcut.description}</span>
                  {shortcut.keys === "Escape" || shortcut.keys === "Space" ? (
                    <kbd className="rounded border border-surface-border-strong bg-surface-base px-2 py-0.5 font-mono text-xs text-fg-muted">
                      {shortcut.keys}
                    </kbd>
                  ) : (
                    <ShortcutKbd keys={shortcut.keys} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-fg-muted">
          Shortcuts use ⌘ on macOS and Ctrl on Windows/Linux.
        </p>
      </div>
    </Modal>
  );
}
