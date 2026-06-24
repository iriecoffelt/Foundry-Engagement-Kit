import { FilePlus, FileText } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  DEFAULT_CHECKLIST,
  checklistPath,
  computePhaseProgress,
  mergeChecklist,
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
import { SecondaryButton } from "../forms/FormField";
import { SectionFallback } from "../SectionFallback";
import { ExportReportModal } from "./ExportReportModal";
import { AdrWizard } from "./AdrWizard";
import { DocumentTemplatePicker } from "./DocumentTemplatePicker";
import { HandoffReadiness } from "./HandoffReadiness";
import { MilestoneTracker } from "./MilestoneTracker";
import { OntologyQuickAdd } from "./OntologyQuickAdd";
import { PhaseStepper } from "./PhaseStepper";
import { StakeholderMap } from "./StakeholderMap";
import { ProjectWorkspaceHeader, type ProjectTab } from "./ProjectWorkspaceHeader";
import { ProjectLibrary } from "./ProjectLibrary";

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
  const [projectMeta, setProjectMeta] = useState(project);
  const [overview, setOverview] = useState("");
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [docTree, setDocTree] = useState<FileEntry[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string; dirty: boolean } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showAdrWizard, setShowAdrWizard] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [checklistVersion, setChecklistVersion] = useState(0);

  useEffect(() => {
    setProjectMeta(project);
  }, [project]);

  const bumpChecklist = useCallback(() => {
    setChecklistVersion((v) => v + 1);
  }, []);

  const refresh = useCallback(async () => {
    let overviewContent = "";
    try {
      const readme = await api.readFile(`${projectMeta.path}/README.md`);
      if (!isUnfilledTemplate(readme)) {
        overviewContent = readme;
      } else {
        try {
          const eng = await api.readJson<Record<string, unknown>>(
            `${projectMeta.path}/engagement.json`,
          );
          const data = engagementFromJson(eng, {
            displayName: projectMeta.display_name,
            customer: projectMeta.customer,
            status: projectMeta.status,
            targetGoLive: projectMeta.target_go_live,
          });
          overviewContent = generateProjectReadme(projectMeta.slug, data);
        } catch {
          overviewContent = unfilledTemplateNotice(projectMeta.display_name);
        }
      }
      setOverview(overviewContent);
      trackRecent(`${projectMeta.path}/README.md`, projectMeta.display_name, "Overview");
    } catch {
      setOverview(unfilledTemplateNotice(projectMeta.display_name));
    }
    const tree = await api.listDirectory(projectMeta.path, true);
    setDocTree(tree);
    try {
      await api.createDirectory(`${projectMeta.path}/references`);
      const refs = await api.listDirectory(`${projectMeta.path}/references`, false);
      setUploads(refs.filter((e) => !e.is_dir));
    } catch {
      setUploads([]);
    }
    try {
      const cl = mergeChecklist(
        await api.readJson<typeof DEFAULT_CHECKLIST>(checklistPath(projectMeta.path)),
      );
      setPhaseProgress(computePhaseProgress(cl).overall);
    } catch {
      setPhaseProgress(0);
    }
  }, [
    projectMeta.path,
    projectMeta.display_name,
    projectMeta.customer,
    projectMeta.status,
    projectMeta.target_go_live,
    projectMeta.slug,
    checklistVersion,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openDoc = async (path: string) => {
    const content = await api.readFile(path);
    setOpenFile({ path, content, dirty: false });
    setTab("documents");
    trackRecent(path, path.split("/").pop() || path, "Documents");
  };

  const copySummary = async () => {
    try {
      const eng = await api.readJson<Record<string, unknown>>(
        `${projectMeta.path}/engagement.json`,
      );
      const text = generateCustomerSummary(projectMeta, eng, phaseProgress);
      const ok = await copyToClipboard(text);
      setMessage(ok ? "Customer summary copied to clipboard" : "Could not copy — check permissions");
    } catch {
      const text = generateCustomerSummary(projectMeta, null, phaseProgress);
      await copyToClipboard(text);
      setMessage("Customer summary copied to clipboard");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="flex h-full flex-col">
      <ProjectWorkspaceHeader
        project={projectMeta}
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
              <PhaseStepper
                projectPath={projectMeta.path}
                currentStatus={projectMeta.status}
                onProgressChange={(overall) => {
                  setPhaseProgress(overall);
                  bumpChecklist();
                }}
                onStatusChange={(status) => {
                  setProjectMeta((prev) => ({ ...prev, status }));
                }}
              />
              <MilestoneTracker projectPath={projectMeta.path} />
              <HandoffReadiness
                projectPath={projectMeta.path}
                uploadCount={uploads.length}
                checklistVersion={checklistVersion}
              />
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

        {tab === "stakeholders" && <StakeholderMap project={projectMeta} />}

        {tab === "ontology" && <OntologyQuickAdd projectPath={projectMeta.path} />}

        {tab === "architecture" && (
          <Suspense fallback={<SectionFallback />}>
            <ArchitectureEditor projectPath={projectMeta.path} />
          </Suspense>
        )}

        {tab === "documents" && (
          <HubLayout>
            <HubSidebar
              title="Documents"
              subtitle="Project folder tree"
              actions={
                <div className="flex flex-wrap gap-2">
                  <DocumentTemplatePicker projectPath={projectMeta.path} onCreated={openDoc} />
                  <SecondaryButton onClick={() => setShowAdrWizard(true)}>
                    <span className="inline-flex items-center gap-1.5">
                      <FilePlus size={14} /> New ADR
                    </span>
                  </SecondaryButton>
                </div>
              }
            >
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

        {tab === "library" && (
          <ProjectLibrary
            projectPath={projectMeta.path}
            onMessage={(msg) => {
              setMessage(msg);
              setTimeout(() => setMessage(""), 3000);
              refresh();
            }}
          />
        )}
      </div>

      <AdrWizard
        open={showAdrWizard}
        projectPath={projectMeta.path}
        onClose={() => setShowAdrWizard(false)}
        onCreated={openDoc}
      />

      <ExportReportModal
        open={showExport}
        projectPath={projectMeta.path}
        projectName={projectMeta.display_name}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
