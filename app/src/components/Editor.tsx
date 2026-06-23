import { Eye, FileText, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownPreview } from "./MarkdownPreview";

interface EditorProps {
  path: string;
  content: string;
  dirty: boolean;
  onChange: (content: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function Editor({ path, content, dirty, onChange, onSave, onDelete }: EditorProps) {
  const [preview, setPreview] = useState(false);

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={16} className="shrink-0 text-brand-400" />
          <span className="truncate text-sm text-slate-300">{path}</span>
          {dirty && <span className="text-xs text-amber-400">Unsaved</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
              preview
                ? "bg-brand-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Eye size={15} />
            Preview
          </button>
          <button
            onClick={onSave}
            disabled={!dirty}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white transition hover:bg-brand-500 disabled:opacity-40"
          >
            <Save size={15} />
            Save
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-950/50"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      {preview ? (
        <MarkdownPreview content={content} />
      ) : (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="h-full w-full resize-none bg-slate-950 p-6 font-mono text-sm leading-relaxed text-slate-200 outline-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}
