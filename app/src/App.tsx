import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import type { OpenFile, ProjectMeta, Section } from "./types";
import { Dashboard } from "./components/Dashboard";
import { DailyHub } from "./components/daily/DailyHub";
import { LibraryHub } from "./components/library/LibraryHub";
import { ProjectsHub } from "./components/projects/ProjectsHub";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { WeeklyHub } from "./components/weekly/WeeklyHub";
import { Editor } from "./components/Editor";
import { Modal } from "./components/Modal";

export default function App() {
  const [section, setSection] = useState<Section>("home");
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [projectsWizard, setProjectsWizard] = useState(false);
  const [dailyWizard, setDailyWizard] = useState(false);
  const [weeklyWizard, setWeeklyWizard] = useState(false);

  const [previewFile, setPreviewFile] = useState<OpenFile | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const root = await api.getWorkspaceRoot();
      setWorkspaceRoot(root);
      const projs = await api.listProjectsWithMeta();
      setProjects(projs);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const openPath = async (path: string) => {
    try {
      const content = await api.readFile(path);
      setPreviewFile({ path, content, dirty: false });
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar
        section={section}
        onSectionChange={(s) => {
          setSection(s);
          setPreviewFile(null);
          setProjectsWizard(false);
          setDailyWizard(false);
          setWeeklyWizard(false);
        }}
        workspaceRoot={workspaceRoot}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
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
            onNavigate={(s) => setSection(s)}
            onStartProjectWizard={() => {
              setSection("projects");
              setProjectsWizard(true);
            }}
            onStartStandup={() => {
              setSection("daily");
              setDailyWizard(true);
            }}
            onStartWeekly={() => {
              setSection("weekly");
              setWeeklyWizard(true);
            }}
          />
        )}

        {section === "projects" && (
          <ProjectsHub
            startWizard={projectsWizard}
            onWizardConsumed={() => setProjectsWizard(false)}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        )}

        {section === "daily" && (
          <DailyHub
            startWizard={dailyWizard}
            onWizardConsumed={() => setDailyWizard(false)}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        )}

        {section === "weekly" && (
          <WeeklyHub
            startWizard={weeklyWizard}
            onWizardConsumed={() => setWeeklyWizard(false)}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        )}

        {section === "library" && <LibraryHub />}

        {section === "focus" && (
          <FocusTimer projects={projects} onExit={() => setSection("home")} />
        )}

        {section === "settings" && (
          <SettingsView
            workspaceRoot={workspaceRoot}
            onWorkspaceChange={(root) => {
              setWorkspaceRoot(root);
              setRefreshKey((k) => k + 1);
            }}
          />
        )}
      </div>

      <Modal
        open={!!previewFile}
        title={previewFile?.path.split("/").pop() ?? "Document"}
        onClose={() => setPreviewFile(null)}
        footer={
          previewFile && (
            <button
              onClick={() => setPreviewFile(null)}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Close
            </button>
          )
        }
      >
        {previewFile && (
          <div className="max-h-[60vh] overflow-y-auto">
            <Editor
              path={previewFile.path}
              content={previewFile.content}
              dirty={previewFile.dirty}
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
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
