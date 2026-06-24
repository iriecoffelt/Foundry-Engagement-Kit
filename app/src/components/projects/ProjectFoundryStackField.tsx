import { useEffect, useState } from "react";
import {
  loadProjectStackUrl,
  normalizeStackUrl,
  saveProjectStackUrl,
} from "../../lib/foundryLinks";
import { SecondaryButton, TextInput } from "../forms/FormField";

interface ProjectFoundryStackFieldProps {
  projectPath: string;
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
}

export function ProjectFoundryStackField({
  projectPath,
  value,
  onChange,
  compact,
}: ProjectFoundryStackFieldProps) {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const save = async () => {
    const normalized = normalizeStackUrl(draft);
    try {
      await saveProjectStackUrl(projectPath, normalized);
      onChange(normalized);
      setStatus("Saved");
      setTimeout(() => setStatus(""), 2000);
    } catch (e) {
      setStatus(String(e));
    }
  };

  if (compact) {
    return (
      <div className="flex min-w-0 flex-1 items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs text-fg-muted">Stack URL</span>
          <TextInput
            value={draft}
            onChange={setDraft}
            placeholder="https://customer.palantirfoundry.com"
          />
        </label>
        <SecondaryButton onClick={save}>Save</SecondaryButton>
        {status && <span className="pb-2 text-xs text-brand-300">{status}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-fg-body">Foundry stack URL</span>
        <TextInput
          value={draft}
          onChange={setDraft}
          placeholder="https://customer.palantirfoundry.com"
        />
        <span className="mt-1.5 block text-xs text-fg-muted">
          Per engagement — saved in engagement.json for deep links from architecture nodes
        </span>
      </label>
      <SecondaryButton onClick={save}>Save stack URL</SecondaryButton>
      {status && <p className="text-xs text-brand-300">{status}</p>}
    </div>
  );
}

export async function loadStackForProject(projectPath: string): Promise<string> {
  return loadProjectStackUrl(projectPath);
}
