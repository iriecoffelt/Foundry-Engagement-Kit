import { open } from "@tauri-apps/plugin-dialog";
import { ArrowLeft, ExternalLink, FileText, Network, Upload } from "lucide-react";
import { useCallback, useEffect, lazy, Suspense, useState } from "react";
import { api } from "../../lib/api";
import type { FileEntry, ProjectMeta } from "../../types";
import { ArchitectureEditor } from "../architecture/ArchitectureEditor";
import { PrimaryButton } from "../forms/FormField";
import { Editor } from "../Editor";
import { FileTree } from "../FileTree";
import { MarkdownPreview } from "../MarkdownPreview";

type ProjectTab = "overview" | "architecture" | "documents" | "files";

interface ProjectWorkspaceProps {
  project: ProjectMeta;
  onBack: () => void;
}

export function ProjectWorkspace({ project, onBack }: ProjectWorkspaceProps) {
  const [tab, setTab] = useState<ProjectTab>("overview");
  const [overview, setOverview] = useState("");
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [docTree, setDocTree] = useState<FileEntry[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string; dirty: boolean } | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const readme = await api.readFile(`${project.path}/README.md`);
      setOverview(readme);
    } catch {
      setOverview("");
    }
    const tree = await api.listDirectory(project.path, true);
    setDocTree(tree);
    try {
      await api.createDirectory(`${project.path}/references`);
      const refs = await api.listDirectory(`${project.path}/references`, false);
      setUploads(refs.filter((e) => !e.is_dir));
    } catch {
      setUploads([]);
    }
  }, [project.path]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadRef = async () => {
    const selected = await open({ multiple: false, title: "Upload project reference" });
    if (!selected || typeof selected !== "string") return;
    try {
      const dest = await api.importFile(selected, `${project.path}/references/`);
      setMessage(`Uploaded ${dest}`);
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  };

  const tabs: { id: ProjectTab; label: string; icon: typeof FileText }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "architecture", label: "Architecture", icon: Network },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "files", label: "Files", icon: Upload },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-4">
        <button
          onClick={onBack}
          className="mb-2 flex items-center gap-1 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} /> All projects
        </button>
        <h2 className="text-xl font-bold text-white">{project.display_name}</h2>
        <p className="text-sm text-slate-400">
          {project.customer} · <span className="capitalize">{project.status}</span>
        </p>
        <div className="mt-4 flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                tab === id
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "overview" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl">
              {overview ? (
                <MarkdownPreview content={overview} />
              ) : (
                <p className="text-slate-500">No overview yet.</p>
              )}
            </div>
          </div>
        )}

        {tab === "architecture" && (
          <Suspense fallback={<SectionFallback />}>
            <ArchitectureEditor projectPath={project.path} />
          </Suspense>
        )}

        {tab === "documents" && (
          <div className="flex h-full">
            <div className="w-64 shrink-0 overflow-y-auto border-r border-slate-800 p-2">
              <p className="px-2 py-1 text-xs font-medium uppercase text-slate-500">Advanced</p>
              <FileTree
                entries={docTree}
                selectedPath={openFile?.path}
                onSelect={async (path) => {
                  const content = await api.readFile(path);
                  setOpenFile({ path, content, dirty: false });
                }}
              />
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
                    await refresh();
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  Select a document for raw markdown editing
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "files" && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Project references</h3>
                <p className="text-sm text-slate-400">Upload specs, screenshots, or customer docs</p>
              </div>
              <PrimaryButton onClick={uploadRef}>
                <span className="flex items-center gap-1.5">
                  <Upload size={14} /> Upload file
                </span>
              </PrimaryButton>
            </div>
            {message && <p className="mb-3 text-sm text-brand-300">{message}</p>}
            {uploads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
                No files uploaded yet
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {uploads.map((u) => (
                  <button
                    key={u.path}
                    onClick={() => api.openPath(u.path)}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-left hover:border-brand-600/40"
                  >
                    <span className="text-slate-200">{u.name}</span>
                    <ExternalLink size={16} className="text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
