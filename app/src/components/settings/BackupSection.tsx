import { open, save } from "@tauri-apps/plugin-dialog";
import { Archive, Download, Upload } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { PrimaryButton, SecondaryButton } from "../forms/FormField";

interface BackupSectionProps {
  onRefresh: () => void;
}

export function BackupSection({ onRefresh }: BackupSectionProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const exportBackup = async () => {
    const dest = await save({
      title: "Export workspace backup",
      defaultPath: `foundry-engagement-kit-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: "ZIP archive", extensions: ["zip"] }],
    });
    if (!dest) return;
    setBusy(true);
    setStatus("");
    try {
      await api.exportWorkspaceArchive(dest);
      setStatus("Backup exported successfully.");
      onRefresh();
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async () => {
    const source = await open({
      title: "Import workspace backup",
      multiple: false,
      filters: [{ name: "ZIP archive", extensions: ["zip"] }],
    });
    if (!source || typeof source !== "string") return;
    if (
      !confirm(
        "Import will merge files from the archive into your workspace. Existing files with the same path may be overwritten. Continue?",
      )
    ) {
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      await api.importWorkspaceArchive(source);
      setStatus("Backup imported successfully. Refreshing workspace…");
      onRefresh();
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-body">
        Export or restore <code className="text-brand-300">daily/</code>,{" "}
        <code className="text-brand-300">weekly/</code>,{" "}
        <code className="text-brand-300">project/</code>, and{" "}
        <code className="text-brand-300">reference/</code> as a ZIP archive.
      </p>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={exportBackup} disabled={busy}>
          <span className="inline-flex items-center gap-2">
            <Download size={14} />
            Export backup
          </span>
        </PrimaryButton>
        <SecondaryButton onClick={importBackup} disabled={busy}>
          <span className="inline-flex items-center gap-2">
            <Upload size={14} />
            Import backup
          </span>
        </SecondaryButton>
      </div>
      {status && (
        <p
          className={`flex items-center gap-2 text-sm ${
            status.includes("success") ? "text-green-400" : "text-fg-secondary"
          }`}
        >
          <Archive size={14} />
          {status}
        </p>
      )}
    </div>
  );
}
