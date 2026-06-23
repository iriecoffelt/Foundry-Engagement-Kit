import { open } from "@tauri-apps/plugin-dialog";
import { ExternalLink, FileText, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { FileEntry } from "../../types";
import { PrimaryButton } from "../forms/FormField";
import { MarkdownPreview } from "../MarkdownPreview";

export function LibraryHub() {
  const [guides, setGuides] = useState<FileEntry[]>([]);
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [guideContent, setGuideContent] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const refEntries = await api.listDirectory("reference", false);
    setGuides(refEntries.filter((e) => !e.is_dir && e.name.endsWith(".md")));

    try {
      await api.createDirectory("reference/uploads");
    } catch {
      /* exists */
    }
    const uploadEntries = await api.listDirectory("reference/uploads", false);
    setUploads(uploadEntries.filter((e) => !e.is_dir));
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const openGuide = async (path: string) => {
    const content = await api.readFile(path);
    setSelectedGuide(path);
    setGuideContent(content);
  };

  const uploadFile = async () => {
    const selected = await open({
      multiple: false,
      title: "Choose a reference file to upload",
    });
    if (!selected || typeof selected !== "string") return;
    try {
      const dest = await api.importFile(selected, "reference/uploads/");
      setMessage(`Uploaded ${dest}`);
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  };

  const openUploaded = async (path: string) => {
    try {
      await api.openPath(path);
    } catch (e) {
      setMessage(String(e));
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-white">Reference guides</h3>
          </div>
          <div className="space-y-1">
            {guides.map((g) => (
              <button
                key={g.path}
                onClick={() => openGuide(g.path)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  selectedGuide === g.path
                    ? "bg-brand-600/20 text-brand-200"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <FileText size={15} />
                {g.name.replace(".md", "")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-white">Uploaded files</h3>
            <PrimaryButton onClick={uploadFile}>
              <span className="flex items-center gap-1.5">
                <Upload size={14} /> Upload
              </span>
            </PrimaryButton>
          </div>
          {message && <p className="mb-2 text-xs text-brand-300">{message}</p>}
          {uploads.length === 0 ? (
            <p className="text-sm text-slate-500">No uploads yet. Add PDFs, images, or docs.</p>
          ) : (
            <div className="space-y-1">
              {uploads.map((u) => (
                <button
                  key={u.path}
                  onClick={() => openUploaded(u.path)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800"
                >
                  <span className="truncate">{u.name}</span>
                  <ExternalLink size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedGuide ? (
          <MarkdownPreview content={guideContent} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            Select a guide or upload a reference file
          </div>
        )}
      </div>
    </div>
  );
}
