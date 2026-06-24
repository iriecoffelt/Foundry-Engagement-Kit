import { open } from "@tauri-apps/plugin-dialog";
import { ExternalLink, FileText, Upload } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  DEFAULT_CHECKLIST,
  checklistPath,
  computePhaseProgress,
} from "../../lib/phaseChecklist";
import { copyToClipboard, generateCustomerSummary } from "../../lib/customerSummary";
import { trackRecent } from "../../lib/recent";
import type { FileEntry, ProjectMeta } from "../../types";
import {
  engagementFromJson,
  generateProjectReadme,
  isUnfilledTemplate,
  unfilledTemplateNotice,
} from "../../lib/markdown";
import { Editor } from "../Editor";
import { FileTree } from "../FileTree";
import { HubEmpty, HubLayout, HubMain, HubSidebar } from "../layout/HubLayout";
import { MarkdownPreview } from "../MarkdownPreview";
import { PrimaryButton } from "../forms/FormField";
import { SectionFallback } from "../SectionFallback";
import { ExportReportModal } from "./ExportReportModal";
import { HandoffReadiness } from "./HandoffReadiness";
import { MilestoneTracker } from "./MilestoneTracker";
import { OntologyQuickAdd } from "./OntologyQuickAdd";
import { PhaseStepper } from "./PhaseStepper";
import { ProjectWorkspaceHeader, type ProjectTab } from "./ProjectWorkspaceHeader";

const ArchitectureEditor = lazy(() =>
  import("../architecture/ArchitectureEditor").then((m) => ({
    default: m.ArchitectureEditor,
  })),
);

interface ProjectWorkspaceProps {
  project: ProjectMeta;
  onBack: () => void;
}

export function ProjectWorkspace({ project, onBack }: ProjectWorkspaceProps) {
  const [tab, setTab] = useState<ProjectTab>("overview");
  const [overview, setOverview] = useState("");
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [docTree, setDocTree] = useState<FileEntry[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string; dirty: boolean } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);

  const refresh = useCallback(async () => {
    let overviewContent = "";
    try {
      const readme = await api.readFile(`${project.path}/README.md`);
      if (!isUnfilledTemplate(readme)) {
        overviewContent = readme;
      } else {
        try {
          const eng = await api.readJson<Record<string, unknown>>(`${project.path}/engagement.json`);
          const data = engagementFromJson(eng, {
            displayName: project.display_name,
            customer: project.customer,
            status: project.status,
            targetGoLive: project.target_go_live,
          });
          overviewContent = generateProjectReadme(project.slug, data);
        } catch {
          overviewContent = unfilledTemplateNotice(project.display_name);
        }
      }
      setOverview(overviewContent);
      trackRecent(`${project.path}/README.md`, project.display_name, "Overview");
    } catch {
      setOverview(unfilledTemplateNotice(project.display_name));
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
    try {
      const cl = await api.readJson<typeof DEFAULT_CHECKLIST>(checklistPath(project.path));
      setPhaseProgress(computePhaseProgress(cl).overall);
    } catch {
      setPhaseProgress(0);
    }
  }, [project.path, project.display_name, project.customer, project.status, project.target_go_live]);

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

  const copySummary = async () => {
    try {
      const eng = await api.readJson<Record<string, unknown>>(`${project.path}/engagement.json`);
      const text = generateCustomerSummary(project, eng, phaseProgress);
      const ok = await copyToClipboard(text);
      setMessage(ok ? "Customer summary copied to clipboard" : "Could not copy — check permissions");
    } catch {
      const text = generateCustomerSummary(project, null, phaseProgress);
      await copyToClipboard(text);
      setMessage("Customer summary copied to clipboard");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="flex h-full flex-col">
      <ProjectWorkspaceHeader
        project={project}
        tab={tab}
        phaseProgress={phaseProgress}
        message={message}
        onBack={onBack}
        onTabChange={setTab}
        onCopySummary={copySummary}
        onExport={() => setShowExport(true)}
      />

      <div className="min-h-0 flex-1">
        {tab === "overview" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <PhaseStepper projectPath={project.path} currentStatus={project.status} />
              <MilestoneTracker projectPath={project.path} />
              <HandoffReadiness projectPath={project.path} uploadCount={uploads.length} />
              {overview ? (
                <div className="card-kit p-4">
                  <MarkdownPreview content={overview} />
                </div>
              ) : (
                <p className="text-fg-muted">No overview yet.</p>
              )}
            </div>
          </div>
        )}

        {tab === "ontology" && <OntologyQuickAdd projectPath={project.path} />}

        {tab === "architecture" && (
          <Suspense fallback={<SectionFallback />}>
            <ArchitectureEditor projectPath={project.path} />
          </Suspense>
        )}

        {tab === "documents" && (
          <HubLayout>
            <HubSidebar title="Documents" subtitle="Project folder tree">
              <FileTree
                entries={docTree}
                selectedPath={openFile?.path}
                onSelect={async (path) => {
                  const content = await api.readFile(path);
                  setOpenFile({ path, content, dirty: false });
                  trackRecent(path, path.split("/").pop() || path, "Documents");
                }}
              />
            </HubSidebar>
            <HubMain>
              {openFile ? (
                <Editor
                  path={openFile.path}
                  content={openFile.content}
                  dirty={openFile.dirty}
                  defaultView="split"
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
                <HubEmpty
                  icon={FileText}
                  title="Select a document to edit"
                  description="Browse the project tree or pick a markdown file to open in split view."
                />
              )}
            </HubMain>
          </HubLayout>
        )}

        {tab === "files" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-fg-primary">Project references</h3>
                  <p className="mt-1 text-sm text-fg-secondary">
                    Upload specs, screenshots, or customer docs
                  </p>
                </div>
                <PrimaryButton onClick={uploadRef}>
                  <span className="flex items-center gap-1.5">
                    <Upload size={14} /> Upload file
                  </span>
                </PrimaryButton>
              </div>
              {uploads.length === 0 ? (
                <div className="card-kit border-dashed p-12 text-center text-fg-muted">
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
            </div>
          </div>
        )}
      </div>

      <ExportReportModal
        open={showExport}
        projectPath={project.path}
        projectName={project.display_name}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
