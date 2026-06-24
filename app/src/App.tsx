import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import { getCadenceAlerts } from "./lib/cadence";
import { startCadenceNotificationPoller } from "./lib/notifications";
import { trackRecent } from "./lib/recent";
import type { OpenFile, ProjectMeta, Section } from "./types";
import { Dashboard } from "./components/Dashboard";
import { Editor } from "./components/Editor";
import { FocusFloatingPill } from "./components/focus/FocusFloatingPill";
import { Modal } from "./components/Modal";
import { SectionFallback } from "./components/SectionFallback";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { OnboardingChecklist } from "./components/onboarding/OnboardingChecklist";
import { WorkspaceSetupModal } from "./components/onboarding/WorkspaceSetupModal";

const ProjectsHub = lazy(() =>
  import("./components/projects/ProjectsHub").then((m) => ({ default: m.ProjectsHub })),
);
const DailyHub = lazy(() =>
  import("./components/daily/DailyHub").then((m) => ({ default: m.DailyHub })),
);
const WeeklyHub = lazy(() =>
  import("./components/weekly/WeeklyHub").then((m) => ({ default: m.WeeklyHub })),
);
const LibraryHub = lazy(() =>
  import("./components/library/LibraryHub").then((m) => ({ default: m.LibraryHub })),
);
const PortfolioHub = lazy(() =>
  import("./components/portfolio/PortfolioHub").then((m) => ({ default: m.PortfolioHub })),
);
const SearchHub = lazy(() =>
  import("./components/search/SearchHub").then((m) => ({ default: m.SearchHub })),
);
const FocusTimer = lazy(() =>
  import("./components/focus/FocusTimer").then((m) => ({ default: m.FocusTimer })),
);
const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((m) => ({ default: m.CommandPalette })),
);

export default function App() {
  const [section, setSection] = useState<Section>("home");
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dailyAutoStart, setDailyAutoStart] = useState(false);
  const [weeklyAutoStart, setWeeklyAutoStart] = useState(false);
  const [syncAutoStart, setSyncAutoStart] = useState(false);
  const [projectsAutoWizard, setProjectsAutoWizard] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<OpenFile | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const configured = await api.isWorkspaceConfigured();
      setWorkspaceReady(configured);
      if (!configured) {
        setWorkspaceRoot("");
        setProjects([]);
        return;
      }
      const root = await api.getWorkspaceRoot();
      setWorkspaceRoot(root);
      setProjects(await api.listProjectsWithMeta());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  useEffect(() => {
    if (!projects.length) return;
    return startCadenceNotificationPoller(() => getCadenceAlerts(projects));
  }, [projects]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openPath = async (path: string) => {
    try {
      const content = await api.readFile(path);
      setPreviewFile({ path, content, dirty: false });
      trackRecent(path, path.split("/").pop() || path, section);
    } catch (e) {
      setError(String(e));
    }
  };

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="flex h-screen bg-surface-base">
      <Sidebar
        section={section}
        onSectionChange={(s) => {
          setSection(s);
          setDailyAutoStart(false);
          setWeeklyAutoStart(false);
          setSyncAutoStart(false);
          setProjectsAutoWizard(false);
        }}
        workspaceRoot={workspaceRoot}
        onRefresh={bump}
        onOpenCommandPalette={() => setCommandOpen(true)}
      />

      <div className="app-main">
        {error && (
          <div className="flex items-center justify-between border-b border-red-900/50 bg-red-950/40 px-4 py-2 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-200">
              Dismiss
            </button>
          </div>
        )}

        {section === "home" && (
          <Dashboard
            projects={projects}
            onNavigate={setSection}
            onStartStandup={() => {
              setSection("daily");
              setDailyAutoStart(true);
            }}
            onStartWeekly={() => {
              setSection("weekly");
              setWeeklyAutoStart(true);
            }}
            onStartCustomerSync={() => {
              setSection("weekly");
              setSyncAutoStart(true);
            }}
            onNewProject={() => {
              setSection("projects");
              setProjectsAutoWizard(true);
            }}
            onOpenRecent={openPath}
          />
        )}

        <Suspense fallback={<SectionFallback />}>
          {section === "portfolio" && (
            <PortfolioHub
              projects={projects}
              onOpenProject={() => setSection("projects")}
            />
          )}

          {section === "projects" && (
            <ProjectsHub
              startWizard={projectsAutoWizard}
              onWizardConsumed={() => setProjectsAutoWizard(false)}
              onRefresh={bump}
            />
          )}

          {section === "daily" && (
            <DailyHub
              startWizard={dailyAutoStart}
              onWizardConsumed={() => setDailyAutoStart(false)}
              onRefresh={bump}
            />
          )}

          {section === "weekly" && (
            <WeeklyHub
              startWizard={weeklyAutoStart}
              startSyncWizard={syncAutoStart}
              onWizardConsumed={() => {
                setWeeklyAutoStart(false);
                setSyncAutoStart(false);
              }}
              onRefresh={bump}
            />
          )}

          {section === "library" && <LibraryHub />}

          {section === "search" && (
            <SearchHub projects={projects} onOpenPath={openPath} />
          )}

          {section === "focus" && (
            <FocusTimer projects={projects} onExit={() => setSection("home")} />
          )}
        </Suspense>

        {section === "settings" && (
          <SettingsView
            workspaceRoot={workspaceRoot}
            onWorkspaceChange={(root) => {
              setWorkspaceRoot(root);
              bump();
            }}
            onRefresh={bump}
          />
        )}
      </div>

      {workspaceReady && (
        <OnboardingChecklist
          workspaceRoot={workspaceRoot}
          projects={projects}
          onNavigate={setSection}
          onStartStandup={() => {
            setSection("daily");
            setDailyAutoStart(true);
          }}
          onNewProject={() => {
            setSection("projects");
            setProjectsAutoWizard(true);
          }}
        />
      )}

      {!workspaceReady && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-surface-base/80 backdrop-blur-sm" />
      )}

      <WorkspaceSetupModal
        open={!workspaceReady}
        onComplete={(root) => {
          setWorkspaceRoot(root);
          setWorkspaceReady(true);
          bump();
        }}
      />

      {commandOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open={commandOpen}
            onClose={() => setCommandOpen(false)}
            projects={projects}
            onNavigate={setSection}
            onStartFocus={() => setSection("focus")}
            onStartStandup={() => {
              setSection("daily");
              setDailyAutoStart(true);
            }}
            onStartWeekly={() => {
              setSection("weekly");
              setWeeklyAutoStart(true);
            }}
            onStartCustomerSync={() => {
              setSection("weekly");
              setSyncAutoStart(true);
            }}
            onNewProject={() => {
              setSection("projects");
              setProjectsAutoWizard(true);
            }}
            onOpenFile={openPath}
          />
        </Suspense>
      )}

      {section !== "focus" && (
        <FocusFloatingPill onOpen={() => setSection("focus")} />
      )}

      <Modal
        open={!!previewFile}
        title={previewFile?.path.split("/").pop() ?? "Document"}
        onClose={() => setPreviewFile(null)}
        footer={
          previewFile && (
            <button
              onClick={() => setPreviewFile(null)}
              className="rounded-lg px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
            >
              Close
            </button>
          )
        }
      >
        {previewFile && (
          <div className="flex h-[60vh] min-h-0 flex-col overflow-hidden">
            <Editor
              path={previewFile.path}
              content={previewFile.content}
              dirty={previewFile.dirty}
              defaultView="edit"
              onChange={(content) =>
                setPreviewFile({ ...previewFile, content, dirty: true })
              }
              onSave={async () => {
                await api.writeFile(previewFile.path, previewFile.content);
                setPreviewFile({ ...previewFile, dirty: false });
              }}
              onDelete={async () => {
                if (!confirm(`Delete ${previewFile.path}?`)) return;
                await api.deletePath(previewFile.path);
                setPreviewFile(null);
                bump();
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
