/** Normalize a directory path returned by the Tauri dialog (all platforms). */
export function pickDirectoryPath(selected: string | string[] | null): string | null {
  if (!selected) return null;
  return Array.isArray(selected) ? (selected[0] ?? null) : selected;
}

/** Join paths for display using the separator style of the parent path. */
export function joinPath(parent: string, child: string): string {
  const sep = parent.includes("\\") ? "\\" : "/";
  const base = parent.replace(/[/\\]+$/, "");
  return `${base}${sep}${child}`;
}
