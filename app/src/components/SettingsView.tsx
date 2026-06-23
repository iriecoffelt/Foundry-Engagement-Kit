import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";

interface SettingsViewProps {
  workspaceRoot: string;
  onWorkspaceChange: (root: string) => void;
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
      setSuccess("Workspace updated successfully");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="mt-1 text-slate-400">Configure your template workspace</p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="font-medium text-white">Workspace folder</h3>
          <p className="mt-1 text-sm text-slate-400">
            The root folder containing daily/, weekly/, project/, and reference/
          </p>

          <div className="mt-4 rounded-lg bg-slate-950 px-4 py-3 font-mono text-sm text-slate-300 break-all">
            {workspaceRoot}
          </div>

          <button
            onClick={pickFolder}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500"
          >
            <FolderOpen size={16} />
            Change folder
          </button>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="font-medium text-white">Build executable</h3>
          <p className="mt-2 text-sm text-slate-400">
            From the <code className="text-brand-300">app/</code> directory:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-300">
            npm install{"\n"}npm run tauri build
          </pre>
          <p className="mt-2 text-xs text-slate-500">
            Output: app/src-tauri/target/release/bundle/
          </p>
        </div>
      </div>
    </div>
  );
}
