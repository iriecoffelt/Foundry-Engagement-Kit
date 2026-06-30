import { Network, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addOntologyElementToDiagram,
  rebuildOntologyArchitecture,
  syncFromArchitecture,
} from "../../lib/architectureSync";
import { storeArchitectureView } from "../../lib/architectureViews";
import { api } from "../../lib/api";
import {
  loadFoundryConnection,
  loadImportedOntologyRid,
  saveImportedOntologyRid,
} from "../../lib/foundryConnection";
import { generateOntologySection } from "../../lib/markdown";
import {
  loadOntologyElements,
  loadRawOntologyElements,
  normalizeElementKind,
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
import type { FoundryFullMetadata } from "../../lib/foundryTypes";
import type { OntologyElement } from "../../types";
import { OntologyElementTypeSelect } from "../OntologyElementTypeSelect";
import { Field, FormCard, PrimaryButton, SecondaryButton, TextArea, TextInput } from "../forms/FormField";
import { FoundryImportButton, FoundryOntologySelect } from "../foundry";

interface OntologyQuickAddProps {
  projectPath: string;
  onOpenArchitecture?: () => void;
}

type OntologyPageTab = "add" | string;

function stripQuickAddSections(content: string): string {
  const match = content.search(/\n## .+\(quick-add\)/);
  if (match < 0) return content.trimEnd();
  return content.slice(0, match).trimEnd();
}

function elementMatchesSearch(el: OntologyElement, query: string): boolean {
  const q = query.toLowerCase();
  return (
    el.name.toLowerCase().includes(q) ||
    el.description.toLowerCase().includes(q) ||
    (el.foundryApiName?.toLowerCase().includes(q) ?? false) ||
    (el.foundryRid?.toLowerCase().includes(q) ?? false) ||
    (el.linkFrom?.toLowerCase().includes(q) ?? false) ||
    (el.linkTo?.toLowerCase().includes(q) ?? false) ||
    (el.primaryKey?.toLowerCase().includes(q) ?? false) ||
    el.properties.some((p) => p.toLowerCase().includes(q))
  );
}

function OntologyElementCard({
  el,
  elementTypes,
  diagramBusy,
  onRemove,
  onAddToDiagram,
}: {
  el: OntologyElement;
  elementTypes: OntologyElementTypeDefinition[];
  diagramBusy: string | null;
  onRemove: (id: string) => void;
  onAddToDiagram: (el: OntologyElement) => void;
}) {
  const typeDef = findOntologyElementType(elementTypes, el.kind);
  const styles = ontologyElementTypeStyles(elementTypes, el.kind);

  return (
    <div
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
        {el.foundryRid && (
          <p className="mt-1 truncate font-mono text-[11px] text-fg-muted">{el.foundryRid}</p>
        )}
        {el.description && <p className="mt-1 text-sm text-fg-secondary">{el.description}</p>}
        <div className="mt-2 space-y-0.5 text-xs text-fg-muted">
          {el.foundryApiName && <p>API: {el.foundryApiName}</p>}
          {el.primaryKey && <p>PK: {el.primaryKey}</p>}
          {(el.linkFrom || el.linkTo) && (
            <p>
              Link: {el.linkFrom || "—"} → {el.linkTo || "—"}
            </p>
          )}
          {el.targetObject && <p>Target: {el.targetObject}</p>}
          {el.properties.length > 0 && <p>Properties: {el.properties.join(", ")}</p>}
        </div>
        {typeDef?.architectureNodeTypeId && (
          <div className="mt-3">
            <SecondaryButton onClick={() => onAddToDiagram(el)} disabled={diagramBusy === el.id}>
              <span className="inline-flex items-center gap-1.5">
                <Network size={14} />
                {diagramBusy === el.id ? "Adding…" : "Add to working diagram"}
              </span>
            </SecondaryButton>
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(el.id)}
        className="shrink-0 text-red-400 hover:text-red-300"
        title="Remove element"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function OntologyQuickAdd({ projectPath, onOpenArchitecture }: OntologyQuickAddProps) {
  const [elements, setElements] = useState<OntologyElement[]>([]);
  const [elementTypes, setElementTypes] = useState<OntologyElementTypeDefinition[]>([]);
  const [activeTab, setActiveTab] = useState<OntologyPageTab>("add");
  const [searchQuery, setSearchQuery] = useState("");
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
  const [importStale, setImportStale] = useState(false);

  const activeType = useMemo(
    () => findOntologyElementType(elementTypes, kind),
    [elementTypes, kind],
  );

  const countsByKind = useMemo(() => {
    const map = new Map<string, number>();
    for (const el of elements) {
      const kind = normalizeElementKind(el.kind);
      map.set(kind, (map.get(kind) ?? 0) + 1);
    }
    return map;
  }, [elements]);

  const load = useCallback(async () => {
    const [types, conn, importedRid] = await Promise.all([
      loadOntologyElementTypes(),
      loadFoundryConnection(projectPath),
      loadImportedOntologyRid(projectPath),
    ]);
    const activeRid = conn?.ontologyRid || "";
    let resolvedImportedRid = importedRid;
    if (!resolvedImportedRid && activeRid) {
      const raw = await loadRawOntologyElements(projectPath);
      if (raw.length > 0) {
        await saveImportedOntologyRid(projectPath, activeRid);
        resolvedImportedRid = activeRid;
      }
    }
    const els = await loadOntologyElements(projectPath);
    setElements(els);
    setElementTypes(types);
    setImportStale(Boolean(activeRid && resolvedImportedRid && activeRid !== resolvedImportedRid));
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

  const handleOntologyChange = (_rid: string) => {
    setElements([]);
    setImportStale(true);
    setSearchQuery("");
    setActiveTab("add");
    setMessage("Ontology switched — import from Foundry to load elements for this ontology.");
    setTimeout(() => setMessage(""), 6000);
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
    setMessage(`Added ${el.name}`);
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
          ? `Added ${el.name} to working diagram and delivery board`
          : `${el.name} is already on the working diagram`,
      );
      setTimeout(() => setMessage(""), 4000);
      onOpenArchitecture?.();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setDiagramBusy(null);
    }
  };

  const handleFoundryImport = async (
    imported: OntologyElement[],
    metadata?: FoundryFullMetadata,
  ) => {
    const conn = await loadFoundryConnection(projectPath);
    if (conn?.ontologyRid) {
      await saveImportedOntologyRid(projectPath, conn.ontologyRid);
    }
    await saveAll(imported);
    setImportStale(false);
    const result = await rebuildOntologyArchitecture(projectPath, imported, metadata);
    storeArchitectureView(projectPath, "ontology");
    return { edgesAdded: result.edgesAdded };
  };

  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;

  const visibleElements = useMemo(() => {
    if (isSearching) {
      return elements.filter((el) => elementMatchesSearch(el, trimmedSearch));
    }
    if (activeTab === "add") return [];
    return elements.filter((el) => normalizeElementKind(el.kind) === activeTab);
  }, [elements, activeTab, isSearching, trimmedSearch]);

  const selectTab = (tabId: OntologyPageTab) => {
    setSearchQuery("");
    setActiveTab(tabId);
  };

  const tabs = useMemo(() => {
    const typeTabs = elementTypes.map((t) => ({
      id: t.id,
      label: ontologyElementTypeLabel(elementTypes, t.id),
      count: countsByKind.get(t.id) ?? 0,
    }));
    return [{ id: "add" as const, label: "Add new", count: 0 }, ...typeTabs];
  }, [elementTypes, countsByKind]);

  const listTitle = isSearching
    ? `Search results (${visibleElements.length})`
    : activeTab === "add"
      ? ""
      : `${ontologyElementTypeLabel(elementTypes, activeTab)} (${visibleElements.length})`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-surface-border bg-surface-raised/30 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary">Ontology</h2>
            <p className="text-sm text-fg-secondary">
              Model object types, links, actions, and other Foundry concepts. Import from Foundry or
              add manually.
            </p>
            {importStale && (
              <p className="mt-2 text-sm text-amber-300">
                Showing an empty slate — the selected ontology has not been imported yet.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <FoundryOntologySelect
              projectPath={projectPath}
              onChange={handleOntologyChange}
              className="min-w-[200px]"
            />
            <FoundryImportButton
              projectPath={projectPath}
              existingElements={elements}
              onImport={handleFoundryImport}
              onMessage={(msg) => {
                setMessage(msg);
                setTimeout(() => setMessage(""), 6000);
              }}
            />
          </div>
        </div>

        <div className="relative mt-4 max-w-xl">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all ontology elements…"
            className="w-full rounded-lg border border-surface-border bg-surface-base py-2 pl-9 pr-3 text-sm text-fg-primary placeholder:text-fg-muted"
          />
        </div>

        <nav className="tab-segment mt-4 -mb-px overflow-x-auto">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`tab-segment-item whitespace-nowrap ${
                !isSearching && activeTab === id ? "tab-segment-active" : "tab-segment-inactive"
              }`}
            >
              {label}
              {id !== "add" && count > 0 && (
                <span className="ml-1.5 rounded-full bg-surface-border/80 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
                  {count}
                </span>
              )}
            </button>
          ))}
          {isSearching && (
            <span className="tab-segment-item tab-segment-active whitespace-nowrap">
              Search results ({visibleElements.length})
            </span>
          )}
        </nav>

        {message && (
          <p className="mt-3 text-sm text-brand-300" role="status">
            {message}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {!isSearching && activeTab === "add" ? (
            <FormCard
              title="Add ontology element"
              description="Define new elements manually or import from Foundry above."
            >
              <Field label="Element type">
                <OntologyElementTypeSelect value={kind} onChange={setKind} />
              </Field>
              <Field label="Name">
                <TextInput
                  value={name}
                  onChange={setName}
                  placeholder="Order, Assign Owner, OrderToCustomer…"
                />
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
            </FormCard>
          ) : (
            <div key={isSearching ? `search-${trimmedSearch}` : activeTab} className="space-y-3">
              {listTitle && (
                <h3 className="text-sm font-medium text-fg-secondary">{listTitle}</h3>
              )}
              {visibleElements.length === 0 ? (
                <p className="rounded-xl border border-dashed border-surface-border px-4 py-8 text-center text-sm text-fg-muted">
                  {isSearching
                    ? `No elements match "${trimmedSearch}"`
                    : `No ${ontologyElementTypeLabel(elementTypes, activeTab).toLowerCase()} yet — import from Foundry or add manually.`}
                </p>
              ) : (
                visibleElements.map((el) => (
                  <OntologyElementCard
                    key={el.id}
                    el={el}
                    elementTypes={elementTypes}
                    diagramBusy={diagramBusy}
                    onRemove={remove}
                    onAddToDiagram={addToDiagram}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
