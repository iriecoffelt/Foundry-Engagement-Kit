import { Cloud, CloudOff, Download, Loader2, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  hasFoundryConnection,
  loadFoundryConnection,
} from "../../lib/foundryConnection";
import { createFoundryClient } from "../../lib/foundryApi";
import type { FoundryFullMetadata } from "../../lib/foundryTypes";
import {
  fetchOntologyMetadata,
  metadataToElements,
  mergeElements,
  generateSyncSummary,
  countWiredLinkTypes,
} from "../../lib/foundrySync";
import type { OntologyElement } from "../../types";
import { SecondaryButton } from "../forms/FormField";
import { FoundryConnectionModal } from "./FoundryConnectionModal";

interface FoundryImportButtonProps {
  projectPath: string;
  existingElements: OntologyElement[];
  onImport: (
    elements: OntologyElement[],
    metadata?: FoundryFullMetadata,
  ) => void | Promise<void | { edgesAdded?: number }>;
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
        onMessage?.("Select an ontology in Foundry settings, then save the connection.");
        setShowModal(true);
        return;
      }

      const client = createFoundryClient(conn);
      const metadata = await fetchOntologyMetadata(client, conn.ontologyRid);
      const fromFoundry = metadataToElements(metadata);

      if (fromFoundry.length === 0) {
        onMessage?.("No ontology elements returned from Foundry. Check token scopes (api:ontologies-read).");
        return;
      }

      const merged = mergeElements(existingElements, fromFoundry);
      const importResult = await onImport(merged, metadata);
      const ridCount = fromFoundry.filter((el) => el.foundryRid).length;
      const wiredLinks = countWiredLinkTypes(metadata);
      const summary = generateSyncSummary(fromFoundry);
      const extras: string[] = [];
      if (ridCount > 0) extras.push(`${ridCount} RIDs linked`);
      if (wiredLinks > 0) extras.push(`${wiredLinks} link types wired`);
      if (importResult?.edgesAdded != null) {
        extras.push(
          importResult.edgesAdded > 0
            ? `${importResult.edgesAdded} graph connection${importResult.edgesAdded === 1 ? "" : "s"} drawn`
            : "no graph connections — re-import after updating the app",
        );
      }
      extras.push("see Architecture → Foundry ontology");
      onMessage?.(extras.length > 0 ? `${summary} · ${extras.join(" · ")}` : summary);
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
