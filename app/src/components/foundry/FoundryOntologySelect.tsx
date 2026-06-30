import { useCallback, useEffect, useState } from "react";
import { createFoundryClient } from "../../lib/foundryApi";
import {
  hasFoundryConnection,
  loadFoundryConnection,
  saveFoundryConnection,
} from "../../lib/foundryConnection";
import type { FoundryOntologyMetadata } from "../../lib/foundryTypes";

interface FoundryOntologySelectProps {
  projectPath: string;
  /** Called after the user picks a different ontology (already persisted). */
  onChange?: (ontologyRid: string) => void;
  compact?: boolean;
  className?: string;
}

export function FoundryOntologySelect({
  projectPath,
  onChange,
  compact = false,
  className = "",
}: FoundryOntologySelectProps) {
  const [connected, setConnected] = useState(false);
  const [ontologies, setOntologies] = useState<FoundryOntologyMetadata[]>([]);
  const [ontologyRid, setOntologyRid] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const hasConn = await hasFoundryConnection(projectPath);
    setConnected(hasConn);
    if (!hasConn) {
      setOntologies([]);
      setOntologyRid("");
      return;
    }

    const conn = await loadFoundryConnection(projectPath);
    setOntologyRid(conn?.ontologyRid || "");

    if (!conn?.token) return;

    setLoading(true);
    try {
      const client = createFoundryClient(conn);
      const result = await client.listOntologies();
      setOntologies(result.data);
    } catch {
      setOntologies([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleChange = async (rid: string) => {
    setOntologyRid(rid);
    const conn = await loadFoundryConnection(projectPath);
    if (!conn) return;
    await saveFoundryConnection(projectPath, { ...conn, ontologyRid: rid });
    onChange?.(rid);
  };

  if (!connected) {
    return (
      <p className={`text-xs text-fg-muted ${className}`}>
        Connect to Foundry on the Ontology tab to choose an ontology.
      </p>
    );
  }

  const selected = ontologies.find((o) => o.rid === ontologyRid);

  return (
    <div className={className}>
      {!compact && (
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-fg-muted">
          Foundry ontology
        </label>
      )}
      {ontologies.length > 0 ? (
        <select
          value={ontologyRid}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full min-w-[12rem] rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-fg-primary"
        >
          {ontologies.map((ont) => (
            <option key={ont.rid} value={ont.rid}>
              {ont.displayName || ont.apiName}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-xs text-fg-muted">
          {loading
            ? "Loading ontologies…"
            : selected
              ? selected.displayName || selected.apiName
              : "Open Foundry settings to load ontologies"}
        </p>
      )}
    </div>
  );
}
