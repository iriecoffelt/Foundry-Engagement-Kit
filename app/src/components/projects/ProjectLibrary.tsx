import { open } from "@tauri-apps/plugin-dialog";
import { BookOpen, ExternalLink, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { FileEntry } from "../../types";
import { PrimaryButton } from "../forms/FormField";

interface ProjectLibraryProps {
  projectPath: string;
  onMessage: (msg: string) => void;
}

export function ProjectLibrary({ projectPath, onMessage }: ProjectLibraryProps) {
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [guides, setGuides] = useState<FileEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      await api.createDirectory(`${projectPath}/references`);
      const refs = await api.listDirectory(`${projectPath}/references`, false);
      setUploads(refs.filter((e) => !e.is_dir));
    } catch {
      setUploads([]);
    }
    try {
      const ref = await api.listDirectory("reference", false);
      setGuides(ref.filter((f) => f.name.endsWith(".md")));
    } catch {
      setGuides([]);
    }
  }, [projectPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadRef = async () => {
    const selected = await open({ multiple: false, title: "Upload project reference" });
    if (!selected || typeof selected !== "string") return;
    try {
      const dest = await api.importFile(selected, `${projectPath}/references/`);
      onMessage(`Uploaded ${dest.split("/").pop()}`);
      await refresh();
    } catch (e) {
      onMessage(String(e));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-fg-primary">Project references</h3>
              <p className="mt-1 text-sm text-fg-secondary">
                Specs, screenshots, and customer docs for this engagement
              </p>
            </div>
            <PrimaryButton onClick={uploadRef}>
              <span className="flex items-center gap-1.5">
                <Upload size={14} /> Upload
              </span>
            </PrimaryButton>
          </div>
          {uploads.length === 0 ? (
            <div className="card-kit border-dashed p-10 text-center text-fg-muted">
              No files uploaded yet
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {uploads.map((u) => (
                <button
                  key={u.path}
                  onClick={() => api.openPath(u.path)}
                  className="card-kit-interactive flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="truncate text-fg-body">{u.name}</span>
                  <ExternalLink size={16} className="shrink-0 text-fg-muted" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-brand-500" />
            <div>
              <h3 className="font-semibold text-fg-primary">Workspace guides</h3>
              <p className="text-sm text-fg-secondary">
                Shared reference material from reference/
              </p>
            </div>
          </div>
          {guides.length === 0 ? (
            <p className="text-sm text-fg-muted">No guides in reference/</p>
          ) : (
            <div className="grid gap-2">
              {guides.map((g) => (
                <button
                  key={g.path}
                  onClick={() => api.openPath(g.path)}
                  className="card-kit-interactive flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-fg-body">
                    {g.name.replace(".md", "").replace(/-/g, " ")}
                  </span>
                  <ExternalLink size={16} className="shrink-0 text-fg-muted" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
