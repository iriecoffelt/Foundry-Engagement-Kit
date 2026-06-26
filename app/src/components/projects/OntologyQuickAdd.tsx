import { Network, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addOntologyElementToDiagram, syncFromArchitecture } from "../../lib/architectureSync";
import { api } from "../../lib/api";
import { generateOntologySection } from "../../lib/markdown";
import {
  loadOntologyElements,
  parsePropertyList,
  saveOntologyElements,
} from "../../lib/ontologyElements";
import {
  findOntologyElementType,
  loadOntologyElementTypes,
  ontologyElementTypeLabel,
  ontologyElementTypeStyles,
  type OntologyElementTypeDefinition,
} from "../../lib/ontologyTypes";
import type { OntologyElement } from "../../types";
import { OntologyElementTypeSelect } from "../OntologyElementTypeSelect";
import { Field, FormCard, PrimaryButton, SecondaryButton, TextArea, TextInput } from "../forms/FormField";

interface OntologyQuickAddProps {
  projectPath: string;
  onOpenArchitecture?: () => void;
}

function stripQuickAddSections(content: string): string {
  const match = content.search(/\n## .+\(quick-add\)/);
  if (match < 0) return content.trimEnd();
  return content.slice(0, match).trimEnd();
}

export function OntologyQuickAdd({ projectPath, onOpenArchitecture }: OntologyQuickAddProps) {
  const [elements, setElements] = useState<OntologyElement[]>([]);
  const [elementTypes, setElementTypes] = useState<OntologyElementTypeDefinition[]>([]);
  const [kind, setKind] = useState("objectType");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryKey, setPrimaryKey] = useState("");
  const [properties, setProperties] = useState("");
  const [linkFrom, setLinkFrom] = useState("");
  const [linkTo, setLinkTo] = useState("");
  const [targetObject, setTargetObject] = useState("");
  const [message, setMessage] = useState("");
  const [diagramBusy, setDiagramBusy] = useState<string | null>(null);

  const activeType = useMemo(
    () => findOntologyElementType(elementTypes, kind),
    [elementTypes, kind],
  );

  const load = useCallback(async () => {
    const [els, types] = await Promise.all([
      loadOntologyElements(projectPath),
      loadOntologyElementTypes(),
    ]);
    setElements(els);
    setElementTypes(types);
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAll = async (updated: OntologyElement[]) => {
    await saveOntologyElements(projectPath, updated);
    const section = generateOntologySection(updated, elementTypes);
    try {
      let existing = await api.readFile(`${projectPath}/02-design/ontology-design.md`);
      existing = stripQuickAddSections(existing);
      await api.writeFile(`${projectPath}/02-design/ontology-design.md`, existing + section);
    } catch {
      await api.writeFile(
        `${projectPath}/02-design/ontology-design.md`,
        `# Ontology Design\n${section}`,
      );
    }
    setElements(updated);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrimaryKey("");
    setProperties("");
    setLinkFrom("");
    setLinkTo("");
    setTargetObject("");
  };

  const add = async () => {
    if (!name.trim()) return;
    const el: OntologyElement = {
      id: `ont-el-${Date.now()}`,
      kind,
      name: name.trim(),
      description,
      primaryKey: activeType?.showPrimaryKey ? primaryKey || undefined : undefined,
      properties: activeType?.showProperties ? parsePropertyList(properties) : [],
      linkFrom: activeType?.showLinkEndpoints ? linkFrom || undefined : undefined,
      linkTo: activeType?.showLinkEndpoints ? linkTo || undefined : undefined,
      targetObject: activeType?.showTargetObject ? targetObject || undefined : undefined,
    };
    await saveAll([...elements, el]);
    resetForm();
    setMessage(`Added ${el.name} — synced to ontology-design.md`);
    setTimeout(() => setMessage(""), 3000);
  };

  const remove = async (id: string) => {
    await saveAll(elements.filter((e) => e.id !== id));
  };

  const addToDiagram = async (el: OntologyElement) => {
    setDiagramBusy(el.id);
    try {
      const typeDef = findOntologyElementType(elementTypes, el.kind);
      if (!typeDef?.architectureNodeTypeId) {
        setMessage(
          `${ontologyElementTypeLabel(elementTypes, el.kind)} cannot be added to the architecture diagram`,
        );
        setTimeout(() => setMessage(""), 4000);
        return;
      }
      const { created } = await addOntologyElementToDiagram(projectPath, el);
      await syncFromArchitecture(projectPath);
      setMessage(
        created
          ? `Added ${el.name} to architecture diagram and delivery board`
          : `${el.name} is already on the architecture diagram`,
      );
      setTimeout(() => setMessage(""), 4000);
      onOpenArchitecture?.();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setDiagramBusy(null);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, OntologyElement[]>();
    for (const el of elements) {
      const list = map.get(el.kind) ?? [];
      list.push(el);
      map.set(el.kind, list);
    }
    return map;
  }, [elements]);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl space-y-6">
        <FormCard
          title="Add ontology element"
          description="Model object types, links, actions, functions, and other Foundry ontology concepts."
        >
          <Field label="Element type">
            <OntologyElementTypeSelect value={kind} onChange={setKind} />
          </Field>
          <Field label="Name">
            <TextInput value={name} onChange={setName} placeholder="Order, Assign Owner, OrderToCustomer…" />
          </Field>
          <Field label="Description">
            <TextArea value={description} onChange={setDescription} rows={2} />
          </Field>
          {activeType?.showPrimaryKey && (
            <Field label="Primary key property">
              <TextInput value={primaryKey} onChange={setPrimaryKey} placeholder="orderId" />
            </Field>
          )}
          {activeType?.showProperties && (
            <Field label="Properties (comma-separated)">
              <TextInput
                value={properties}
                onChange={setProperties}
                placeholder="status, customer, totalAmount"
              />
            </Field>
          )}
          {activeType?.showLinkEndpoints && (
            <>
              <Field label="From object type">
                <TextInput value={linkFrom} onChange={setLinkFrom} placeholder="Order" />
              </Field>
              <Field label="To object type">
                <TextInput value={linkTo} onChange={setLinkTo} placeholder="Customer" />
              </Field>
            </>
          )}
          {activeType?.showTargetObject && (
            <Field label="Target object type">
              <TextInput value={targetObject} onChange={setTargetObject} placeholder="Order" />
            </Field>
          )}
          <PrimaryButton onClick={add}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} /> Add {activeType?.label.toLowerCase() ?? "element"}
            </span>
          </PrimaryButton>
          {message && <p className="text-sm text-brand-300">{message}</p>}
        </FormCard>

        {elements.length > 0 && (
          <div className="space-y-6">
            {[...grouped.entries()].map(([groupKind, items]) => {
              const styles = ontologyElementTypeStyles(elementTypes, groupKind);
              return (
                <div key={groupKind} className="space-y-3">
                  <h3 className="text-sm font-medium text-fg-secondary">
                    {ontologyElementTypeLabel(elementTypes, groupKind)}
                  </h3>
                  {items.map((el) => {
                    const typeDef = findOntologyElementType(elementTypes, el.kind);
                    return (
                      <div
                        key={el.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised/50 p-4"
                        style={{ borderLeftWidth: 3, borderLeftColor: styles.hexColor }}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-fg-primary">{el.name}</p>
                            <span
                              className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${styles.badge}`}
                            >
                              {ontologyElementTypeLabel(elementTypes, el.kind)}
                            </span>
                          </div>
                          {el.description && (
                            <p className="mt-1 text-sm text-fg-secondary">{el.description}</p>
                          )}
                          <div className="mt-2 space-y-0.5 text-xs text-fg-muted">
                            {el.primaryKey && <p>PK: {el.primaryKey}</p>}
                            {(el.linkFrom || el.linkTo) && (
                              <p>
                                Link: {el.linkFrom || "—"} → {el.linkTo || "—"}
                              </p>
                            )}
                            {el.targetObject && <p>Target: {el.targetObject}</p>}
                            {el.properties.length > 0 && (
                              <p>Properties: {el.properties.join(", ")}</p>
                            )}
                          </div>
                          {typeDef?.architectureNodeTypeId && (
                            <div className="mt-3">
                              <SecondaryButton
                                onClick={() => addToDiagram(el)}
                                disabled={diagramBusy === el.id}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <Network size={14} />
                                  {diagramBusy === el.id ? "Adding…" : "Add to architecture diagram"}
                                </span>
                              </SecondaryButton>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => remove(el.id)}
                          className="shrink-0 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
