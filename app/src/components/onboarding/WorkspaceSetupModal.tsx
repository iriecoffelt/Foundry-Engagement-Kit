import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { joinPath, pickDirectoryPath } from "../../lib/path";
import { PrimaryButton } from "../forms/FormField";
import { Modal } from "../Modal";

const DEFAULT_FOLDER_NAME = "Foundry Engagement Kit";

interface WorkspaceSetupModalProps {
  open: boolean;
  onComplete: (root: string) => void;
}

export function WorkspaceSetupModal({ open: isOpen, onComplete }: WorkspaceSetupModalProps) {
  const [parentPath, setParentPath] = useState("");
  const [folderName, setFolderName] = useState(DEFAULT_FOLDER_NAME);
  const [createSubfolder, setCreateSubfolder] = useState(true);
  const [useExisting, setUseExisting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const mobile = await api.isMobilePlatform();
        if (cancelled) return;
        setIsMobile(mobile);
        if (mobile) {
          const parent = await api.getDefaultWorkspaceParent();
          if (!cancelled) setParentPath(parent);
        }
      } catch {
        if (!cancelled) setIsMobile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const pickParent = async () => {
    setError("");
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: useExisting
          ? "Select an existing workspace folder"
          : "Choose where to create your workspace",
      });
      if (!selected) return;
      const path = pickDirectoryPath(selected);
      if (!path) return;
      setParentPath(path);
    } catch (e) {
      setError(String(e));
    }
  };

  const submit = async () => {
    if (!parentPath) {
      setError("Choose a folder first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let root: string;
      if (useExisting) {
        await api.setWorkspaceRoot(parentPath);
        root = parentPath;
      } else {
        root = await api.initializeWorkspace(parentPath, folderName, createSubfolder);
      }
      onComplete(root);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const destination = parentPath
    ? createSubfolder && !useExisting
      ? joinPath(parentPath, folderName.trim() || DEFAULT_FOLDER_NAME)
      : parentPath
    : "";

  return (
    <Modal
      open={isOpen}
      title="Set up your workspace"
      onClose={() => {}}
      closeOnEscape={false}
      wide
      hideClose
      footer={
        <PrimaryButton onClick={submit} disabled={busy || !parentPath}>
          {busy ? "Creating…" : useExisting ? "Use this workspace" : "Create workspace"}
        </PrimaryButton>
      }
    >
      <p className="text-sm text-fg-secondary">
        {isMobile
          ? "Your engagements, standups, and reference guides are stored as plain files in this app's Documents folder. Tap Create workspace to set up the default folder structure."
          : "Your engagements, standups, and reference guides are stored as plain files on disk. Pick where that folder should live — Documents, a network drive, or anywhere you have write access."}
      </p>

      {!isMobile && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setUseExisting(false);
              setError("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              !useExisting
                ? "bg-brand-600 text-fg-on-accent"
                : "bg-surface-elevated text-fg-secondary hover:text-fg-primary"
            }`}
          >
            Create new
          </button>
          <button
            type="button"
            onClick={() => {
              setUseExisting(true);
              setCreateSubfolder(false);
              setError("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              useExisting
                ? "bg-brand-600 text-fg-on-accent"
                : "bg-surface-elevated text-fg-secondary hover:text-fg-primary"
            }`}
          >
            Use existing
          </button>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-fg-body">
            {useExisting ? "Workspace folder" : "Location"}
          </label>
          <div className="mt-2 flex gap-2">
            <div className="min-h-10 flex-1 rounded-lg bg-surface-base px-3 py-2 font-mono text-xs text-fg-body break-all">
              {parentPath
                ? isMobile
                  ? joinPath(parentPath, folderName.trim() || DEFAULT_FOLDER_NAME)
                  : parentPath
                : isMobile
                  ? "Preparing location…"
                  : "No folder selected"}
            </div>
            {!isMobile && (
              <button
                type="button"
                onClick={pickParent}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-fg-body hover:bg-surface-raised"
              >
                <FolderOpen size={16} />
                Browse
              </button>
            )}
          </div>
        </div>

        {!useExisting && (
          <>
            <label className="flex items-center gap-2 text-sm text-fg-body">
              <input
                type="checkbox"
                checked={createSubfolder}
                onChange={(e) => setCreateSubfolder(e.target.checked)}
                className="rounded border-surface-border"
              />
              Create a subfolder with this name
            </label>
            {createSubfolder && (
              <div>
                <label className="text-sm font-medium text-fg-body">Folder name</label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-fg-primary"
                  placeholder={DEFAULT_FOLDER_NAME}
                />
              </div>
            )}
          </>
        )}

        {destination && !useExisting && (
          <p className="text-xs text-fg-muted">
            Will create: <span className="font-mono text-fg-secondary">{destination}</span>
            {" — including "}
            <code className="text-brand-300">daily/</code>, <code className="text-brand-300">weekly/</code>,{" "}
            <code className="text-brand-300">project/</code>, <code className="text-brand-300">reference/</code>, and{" "}
            <code className="text-brand-300">project/_template/</code>
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </Modal>
  );
}
