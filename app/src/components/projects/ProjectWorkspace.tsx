import { FilePlus, FileText } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { pushNavHistory } from "../../lib/appNavigation";
import { api } from "../../lib/api";
import {
  DEFAULT_CHECKLIST,
  checklistPath,
  computePhaseProgress,
  mergeChecklist,
} from "../../lib/phaseChecklist";
import { copyToClipboard, generateCustomerSummary } from "../../lib/customerSummary";
import { buildWeeklyRollup } from "../../lib/weeklyRollup";
import { trackRecent } from "../../lib/recent";
import type { EngagementStatus, FileEntry, ProjectMeta } from "../../types";
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
import { DeliveryBoardView } from "./DeliveryBoardView";
import { EngagementRegisterView } from "./EngagementRegisterView";
import { UatTrackerView } from "./UatTrackerView";
import { DecisionIndexView } from "./DecisionIndexView";
import { JiraExportModal } from "./JiraExportModal";
import { ExportReportModal } from "./ExportReportModal";
import { AdrWizard } from "./AdrWizard";
import { DocumentTemplatePicker } from "./DocumentTemplatePicker";
import { HandoffReadiness } from "./HandoffReadiness";
import { EngagementTimeline } from "./EngagementTimeline";
import { MilestoneTracker } from "./MilestoneTracker";
import { OntologyQuickAdd } from "./OntologyQuickAdd";
import { PhaseStepper } from "./PhaseStepper";
import { StakeholderMap } from "./StakeholderMap";
import { ProjectWorkspaceHeader, PROJECT_TAB_LABELS, type ProjectTab } from "./ProjectWorkspaceHeader";
import { ProjectLibrary } from "./ProjectLibrary";
import { ProjectUsersView } from "./ProjectUsersView";

const ArchitectureEditor = lazy(() =>
  import("../architecture/ArchitectureEditor").then((m) => ({
    default: m.ArchitectureEditor,
  })),
);

interface ProjectWorkspaceProps {
  project: ProjectMeta;
  initialTab?: ProjectTab;
  onBack: () => void;
}

function getTabStorageKey(projectPath: string) {
  return `project-tab-${projectPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

export function ProjectWorkspace({ project, initialTab, onBack }: ProjectWorkspaceProps) {
  const [tab, setTabInternal] = useState<ProjectTab>(() => {
    if (initialTab) return initialTab;
    try {
      const stored = localStorage.getItem(getTabStorageKey(project.path));
      if (stored && Object.keys(PROJECT_TAB_LABELS).includes(stored)) {
        return stored as ProjectTab;
      }
    } catch {
      // localStorage unavailable
    }
    return "overview";
  });
  const tabHistoryRef = useRef<ProjectTab[]>([]);

  const setTab = useCallback((nextTab: ProjectTab) => {
    setTabInternal(nextTab);
    try {
      localStorage.setItem(getTabStorageKey(project.path), nextTab);
    } catch {
      // localStorage unavailable
    }
  }, [project.path]);
  const [tabBackLabel, setTabBackLabel] = useState<string | undefined>();
  const [projectMeta, setProjectMeta] = useState(project);
  const [overview, setOverview] = useState("");
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [docTree, setDocTree] = useState<FileEntry[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string; dirty: boolean } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showJira, setShowJira] = useState(false);
  const [showAdrWizard, setShowAdrWizard] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [checklistVersion, setChecklistVersion] = useState(0);
  const [deliveryCardId, setDeliveryCardId] = useState<string | null>(null);
  const [architectureNodeId, setArchitectureNodeId] = useState<string | null>(null);

  useEffect(() => {
    setProjectMeta(project);
  }, [project]);

  useEffect(() => {
    tabHistoryRef.current = [];
    setTabBackLabel(undefined);
    if (initialTab) {
      setTab(initialTab);
    } else {
      try {
        const stored = localStorage.getItem(getTabStorageKey(project.path));
        if (stored && Object.keys(PROJECT_TAB_LABELS).includes(stored)) {
          setTab(stored as ProjectTab);
          return;
        }
      } catch {
        // localStorage unavailable
      }
      setTab("overview");
    }
  }, [initialTab, project.path, setTab]);

  const changeTab = useCallback((next: ProjectTab) => {
    if (tab !== next) {
      tabHistoryRef.current = pushNavHistory(tabHistoryRef.current, tab);
      setTabBackLabel(PROJECT_TAB_LABELS[tab]);
    }
    setTab(next);
  }, [tab, setTab]);

  const handleBack = useCallback(() => {
    const history = tabHistoryRef.current;
    if (history.length > 0) {
      const previous = history[history.length - 1];
      tabHistoryRef.current = history.slice(0, -1);
      setTab(previous);
      setTabBackLabel(tabHistoryRef.current.length ? PROJECT_TAB_LABELS[tabHistoryRef.current[tabHistoryRef.current.length - 1]] : undefined);
      return;
    }
    onBack();
  }, [onBack]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "[") return;
      if (tabHistoryRef.current.length === 0) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      handleBack();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [handleBack]);

  const bumpChecklist = useCallback(() => {
    setChecklistVersion((v) => v + 1);
  }, []);

  const handleProgressChange = useCallback((overall: number) => {
    setPhaseProgress(overall);
  }, []);

  const handleStatusChange = useCallback((status: EngagementStatus) => {
    setProjectMeta((prev) => ({ ...prev, status }));
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
  }, [
    projectMeta.path,
    projectMeta.display_name,
    projectMeta.customer,
    projectMeta.status,
    projectMeta.target_go_live,
    projectMeta.slug,
  ]);

  const refreshPhaseProgress = useCallback(async () => {
    try {
      const cl = mergeChecklist(
        await api.readJson<typeof DEFAULT_CHECKLIST>(checklistPath(projectMeta.path)),
      );
      setPhaseProgress(computePhaseProgress(cl).overall);
    } catch {
      setPhaseProgress(0);
    }
  }, [projectMeta.path]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (checklistVersion === 0) return;
    refreshPhaseProgress();
  }, [checklistVersion, refreshPhaseProgress]);

  const openDoc = async (path: string) => {
    const content = await api.readFile(path);
    setOpenFile({ path, content, dirty: false });
    changeTab("documents");
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

  const copyWeeklyRollup = async () => {
    try {
      const text = await buildWeeklyRollup(projectMeta);
      const ok = await copyToClipboard(text);
      setMessage(ok ? "Weekly rollup copied to clipboard" : "Could not copy — check permissions");
    } catch {
      setMessage("Could not build weekly rollup");
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
        backLabel={tabBackLabel}
        onBack={handleBack}
        onTabChange={changeTab}
        onCopySummary={copySummary}
        onCopyWeeklyRollup={copyWeeklyRollup}
        onExport={() => setShowExport(true)}
        onJiraExport={() => setShowJira(true)}
      />

      <div className="min-h-0 flex-1">
        {tab === "overview" && (
          <div className="h-full scroll-region p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="overview-section">
                <PhaseStepper
                  projectPath={projectMeta.path}
                  currentStatus={projectMeta.status}
                  onProgressChange={handleProgressChange}
                  onStatusChange={handleStatusChange}
                  onChecklistSaved={bumpChecklist}
                />
              </div>
              <div className="overview-section">
                <MilestoneTracker projectPath={projectMeta.path} />
              </div>
              <div className="overview-section">
                <EngagementTimeline
                  projectPath={projectMeta.path}
                  projectSlug={projectMeta.slug}
                  onOpenTab={changeTab}
                />
              </div>
              <div className="overview-section">
                <HandoffReadiness
                  projectPath={projectMeta.path}
                  projectName={projectMeta.display_name}
                  uploadCount={uploads.length}
                  checklistVersion={checklistVersion}
                />
              </div>
              {overview ? (
                <div className="overview-section card-kit-scroll p-4">
                  <MarkdownPreview content={overview} />
                </div>
              ) : (
                <p className="text-fg-muted">No overview yet.</p>
              )}
            </div>
          </div>
        )}

        {tab === "delivery" && (
          <DeliveryBoardView
            projectPath={projectMeta.path}
            initialSelectedCardId={deliveryCardId}
            onNavigateToArchitecture={(nodeId) => {
              setArchitectureNodeId(nodeId);
              setDeliveryCardId(null);
              changeTab("architecture");
            }}
            onOpenDocument={openDoc}
          />
        )}

        {tab === "register" && <EngagementRegisterView projectPath={projectMeta.path} />}

        {tab === "uat" && <UatTrackerView projectPath={projectMeta.path} />}

        {tab === "decisions" && (
          <DecisionIndexView
            projectPath={projectMeta.path}
            onOpenAdr={openDoc}
            onNewAdr={() => setShowAdrWizard(true)}
          />
        )}

        {tab === "stakeholders" && <StakeholderMap project={projectMeta} />}

        {tab === "ontology" && (
          <OntologyQuickAdd
            projectPath={projectMeta.path}
            onOpenArchitecture={() => changeTab("architecture")}
          />
        )}

        {tab === "architecture" && (
          <Suspense fallback={<SectionFallback />}>
            <ArchitectureEditor
              projectPath={projectMeta.path}
              initialSelectedNodeId={architectureNodeId}
              onOpenDelivery={(cardId) => {
                setDeliveryCardId(cardId);
                setArchitectureNodeId(null);
                changeTab("delivery");
              }}
            />
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
                storageKey={`project-docs-${project.slug}`}
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

        {tab === "users" && <ProjectUsersView project={projectMeta} />}
      </div>

      <AdrWizard
        open={showAdrWizard}
        projectPath={projectMeta.path}
        onClose={() => setShowAdrWizard(false)}
        onCreated={openDoc}
      />

      <JiraExportModal
        open={showJira}
        project={projectMeta}
        onClose={() => setShowJira(false)}
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
