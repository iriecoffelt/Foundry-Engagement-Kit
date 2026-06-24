import { save } from "@tauri-apps/plugin-dialog";
import { Archive } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { Modal } from "../Modal";

interface HandoffPackModalProps {
  open: boolean;
  projectPath: string;
  projectName: string;
  onClose: () => void;
}

export function HandoffPackModal({
  open,
  projectPath,
  projectName,
  onClose,
}: HandoffPackModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const exportPack = async () => {
    setError("");
    setSuccess("");
    const dest = await save({
      title: "Save handoff pack",
      defaultPath: `${projectName.replace(/\s+/g, "-")}-handoff-pack.zip`,
      filters: [{ name: "ZIP archive", extensions: ["zip"] }],
    });
    if (!dest) return;

    setLoading(true);
    try {
      await api.exportHandoffPack(projectPath, dest);
      setSuccess("Handoff pack saved successfully");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Download handoff pack"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
          >
            {success ? "Close" : "Cancel"}
          </button>
          {!success && (
            <button
              onClick={exportPack}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-fg-on-accent hover:bg-brand-500 disabled:opacity-40"
            >
              <Archive size={16} />
              {loading ? "Building…" : "Download ZIP"}
            </button>
          )}
        </>
      }
    >
      <p className="text-sm text-fg-secondary">
        Bundle handoff artifacts into a shareable ZIP for customer delivery or internal archive.
      </p>

      <ul className="mt-4 space-y-1 text-xs text-fg-muted">
        <li>• README, engagement metadata, and checklists</li>
        <li>• ADRs, runbook, and handoff documentation</li>
        <li>• UAT scenarios, delivery board, and architecture</li>
        <li>• Stakeholder / register exports and generated index</li>
      </ul>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
    </Modal>
  );
}
