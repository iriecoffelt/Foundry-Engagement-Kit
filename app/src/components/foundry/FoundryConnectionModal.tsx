import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  loadFoundryConnection,
  saveFoundryConnection,
  clearFoundryConnection,
} from "../../lib/foundryConnection";
import { createFoundryClient, isValidFoundryConnection } from "../../lib/foundryApi";
import type { FoundryConnection, FoundryOntologyMetadata } from "../../lib/foundryTypes";
import { Modal } from "../Modal";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from "../forms/FormField";

interface FoundryConnectionModalProps {
  open: boolean;
  projectPath: string;
  onClose: () => void;
  onConnected?: (connection: FoundryConnection) => void;
}

type ConnectionStatus = "idle" | "testing" | "success" | "error";

export function FoundryConnectionModal({
  open,
  projectPath,
  onClose,
  onConnected,
}: FoundryConnectionModalProps) {
  const [stackUrl, setStackUrl] = useState("");
  const [token, setToken] = useState("");
  const [ontologyRid, setOntologyRid] = useState("");
  const [ontologies, setOntologies] = useState<FoundryOntologyMetadata[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const conn = await loadFoundryConnection(projectPath);
    if (conn) {
      setStackUrl(conn.stackUrl);
      setToken(conn.token);
      setOntologyRid(conn.ontologyRid || "");
    }
  }, [projectPath]);

  useEffect(() => {
    if (open) {
      load();
      setStatus("idle");
      setMessage("");
      setOntologies([]);
    }
  }, [open, load]);

  const testConnection = async () => {
    if (!stackUrl.trim() || !token.trim()) {
      setMessage("Stack URL and token are required");
      setStatus("error");
      return;
    }

    setStatus("testing");
    setMessage("");

    try {
      const client = createFoundryClient({ stackUrl, token });
      const result = await client.testConnection();

      if (result.success) {
        setStatus("success");
        setMessage(result.message);

        // Load available ontologies
        const ontologiesResult = await client.listOntologies();
        setOntologies(ontologiesResult.data);

        // Auto-select first ontology if none selected
        if (!ontologyRid && ontologiesResult.data.length > 0) {
          setOntologyRid(ontologiesResult.data[0].rid);
        }
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const save = async () => {
    const connection: FoundryConnection = {
      stackUrl: stackUrl.trim(),
      token: token.trim(),
      ontologyRid: ontologyRid || undefined,
    };

    if (!isValidFoundryConnection(connection)) {
      setMessage("Invalid connection settings");
      setStatus("error");
      return;
    }

    await saveFoundryConnection(projectPath, connection);
    setMessage("Connection saved");
    onConnected?.(connection);
    onClose();
  };

  const disconnect = async () => {
    await clearFoundryConnection(projectPath);
    setStackUrl("");
    setToken("");
    setOntologyRid("");
    setOntologies([]);
    setStatus("idle");
    setMessage("Disconnected from Foundry");
  };

  return (
    <Modal open={open} onClose={onClose} title="Foundry Connection">
      <div className="space-y-4">
        <p className="text-sm text-fg-secondary">
          Connect to your Foundry stack to import ontology metadata. Only schema
          information is synced — no customer data leaves Foundry.
        </p>

        <Field label="Foundry Stack URL">
          <TextInput
            value={stackUrl}
            onChange={setStackUrl}
            placeholder="https://your-stack.palantirfoundry.com"
          />
        </Field>

        <Field label="Personal Access Token">
          <TextInput
            value={token}
            onChange={setToken}
            placeholder="ri.foundry-auth.main.service-account-token…"
            type="password"
          />
          <p className="mt-1 text-xs text-fg-muted">
            Generate a token in Foundry:{" "}
            <button
              onClick={() =>
                window.open(
                  stackUrl
                    ? `${stackUrl}/workspace/settings/tokens`
                    : "https://www.palantir.com/docs/foundry/platform-security-third-party/personal-access-tokens/",
                  "_blank",
                )
              }
              className="inline-flex items-center gap-1 text-brand-400 hover:underline"
            >
              Settings → Tokens <ExternalLink size={10} />
            </button>
          </p>
        </Field>

        <div className="flex items-center gap-2">
          <SecondaryButton onClick={testConnection} disabled={status === "testing"}>
            {status === "testing" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Testing…
              </span>
            ) : (
              "Test Connection"
            )}
          </SecondaryButton>

          {status === "success" && (
            <span className="inline-flex items-center gap-1 text-sm text-green-400">
              <CheckCircle2 size={14} /> Connected
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1 text-sm text-red-400">
              <XCircle size={14} /> Failed
            </span>
          )}
        </div>

        {message && (
          <p
            className={`text-sm ${status === "error" ? "text-red-400" : "text-fg-secondary"}`}
          >
            {message}
          </p>
        )}

        {ontologies.length > 0 && (
          <Field label="Ontology">
            <select
              value={ontologyRid}
              onChange={(e) => setOntologyRid(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-fg-primary"
            >
              {ontologies.map((ont) => (
                <option key={ont.rid} value={ont.rid}>
                  {ont.displayName || ont.apiName}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="flex justify-between gap-2 border-t border-surface-border pt-4">
          {stackUrl && (
            <SecondaryButton onClick={disconnect}>Disconnect</SecondaryButton>
          )}
          <div className="ml-auto flex gap-2">
            <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save} disabled={status !== "success"}>
              Save Connection
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
