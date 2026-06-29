import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FileEntry } from "../types";

interface FileTreeProps {
  entries: FileEntry[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
  level?: number;
  storageKey?: string;
  expandedPaths?: Set<string>;
  onToggleExpand?: (path: string, expanded: boolean) => void;
}

const STORAGE_PREFIX = "filetree-expanded-";

function loadExpandedPaths(storageKey: string): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore parsing errors
  }
  return new Set();
}

function saveExpandedPaths(storageKey: string, paths: Set<string>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify([...paths]));
  } catch {
    // Ignore storage errors
  }
}

export function FileTree({
  entries,
  selectedPath,
  onSelect,
  onDelete,
  level = 0,
  storageKey,
  expandedPaths: controlledExpanded,
  onToggleExpand: controlledToggle,
}: FileTreeProps) {
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(() => {
    if (storageKey) {
      return loadExpandedPaths(storageKey);
    }
    return new Set();
  });

  const expandedPaths = controlledExpanded ?? localExpanded;

  const handleToggle = useCallback(
    (path: string, expanded: boolean) => {
      if (controlledToggle) {
        controlledToggle(path, expanded);
        return;
      }
      setLocalExpanded((prev) => {
        const next = new Set(prev);
        if (expanded) {
          next.add(path);
        } else {
          next.delete(path);
        }
        if (storageKey) {
          saveExpandedPaths(storageKey, next);
        }
        return next;
      });
    },
    [controlledToggle, storageKey],
  );

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
          expandedPaths={expandedPaths}
          onToggleExpand={handleToggle}
          storageKey={storageKey}
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
  expandedPaths,
  onToggleExpand,
  storageKey,
}: {
  entry: FileEntry;
  selectedPath?: string;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
  level: number;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string, expanded: boolean) => void;
  storageKey?: string;
}) {
  const expanded = expandedPaths.has(entry.path) || (level < 2 && !expandedPaths.size);
  const isSelected = selectedPath === entry.path;

  const toggle = () => {
    onToggleExpand(entry.path, !expanded);
  };

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
            onClick={toggle}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded hover:bg-surface-subtle/50"
            aria-label={expanded ? "Collapse folder" : "Expand folder"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="inline-block w-11" />
        )}

        <button
          onClick={() => {
            if (entry.is_dir) {
              toggle();
            } else {
              onSelect(entry.path);
            }
          }}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm"
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
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded text-xs text-red-400 group-hover:flex hover:bg-red-950/50"
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
          storageKey={storageKey}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
        />
      )}
    </li>
  );
}
