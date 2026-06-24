import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { copyToClipboard } from "../../lib/customerSummary";
import {
  buildJiraExportMarkdown,
  jiraProjectUrl,
  loadJiraConfig,
  saveJiraConfig,
} from "../../lib/jiraExport";
import type { ProjectMeta } from "../../types";
import { Field, PrimaryButton, SecondaryButton, TextInput } from "../forms/FormField";
import { Modal } from "../Modal";

interface JiraExportModalProps {
  open: boolean;
  project: ProjectMeta;
  onClose: () => void;
}

export function JiraExportModal({ open, project, onClose }: JiraExportModalProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!open) return;
    loadJiraConfig(project.path).then((c) => {
      setBaseUrl(c.baseUrl || "");
      setProjectKey(c.projectKey || "");
    });
    buildJiraExportMarkdown(project).then(setPreview);
  }, [open, project]);

  const saveConfig = async () => {
    await saveJiraConfig(project.path, { baseUrl, projectKey });
    setMessage("Jira settings saved");
    setTimeout(() => setMessage(""), 2000);
  };

  const copyExport = async () => {
    const md = await buildJiraExportMarkdown(project);
    const ok = await copyToClipboard(md);
    setMessage(ok ? "Status export copied — paste into Jira or Confluence" : "Copy failed");
    setTimeout(() => setMessage(""), 3000);
  };

  const projectUrl = jiraProjectUrl({ baseUrl, projectKey });

  return (
    <Modal open={open} onClose={onClose} title="Jira & status export">
      <div className="space-y-5">
        <p className="text-sm text-fg-secondary">
          Link your customer&apos;s Jira project and export a markdown status block you can paste
          into an issue or Confluence page.
        </p>

        <Field label="Jira base URL" hint="e.g. https://yourcompany.atlassian.net">
          <TextInput
            value={baseUrl}
            onChange={setBaseUrl}
            placeholder="https://company.atlassian.net"
          />
        </Field>
        <Field label="Project key" hint="e.g. ENG">
          <TextInput value={projectKey} onChange={setProjectKey} placeholder="ENG" />
        </Field>

        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={saveConfig}>Save Jira link</SecondaryButton>
          {projectUrl && (
            <a
              href={projectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border-strong px-4 py-2 text-sm text-fg-body hover:text-fg-primary"
            >
              <ExternalLink size={14} /> Open in Jira
            </a>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-fg-primary">Export preview</p>
          <pre className="max-h-48 overflow-auto rounded-lg border border-surface-border bg-surface-base p-3 text-xs text-fg-body">
            {preview}
          </pre>
        </div>

        <PrimaryButton onClick={copyExport}>Copy status for Jira / Confluence</PrimaryButton>

        {message && <p className="text-sm text-brand-300">{message}</p>}
      </div>
    </Modal>
  );
}
