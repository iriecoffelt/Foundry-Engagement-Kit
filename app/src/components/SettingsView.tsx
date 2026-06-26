import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { pickDirectoryPath } from "../lib/path";
import { BackupSection } from "./settings/BackupSection";
import { NotificationSettings } from "./settings/NotificationSettings";
import { ThemeSelector } from "./settings/ThemeSelector";
import { ShortcutKbd } from "./ShortcutKbd";

interface SettingsViewProps {
  workspaceRoot: string;
  onWorkspaceChange: (root: string) => void;
  onRefresh: () => void;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-base p-4 text-sm leading-relaxed text-fg-body">
      {children}
    </pre>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-kit p-6">
      <h3 className="font-medium text-fg-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-fg-secondary">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function SettingsView({ workspaceRoot, onWorkspaceChange, onRefresh }: SettingsViewProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [folderName, setFolderName] = useState("Foundry Engagement Kit");

  const pickExisting = async () => {
    setError("");
    setSuccess("");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select workspace folder",
    });
    if (!selected) return;
    const path = pickDirectoryPath(selected);
    if (!path) return;
    try {
      await api.setWorkspaceRoot(path);
      onWorkspaceChange(path);
      setSuccess("Workspace updated.");
      onRefresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const createWorkspace = async () => {
    setError("");
    setSuccess("");
    const parent = await open({
      directory: true,
      multiple: false,
      title: "Choose where to create your workspace",
    });
    if (!parent) return;
    const parentPath = pickDirectoryPath(parent);
    if (!parentPath) return;
    try {
      const root = await api.initializeWorkspace(parentPath, folderName, true);
      onWorkspaceChange(root);
      setSuccess("Workspace created.");
      onRefresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="hub-page-shell">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">Settings</h2>
          <p className="mt-1 text-fg-secondary">
            Appearance, workspace location, shortcuts, and how to build the desktop app
          </p>
        </div>

        <Section
          title="Appearance"
          description="Dark or light mode plus accent color for the full app shell — sidebar, cards, editors, and buttons."
        >
          <ThemeSelector />
        </Section>

        <Section
          title="Notifications"
          description="Desktop reminders when standups or weekly reviews are overdue."
        >
          <NotificationSettings />
        </Section>

        <Section
          title="Backup & restore"
          description="Export or import your entire workspace as a ZIP archive."
        >
          <BackupSection onRefresh={onRefresh} />
        </Section>

        <Section
          title="Workspace folder"
          description="Where your engagement data lives on disk. Create a new workspace or point at an existing one."
        >
          <div className="rounded-lg bg-surface-base px-4 py-3 font-mono text-sm text-fg-body break-all">
            {workspaceRoot || "Not configured"}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={createWorkspace}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-fg-on-accent hover:bg-brand-500"
            >
              <FolderOpen size={16} />
              Create new workspace
            </button>
            <button
              onClick={pickExisting}
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-4 py-2 text-sm text-fg-body hover:bg-surface-raised"
            >
              Use existing folder
            </button>
          </div>
          <div className="mt-4">
            <label className="text-sm text-fg-secondary">Name for new workspaces</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-fg-primary"
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
        </Section>

        <Section
          title="First launch"
          description="On first open, the app walks you through creating a workspace with all required folders."
        >
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-body">
            <li>
              Pick a location (Documents, a network drive, etc.) and the app creates{" "}
              <code className="text-brand-300">daily/</code>,{" "}
              <code className="text-brand-300">weekly/</code>,{" "}
              <code className="text-brand-300">project/</code>,{" "}
              <code className="text-brand-300">reference/</code>, and{" "}
              <code className="text-brand-300">project/_template/</code> for you.
            </li>
            <li>
              Use <strong className="text-fg-body">Projects → New engagement</strong> (or Home →
              New engagement) to create projects with the guided setup wizard.
            </li>
            <li>
              Do not copy <code className="text-brand-300">project/_template/</code> by hand —
              that leaves <code className="text-brand-300">{`{{placeholders}}`}</code> in the
              overview.
            </li>
          </ol>
        </Section>

        <Section title="Using the app">
          <ul className="space-y-2 text-sm text-fg-body">
            <li>
              <strong className="text-fg-body">Home</strong> — standup, weekly review, customer
              sync, cadence reminders, recent files
            </li>
            <li>
              <strong className="text-fg-body">Projects</strong> — engagement workspace,
              architecture diagram, ontology, export PDF/DOCX, clone engagements
            </li>
            <li>
              <strong className="text-fg-body">Daily / Weekly</strong> — guided wizards; double-click
              standup entries to edit after saving
            </li>
            <li>
              <strong className="text-fg-body">Library</strong> — reference guides and uploads
            </li>
            <li>
              <strong className="text-fg-body">Focus</strong> — Pomodoro-style timer (full-screen
              or floating pill when minimized)
            </li>
          </ul>
          <p className="mt-4 text-sm text-fg-secondary">Keyboard shortcuts</p>
          <ul className="mt-2 space-y-1 text-sm text-fg-body">
            <li>
              <ShortcutKbd keys="K" /> — command palette (jump anywhere, start wizards)
            </li>
            <li>
              <ShortcutKbd keys="S" /> — save while editing a document
            </li>
          </ul>
        </Section>

        <Section
          title="Development"
          description="Run from source on macOS, Windows, or Linux. Commands run from the app/ directory."
        >
          <CodeBlock>{`cd app\nnpm install\nnpm run tauri dev`}</CodeBlock>
          <p className="mt-3 text-xs text-fg-muted">
            Prerequisites: Node.js 18+, Rust, and{" "}
            <a
              href="https://v2.tauri.app/start/prerequisites/"
              className="text-brand-400 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Tauri system dependencies
            </a>{" "}
            for your OS (WebView2 on Windows, webkit2gtk on Linux).
          </p>
        </Section>

        <Section
          title="Build installers"
          description="Production build for your current platform. Output under src-tauri/target/release/bundle/."
        >
          <CodeBlock>{`cd app\nnpm run tauri:build`}</CodeBlock>
          <p className="mt-4 text-sm text-fg-secondary">Artifacts by platform</p>
          <ul className="mt-2 space-y-2 text-sm text-fg-body">
            <li>
              <strong className="text-fg-body">macOS</strong> —{" "}
              <code className="text-brand-300">bundle/macos/*.app</code>,{" "}
              <code className="text-brand-300">bundle/dmg/*.dmg</code>
              <span className="mt-1 block text-xs text-fg-muted">
                Open DMG after build: <code className="text-brand-300">npm run tauri:install</code>
              </span>
            </li>
            <li>
              <strong className="text-fg-body">Windows</strong> —{" "}
              <code className="text-brand-300">bundle/msi/*.msi</code>,{" "}
              <code className="text-brand-300">bundle/nsis/*-setup.exe</code>
            </li>
            <li>
              <strong className="text-fg-body">Linux</strong> —{" "}
              <code className="text-brand-300">bundle/deb/*.deb</code>,{" "}
              <code className="text-brand-300">bundle/appimage/*.AppImage</code>,{" "}
              <code className="text-brand-300">bundle/rpm/*.rpm</code>
            </li>
          </ul>
          <p className="mt-4 text-xs text-fg-muted">
            GitHub Releases (all platforms): tag <code className="text-brand-300">v0.1.0</code>{" "}
            or later — CI uploads macOS, Windows, and Linux installers automatically.
          </p>
        </Section>

        <Section title="Where data is stored">
          <p className="text-sm text-fg-body">
            Everything is plain markdown and JSON on disk — no cloud sync, no database.
          </p>
          <ul className="mt-3 space-y-1 font-mono text-xs text-fg-secondary">
            <li>daily/{`{project}`}/ — standups</li>
            <li>weekly/{`{project}`}/ — reviews and customer sync prep</li>
            <li>project/{`{slug}`}/ — engagement folders (discovery → handoff)</li>
            <li>reference/ — shared guides</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
