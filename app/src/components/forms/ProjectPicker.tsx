import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ProjectMeta } from "../../types";
import { FormField, SelectInput } from "./FormField";

interface ProjectPickerProps {
  value: string;
  onChange: (slug: string, displayName: string) => void;
}

export function ProjectPicker({ value, onChange }: ProjectPickerProps) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  useEffect(() => {
    api.listProjectsWithMeta().then(setProjects).catch(() => setProjects([]));
  }, []);

  const handleChange = (slug: string) => {
    const project = projects.find((p) => p.slug === slug);
    onChange(slug, project?.display_name || slug);
  };

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border-strong bg-surface-base/50 p-6 text-center text-sm text-fg-secondary">
        No projects yet. Create a project first from the Projects section.
      </div>
    );
  }

  return (
    <FormField label="Which engagement is this for?" hint="Entries are saved under this project folder.">
      <SelectInput
        value={value}
        onChange={handleChange}
        options={[
          { value: "", label: "Select a project…" },
          ...projects.map((p) => ({
            value: p.slug,
            label: `${p.display_name}${p.customer ? ` — ${p.customer}` : ""}`,
          })),
        ]}
      />
    </FormField>
  );
}
