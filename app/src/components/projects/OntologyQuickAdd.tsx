import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { generateOntologySection } from "../../lib/markdown";
import type { OntologyObjectType } from "../../types";
import { Field, FormCard, PrimaryButton, TextArea, TextInput } from "../forms/FormField";

const ONTOLOGY_JSON = (projectPath: string) => `${projectPath}/02-design/ontology-objects.json`;

interface OntologyQuickAddProps {
  projectPath: string;
}

export function OntologyQuickAdd({ projectPath }: OntologyQuickAddProps) {
  const [objects, setObjects] = useState<OntologyObjectType[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryKey, setPrimaryKey] = useState("");
  const [properties, setProperties] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.readJson<OntologyObjectType[]>(ONTOLOGY_JSON(projectPath));
      setObjects(data);
    } catch {
      setObjects([]);
    }
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAll = async (updated: OntologyObjectType[]) => {
    await api.writeJson(ONTOLOGY_JSON(projectPath), updated);
    const section = generateOntologySection(updated);
    try {
      let existing = await api.readFile(`${projectPath}/02-design/ontology-design.md`);
      const marker = "## Object types (quick-add)";
      if (existing.includes(marker)) {
        existing = existing.split(marker)[0].trimEnd();
      }
      await api.writeFile(`${projectPath}/02-design/ontology-design.md`, existing + section);
    } catch {
      await api.writeFile(
        `${projectPath}/02-design/ontology-design.md`,
        `# Ontology Design\n${section}`,
      );
    }
    setObjects(updated);
  };

  const add = async () => {
    if (!name.trim()) return;
    const obj: OntologyObjectType = {
      id: `obj-${Date.now()}`,
      name: name.trim(),
      description,
      primaryKey: primaryKey || `${name.toLowerCase()}Id`,
      properties: properties.split(",").map((p) => p.trim()).filter(Boolean),
    };
    await saveAll([...objects, obj]);
    setName("");
    setDescription("");
    setPrimaryKey("");
    setProperties("");
    setMessage(`Added ${obj.name} — synced to ontology-design.md`);
    setTimeout(() => setMessage(""), 3000);
  };

  const remove = async (id: string) => {
    await saveAll(objects.filter((o) => o.id !== id));
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <FormCard
          title="Add object type"
          description="Model Foundry nouns without editing markdown directly."
        >
          <Field label="Object type name">
            <TextInput value={name} onChange={setName} placeholder="Order" />
          </Field>
          <Field label="Description">
            <TextArea value={description} onChange={setDescription} rows={2} />
          </Field>
          <Field label="Primary key property">
            <TextInput value={primaryKey} onChange={setPrimaryKey} placeholder="orderId" />
          </Field>
          <Field label="Properties (comma-separated)">
            <TextInput
              value={properties}
              onChange={setProperties}
              placeholder="status, customer, totalAmount"
            />
          </Field>
          <PrimaryButton onClick={add}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} /> Add object type
            </span>
          </PrimaryButton>
          {message && <p className="text-sm text-brand-300">{message}</p>}
        </FormCard>

        {objects.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-fg-secondary">Defined object types</h3>
            {objects.map((o) => (
              <div
                key={o.id}
                className="flex items-start justify-between rounded-xl border border-surface-border bg-surface-raised/50 p-4"
              >
                <div>
                  <p className="font-medium text-fg-primary">{o.name}</p>
                  <p className="mt-1 text-sm text-fg-secondary">{o.description}</p>
                  <p className="mt-2 text-xs text-fg-muted">
                    PK: {o.primaryKey} · {o.properties.length} properties
                  </p>
                </div>
                <button onClick={() => remove(o.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
