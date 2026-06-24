import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { useState } from "react";
import type { FileEntry } from "../types";

interface FileTreeProps {
  entries: FileEntry[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
  level?: number;
}

export function FileTree({
  entries,
  selectedPath,
  onSelect,
  onDelete,
  level = 0,
}: FileTreeProps) {
  return (
    <ul className="space-y-0.5">
      {entries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onDelete={onDelete}
          level={level}
        />
      ))}
    </ul>
  );
}

function FileTreeNode({
  entry,
  selectedPath,
  onSelect,
  onDelete,
  level,
}: {
  entry: FileEntry;
  selectedPath?: string;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
  level: number;
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const isSelected = selectedPath === entry.path;

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-lg pr-2 transition ${
          isSelected
            ? "file-tree-selected bg-brand-600/20 text-brand-200"
            : "text-fg-body hover:bg-surface-elevated/80"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {entry.is_dir ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 hover:bg-surface-subtle/50"
            aria-label={expanded ? "Collapse folder" : "Expand folder"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="inline-block w-6" />
        )}

        <button
          onClick={() => {
            if (entry.is_dir) {
              setExpanded(!expanded);
            } else {
              onSelect(entry.path);
            }
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm"
        >
          {entry.is_dir ? (
            <Folder size={15} className="shrink-0 text-brand-400" />
          ) : (
            <FileText size={15} className="shrink-0 text-fg-muted" />
          )}
          <span className="truncate">{entry.name}</span>
        </button>

        {onDelete && !entry.path.startsWith("project/_template") && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.path);
            }}
            className="hidden rounded px-1.5 py-0.5 text-xs text-red-400 group-hover:block hover:bg-red-950/50"
          >
            Delete
          </button>
        )}
      </div>

      {entry.is_dir && expanded && entry.children && (
        <FileTree
          entries={entry.children}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onDelete={onDelete}
          level={level + 1}
        />
      )}
    </li>
  );
}
