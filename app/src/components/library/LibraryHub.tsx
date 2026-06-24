import { open } from "@tauri-apps/plugin-dialog";
import { BookOpen, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { FileEntry } from "../../types";
import { Editor } from "../Editor";

export function LibraryHub() {
  const [guides, setGuides] = useState<FileEntry[]>([]);
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [openFile, setOpenFile] = useState<{
    path: string;
    content: string;
    dirty: boolean;
  } | null>(null);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    const ref = await api.listDirectory("reference", false);
    setGuides(ref.filter((f) => f.name.endsWith(".md")));
    try {
      await api.createDirectory("reference/uploads");
      const up = await api.listDirectory("reference/uploads", false);
      setUploads(up.filter((f) => !f.is_dir));
    } catch {
      setUploads([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openGuide = async (path: string) => {
    const content = await api.readFile(path);
    setOpenFile({ path, content, dirty: false });
  };

  const upload = async () => {
    const selected = await open({ multiple: false });
    if (!selected) return;
    try {
      await api.createDirectory("reference/uploads");
      await api.importFile(selected, "reference/uploads/");
      setStatus("File uploaded");
      refresh();
    } catch (e) {
      setStatus(String(e));
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="w-80 shrink-0 overflow-y-auto border-r border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-white">Library</h2>
        <p className="mt-1 text-sm text-slate-500">Guides and reference uploads</p>

        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <BookOpen size={14} />
            Guides
          </h3>
          <div className="mt-2 space-y-1">
            {guides.map((g) => (
              <button
                key={g.path}
                onClick={() => openGuide(g.path)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  openFile?.path === g.path
                    ? "bg-brand-600/20 text-brand-200"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                {g.name.replace(".md", "").replace(/-/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Uploads
            </h3>
            <button
              onClick={upload}
              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
            >
              <Upload size={14} />
              Upload
            </button>
          </div>
          {status && <p className="mt-1 text-xs text-slate-500">{status}</p>}
          <div className="mt-2 space-y-1">
            {uploads.map((u) => (
              <button
                key={u.path}
                onClick={() => api.openPath(u.path)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {openFile ? (
          <Editor
            path={openFile.path}
            content={openFile.content}
            dirty={openFile.dirty}
            onChange={(content) => setOpenFile({ ...openFile, content, dirty: true })}
            onSave={async () => {
              await api.writeFile(openFile.path, openFile.content);
              setOpenFile({ ...openFile, dirty: false });
            }}
            onDelete={async () => {
              if (!confirm(`Delete ${openFile.path}?`)) return;
              await api.deletePath(openFile.path);
              setOpenFile(null);
              refresh();
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Select a guide to view or edit
          </div>
        )}
      </div>
    </div>
  );
}
