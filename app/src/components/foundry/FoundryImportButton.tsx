import { Cloud, CloudOff, Download, Loader2, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  hasFoundryConnection,
  loadFoundryConnection,
} from "../../lib/foundryConnection";
import { createFoundryClient } from "../../lib/foundryApi";
import {
  metadataToElements,
  mergeElements,
  generateSyncSummary,
} from "../../lib/foundrySync";
import type { OntologyElement } from "../../types";
import { SecondaryButton } from "../forms/FormField";
import { FoundryConnectionModal } from "./FoundryConnectionModal";

interface FoundryImportButtonProps {
  projectPath: string;
  existingElements: OntologyElement[];
  onImport: (elements: OntologyElement[]) => void;
  onMessage?: (msg: string) => void;
}

export function FoundryImportButton({
  projectPath,
  existingElements,
  onImport,
  onMessage,
}: FoundryImportButtonProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const checkConnection = useCallback(async () => {
    const hasConn = await hasFoundryConnection(projectPath);
    setConnected(hasConn);
  }, [projectPath]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleImport = async () => {
    setLoading(true);
    try {
      const conn = await loadFoundryConnection(projectPath);
      if (!conn?.ontologyRid) {
        onMessage?.("No ontology selected — open settings to configure");
        setShowModal(true);
        return;
      }

      const client = createFoundryClient(conn);
      const metadata = await client.getFullMetadata(conn.ontologyRid);
      const fromFoundry = metadataToElements(metadata);
      const merged = mergeElements(existingElements, fromFoundry);

      onImport(merged);
      onMessage?.(generateSyncSummary(fromFoundry));
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <>
        <SecondaryButton onClick={() => setShowModal(true)}>
          <span className="inline-flex items-center gap-2">
            <CloudOff size={14} /> Connect to Foundry
          </span>
        </SecondaryButton>
        <FoundryConnectionModal
          open={showModal}
          projectPath={projectPath}
          onClose={() => setShowModal(false)}
          onConnected={() => {
            setConnected(true);
            setShowModal(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <SecondaryButton onClick={handleImport} disabled={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Importing…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Download size={14} /> Import from Foundry
            </span>
          )}
        </SecondaryButton>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg p-2 text-fg-muted hover:bg-surface-raised hover:text-fg-secondary"
          title="Foundry connection settings"
        >
          <Settings size={14} />
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
          <Cloud size={12} className="text-green-400" /> Connected
        </span>
      </div>
      <FoundryConnectionModal
        open={showModal}
        projectPath={projectPath}
        onClose={() => setShowModal(false)}
        onConnected={() => checkConnection()}
      />
    </>
  );
}
