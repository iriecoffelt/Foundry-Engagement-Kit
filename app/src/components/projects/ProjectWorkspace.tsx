import { FilePlus, FileText } from "lucide-react";
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

  const openDoc = async (path: string) => {
    const content = await api.readFile(path);
    setOpenFile({ path, content, dirty: false });
    setTab("documents");
    trackRecent(path, path.split("/").pop() || path, "Documents");
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

        {tab === "stakeholders" && <StakeholderMap project={project} />}

        {tab === "ontology" && <OntologyQuickAdd projectPath={project.path} />}

        {tab === "architecture" && (
          <Suspense fallback={<SectionFallback />}>
            <ArchitectureEditor projectPath={project.path} />
          </Suspense>
        )}

        {tab === "documents" && (
          <HubLayout>
            <HubSidebar
              title="Documents"
              subtitle="Project folder tree"
              actions={
                <div className="flex flex-wrap gap-2">
                  <DocumentTemplatePicker projectPath={project.path} onCreated={openDoc} />
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
            projectPath={project.path}
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
        projectPath={project.path}
        onClose={() => setShowAdrWizard(false)}
        onCreated={openDoc}
      />

      <ExportReportModal
        open={showExport}
        projectPath={project.path}
        projectName={project.display_name}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
