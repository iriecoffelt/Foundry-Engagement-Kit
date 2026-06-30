import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useSyncExternalStore, useState } from "react";
import { api } from "./lib/api";
import { useAppNavigation } from "./lib/appNavigation";
import {
  getAppSection,
  openFocusSession,
  setAppSection,
  setOpenFocusHandler,
  subscribeAppSection,
} from "./lib/appSectionStore";
import { getCadenceAlerts } from "./lib/cadence";
import { startCadenceNotificationPoller } from "./lib/notifications";
import { trackRecent } from "./lib/recent";
import { subscribeEngagementSaved } from "./lib/engagementData";
import {
  projectMetaPatchFromEngagement,
  slugFromProjectPath,
} from "./lib/engagementMeta";
import { invalidateDashboard, invalidatePortfolio } from "./lib/workspaceStore";
import type { OpenFile, ProjectMeta, Section } from "./types";
import { Dashboard } from "./components/Dashboard";
import { Editor } from "./components/Editor";
import { ErrorBanner } from "./components/ErrorBanner";
import { FocusFloatingPill } from "./components/focus/FocusFloatingPill";
import { useFocusTimerContext } from "./context/FocusTimerContext";
import { Modal } from "./components/Modal";
import { NavigationBackBar } from "./components/NavigationBackBar";
import { SectionFallback } from "./components/SectionFallback";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { OnboardingChecklist } from "./components/onboarding/OnboardingChecklist";
import { WorkspaceSetupModal } from "./components/onboarding/WorkspaceSetupModal";
import type { ProjectTab } from "./components/projects/ProjectWorkspaceHeader";

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
  return (
    <>
      <AppMain />
      <FocusFloatingPillGate />
    </>
  );
}

function FocusFloatingPillGate() {
  const section = useSyncExternalStore(subscribeAppSection, getAppSection);
  const { isActive } = useFocusTimerContext();
  if (section === "focus" || !isActive) return null;
  return <FocusFloatingPill onOpen={openFocusSession} />;
}

const AppMain = memo(function AppMain() {
  const { current, canGoBack, previousFrame, navigate, goBack } = useAppNavigation({
    section: "home",
  });
  const section = current.section;

  useEffect(() => {
    setAppSection(section);
  }, [section]);

  useEffect(() => {
    setOpenFocusHandler(() => navigate({ section: "focus" }));
  }, [navigate]);

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

  const projectNames = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.slug, p.display_name])),
    [projects],
  );

  const openProject = useCallback(
    (slug: string, tab?: string) => {
      navigate({
        section: "projects",
        projectSlug: slug,
        projectTab: tab,
      });
    },
    [navigate],
  );

  const goToSection = useCallback(
    (next: Section) => {
      navigate({ section: next });
    },
    [navigate],
  );

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
    return subscribeEngagementSaved((projectPath, eng) => {
      const slug = slugFromProjectPath(projectPath);
      const patch = projectMetaPatchFromEngagement(eng);
      if (Object.keys(patch).length === 0) return;
      setProjects((prev) => prev.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
    });
  }, []);

  const projectSlugs = useMemo(
    () => projects.map((p) => p.slug).sort().join(","),
    [projects],
  );

  useEffect(() => {
    if (!projectSlugs) return;
    return startCadenceNotificationPoller(() => getCadenceAlerts(projects));
  }, [projectSlugs, projects]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "[") {
        e.preventDefault();
        if (canGoBack) goBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canGoBack, goBack]);

  const openPath = async (path: string) => {
    try {
      const content = await api.readFile(path);
      setPreviewFile({ path, content, dirty: false });
      trackRecent(path, path.split("/").pop() || path, section);
    } catch (e) {
      setError(String(e));
    }
  };

  const bump = () => {
    invalidateDashboard();
    invalidatePortfolio();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-screen bg-surface-base">
      <Sidebar
        section={section}
        onSectionChange={(s) => {
          goToSection(s);
          setDailyAutoStart(false);
          setWeeklyAutoStart(false);
          setSyncAutoStart(false);
          setProjectsAutoWizard(false);
        }}
        workspaceRoot={workspaceRoot}
        projectPath={
          current.projectSlug && workspaceRoot
            ? `${workspaceRoot}/${current.projectSlug}`
            : undefined
        }
        onRefresh={bump}
        onOpenCommandPalette={() => setCommandOpen(true)}
      />

      <div className="app-main flex min-w-0 flex-1 flex-col">
        <NavigationBackBar
          canGoBack={canGoBack && !current.projectSlug}
          previousFrame={previousFrame}
          projectNames={projectNames}
          onBack={goBack}
        />

        {error && (
          <ErrorBanner
            message={error}
            onDismiss={() => setError("")}
            action={{ label: "Retry", onClick: refresh }}
            helpText="Check your workspace configuration or try again"
          />
        )}

        <div className="min-h-0 flex-1">
          {section === "home" && (
            <Dashboard
              projects={projects}
              refreshKey={refreshKey}
              onNavigate={goToSection}
              onStartStandup={() => {
                navigate({ section: "daily" });
                setDailyAutoStart(true);
              }}
              onStartWeekly={() => {
                navigate({ section: "weekly" });
                setWeeklyAutoStart(true);
              }}
              onStartCustomerSync={() => {
                navigate({ section: "weekly" });
                setSyncAutoStart(true);
              }}
              onNewProject={() => {
                navigate({ section: "projects" });
                setProjectsAutoWizard(true);
              }}
              onOpenRecent={openPath}
              onOpenProject={openProject}
            />
          )}

          <Suspense fallback={<SectionFallback />}>
            {section === "portfolio" && (
              <PortfolioHub
                projects={projects}
                refreshKey={refreshKey}
                onOpenProject={openProject}
              />
            )}

            {section === "projects" && (
              <ProjectsHub
                projects={projects}
                startWizard={projectsAutoWizard}
                onWizardConsumed={() => setProjectsAutoWizard(false)}
                onRefresh={bump}
                activeProjectSlug={current.projectSlug}
                activeProjectTab={current.projectTab as ProjectTab | undefined}
                onOpenProject={(slug, tab) => openProject(slug, tab)}
                onBack={goBack}
              />
            )}

            {section === "daily" && (
              <DailyHub
                projects={projects}
                startWizard={dailyAutoStart}
                onWizardConsumed={() => setDailyAutoStart(false)}
                onRefresh={bump}
              />
            )}

            {section === "weekly" && (
              <WeeklyHub
                projects={projects}
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
              <FocusTimer projects={projects} onExit={() => navigate({ section: "home" })} />
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
      </div>

      {workspaceReady && (
        <OnboardingChecklist
          workspaceRoot={workspaceRoot}
          projects={projects}
          onNavigate={goToSection}
          onStartStandup={() => {
            navigate({ section: "daily" });
            setDailyAutoStart(true);
          }}
          onNewProject={() => {
            navigate({ section: "projects" });
            setProjectsAutoWizard(true);
          }}
        />
      )}

      {!workspaceReady && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-surface-base/90" />
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
            onNavigate={goToSection}
            onStartFocus={() => navigate({ section: "focus" })}
            onStartStandup={() => {
              navigate({ section: "daily" });
              setDailyAutoStart(true);
            }}
            onStartWeekly={() => {
              navigate({ section: "weekly" });
              setWeeklyAutoStart(true);
            }}
            onStartCustomerSync={() => {
              navigate({ section: "weekly" });
              setSyncAutoStart(true);
            }}
            onNewProject={() => {
              navigate({ section: "projects" });
              setProjectsAutoWizard(true);
            }}
            onOpenFile={openPath}
          />
        </Suspense>
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
});
