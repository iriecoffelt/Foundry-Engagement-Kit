import { Columns2, Eye, FileText, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownPreview } from "./MarkdownPreview";

type ViewMode = "edit" | "preview" | "split";

interface EditorProps {
  path: string;
  content: string;
  dirty: boolean;
  onChange: (content: string) => void;
  onSave: () => void;
  onDelete: () => void;
  defaultView?: ViewMode;
}

function ViewToggle({
  mode,
  active,
  onClick,
  icon: Icon,
  label,
}: {
  mode: ViewMode;
  active: ViewMode;
  onClick: () => void;
  icon: typeof Pencil;
  label: string;
}) {
  const isActive = mode === active;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        isActive
          ? "bg-surface-subtle text-fg-primary shadow-sm"
          : "text-fg-muted hover:bg-surface-elevated hover:text-fg-body"
      }`}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function Editor({
  path,
  content,
  dirty,
  onChange,
  onSave,
  onDelete,
  defaultView = "split",
}: EditorProps) {
  const [view, setView] = useState<ViewMode>(defaultView);

  useEffect(() => {
    setView(defaultView);
  }, [path, defaultView]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  const fileName = path.split("/").pop() ?? path;

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <div className="flex min-w-0 items-center gap-3">
          <FileText size={16} className="shrink-0 text-brand-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg-body">{fileName}</p>
            <p className="truncate text-xs text-fg-faint">{path}</p>
          </div>
          {dirty && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/25">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="editor-view-toggle">
            <ViewToggle
              mode="edit"
              active={view}
              onClick={() => setView("edit")}
              icon={Pencil}
              label="Edit"
            />
            <ViewToggle
              mode="split"
              active={view}
              onClick={() => setView("split")}
              icon={Columns2}
              label="Split"
            />
            <ViewToggle
              mode="preview"
              active={view}
              onClick={() => setView("preview")}
              icon={Eye}
              label="Preview"
            />
          </div>

          <div className="hidden h-5 w-px bg-surface-subtle sm:block" />

          <button
            type="button"
            onClick={onSave}
            disabled={!dirty}
            title="Save (⌘S)"
            className="editor-action editor-action-primary disabled:opacity-40"
          >
            <Save size={15} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete file"
            className="editor-action editor-action-danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="editor-body">
        {(view === "edit" || view === "split") && (
          <div
            className={`editor-pane editor-pane-write ${
              view === "split" ? "editor-pane-split-left" : "editor-pane-full"
            }`}
          >
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="editor-textarea"
              spellCheck={false}
            />
          </div>
        )}

        {(view === "preview" || view === "split") && (
          <div
            className={`editor-pane editor-pane-preview ${
              view === "split" ? "editor-pane-split-right" : "editor-pane-full"
            }`}
          >
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
