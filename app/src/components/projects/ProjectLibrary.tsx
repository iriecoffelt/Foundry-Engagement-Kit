import { open } from "@tauri-apps/plugin-dialog";
import { ArrowLeft, BookOpen, ExternalLink, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";
import type { FileEntry } from "../../types";
import { Editor } from "../Editor";
import { PrimaryButton, SecondaryButton } from "../forms/FormField";

interface ProjectLibraryProps {
  projectPath: string;
  onMessage: (msg: string) => void;
}

export function ProjectLibrary({ projectPath, onMessage }: ProjectLibraryProps) {
  const confirm = useConfirm();
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [guides, setGuides] = useState<FileEntry[]>([]);
  const [openGuide, setOpenGuide] = useState<{
    path: string;
    content: string;
    dirty: boolean;
  } | null>(null);

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

  const openGuideFile = async (path: string) => {
    const content = await api.readFile(path);
    setOpenGuide({ path, content, dirty: false });
  };

  if (openGuide) {
    const guideTitle =
      openGuide.path
        .split("/")
        .pop()
        ?.replace(".md", "")
        .replace(/-/g, " ") ?? "Guide";

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-4 py-3">
          <SecondaryButton onClick={() => setOpenGuide(null)}>
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft size={14} /> Back to library
            </span>
          </SecondaryButton>
          <span className="truncate text-sm font-medium text-fg-primary">{guideTitle}</span>
        </div>
        <div className="min-h-0 flex-1">
          <Editor
            path={openGuide.path}
            content={openGuide.content}
            dirty={openGuide.dirty}
            defaultView="split"
            onChange={(content) => setOpenGuide({ ...openGuide, content, dirty: true })}
            onSave={async () => {
              await api.writeFile(openGuide.path, openGuide.content);
              setOpenGuide({ ...openGuide, dirty: false });
              onMessage("Guide saved");
            }}
            onDelete={async () => {
              if (!openGuide) return;
              const name = openGuide.path.split("/").pop() || openGuide.path;
              if (
                !(await confirm({
                  title: "Delete guide",
                  message: `Delete ${name}? This cannot be undone.`,
                  destructive: true,
                }))
              ) {
                return;
              }
              await api.deletePath(openGuide.path);
              setOpenGuide(null);
              refresh();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
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
                  title="Open with default app"
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
                Shared reference material from reference/ — view and edit in the app
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
                  onClick={() => openGuideFile(g.path)}
                  className="card-kit-interactive flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-fg-body">
                    {g.name.replace(".md", "").replace(/-/g, " ")}
                  </span>
                  <BookOpen size={16} className="shrink-0 text-fg-muted" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
