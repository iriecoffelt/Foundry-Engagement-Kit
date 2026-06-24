import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { ThemeSelector } from "./settings/ThemeSelector";

interface SettingsViewProps {
  workspaceRoot: string;
  onWorkspaceChange: (root: string) => void;
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

export function SettingsView({ workspaceRoot, onWorkspaceChange }: SettingsViewProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pickFolder = async () => {
    setError("");
    setSuccess("");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select template workspace folder",
    });
    if (!selected) return;
    try {
      await api.setWorkspaceRoot(selected);
      onWorkspaceChange(selected);
      setSuccess("Workspace updated successfully.");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
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
          title="Workspace folder"
          description="The root folder for all your engagement data. It must contain daily/, weekly/, project/, and reference/."
        >
          <div className="rounded-lg bg-surface-base px-4 py-3 font-mono text-sm text-fg-body break-all">
            {workspaceRoot || "Not configured — choose a folder below"}
          </div>
          <button
            onClick={pickFolder}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-fg-on-accent hover:bg-brand-500"
          >
            <FolderOpen size={16} />
            Change folder
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
        </Section>

        <Section
          title="First launch"
          description="Point the app at your Palantir Templates workspace if it does not auto-detect."
        >
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-body">
            <li>
              Click <strong className="text-fg-body">Change folder</strong> above and select
              the folder that contains <code className="text-brand-300">daily/</code>,{" "}
              <code className="text-brand-300">weekly/</code>,{" "}
              <code className="text-brand-300">project/</code>, and{" "}
              <code className="text-brand-300">reference/</code>.
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
              <kbd className="rounded border border-surface-border-strong px-1.5 py-0.5 text-xs">⌘K</kbd> —
              command palette (jump anywhere, start wizards)
            </li>
            <li>
              <kbd className="rounded border border-surface-border-strong px-1.5 py-0.5 text-xs">⌘S</kbd> —
              save while editing a document
            </li>
          </ul>
        </Section>

        <Section
          title="Development"
          description="Run from source while working on the app. Run these from the app/ directory."
        >
          <CodeBlock>{`cd app\nnpm install\nnpm run tauri dev`}</CodeBlock>
        </Section>

        <Section
          title="Build & install (macOS)"
          description="Create a standalone .app and drag-to-Applications installer."
        >
          <p className="text-sm text-fg-body">Build only (no installer window):</p>
          <CodeBlock>{`cd app\nnpm run tauri build`}</CodeBlock>
          <p className="mt-4 text-sm text-fg-body">Build and open the DMG installer:</p>
          <CodeBlock>{`cd app\nnpm run tauri:install`}</CodeBlock>
          <p className="mt-4 text-sm text-fg-secondary">Output locations</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-fg-muted">
            <li>app/src-tauri/target/release/bundle/macos/Foundry Engagement Kit.app</li>
            <li>
              app/src-tauri/target/release/bundle/dmg/Foundry Engagement Kit_0.1.0_aarch64.dmg
            </li>
          </ul>
          <p className="mt-4 text-xs text-fg-muted">
            If the installer window closes immediately, eject any mounted copy and run{" "}
            <code className="text-brand-300">npm run tauri:install</code> again, or open the
            .dmg manually from the path above.
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
