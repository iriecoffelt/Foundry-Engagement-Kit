import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ARCHITECTURE_NODE_TYPE_OPTIONS,
  DEFAULT_ONTOLOGY_ELEMENT_TYPES,
  ONTOLOGY_ELEMENT_TYPES_PATH,
  defaultColorForNewOntologyElementType,
  loadOntologyElementTypes,
  newOntologyElementTypeId,
  saveOntologyElementTypes,
  type OntologyElementTypeDefinition,
} from "../../lib/ontologyTypes";
import {
  DELIVERY_COLOR_STYLES,
  DELIVERY_TYPE_COLORS,
  type DeliveryTypeColor,
} from "../../lib/deliveryTypes";
import { PrimaryButton, SelectInput, TextInput } from "../forms/FormField";

interface OntologyElementTypesEditorProps {
  onStatus?: (message: string) => void;
}

export function OntologyElementTypesEditor({ onStatus }: OntologyElementTypesEditorProps) {
  const [types, setTypes] = useState<OntologyElementTypeDefinition[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setTypes(await loadOntologyElementTypes());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (next: OntologyElementTypeDefinition[]) => {
    setTypes(next);
    setSaving(true);
    try {
      await saveOntologyElementTypes(next);
      onStatus?.("Ontology element types saved");
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = newOntologyElementTypeId(label, types);
    const template = DEFAULT_ONTOLOGY_ELEMENT_TYPES[0];
    persist([
      ...types,
      {
        id,
        label,
        color: defaultColorForNewOntologyElementType(types),
        showPrimaryKey: template.showPrimaryKey,
        showProperties: template.showProperties,
        showLinkEndpoints: template.showLinkEndpoints,
        showTargetObject: template.showTargetObject,
      },
    ]);
    setNewLabel("");
  };

  const updateType = (id: string, patch: Partial<OntologyElementTypeDefinition>) => {
    persist(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeType = (id: string) => {
    persist(types.filter((t) => t.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mx-auto w-full max-w-lg">
        <h3 className="text-lg font-semibold text-fg-primary">Ontology element types</h3>
        <p className="mt-1 text-sm text-fg-secondary">
          Foundry ontology kinds available on the Ontology tab. Stored in{" "}
          <code className="text-brand-300">{ONTOLOGY_ELEMENT_TYPES_PATH}</code>.
        </p>

        <ul className="mt-6 space-y-3">
          {types.map((type) => (
            <li
              key={type.id}
              className={`rounded-lg border border-surface-border-strong border-l-[3px] bg-surface-base/50 p-3 ${DELIVERY_COLOR_STYLES[type.color].accent}`}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <TextInput
                    value={type.label}
                    onChange={(v) => updateType(type.id, { label: v })}
                    placeholder="Type label"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SelectInput
                      value={type.color}
                      onChange={(v) => updateType(type.id, { color: v as DeliveryTypeColor })}
                      options={DELIVERY_TYPE_COLORS.map((color) => ({
                        value: color,
                        label: color.charAt(0).toUpperCase() + color.slice(1),
                      }))}
                    />
                    <SelectInput
                      value={type.architectureNodeTypeId || ""}
                      onChange={(v) =>
                        updateType(type.id, { architectureNodeTypeId: v || undefined })
                      }
                      options={ARCHITECTURE_NODE_TYPE_OPTIONS}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-fg-secondary">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={type.showPrimaryKey}
                        onChange={(e) => updateType(type.id, { showPrimaryKey: e.target.checked })}
                      />
                      Primary key
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={type.showProperties}
                        onChange={(e) => updateType(type.id, { showProperties: e.target.checked })}
                      />
                      Properties
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={type.showLinkEndpoints}
                        onChange={(e) =>
                          updateType(type.id, { showLinkEndpoints: e.target.checked })
                        }
                      />
                      Link endpoints
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={type.showTargetObject}
                        onChange={(e) =>
                          updateType(type.id, { showTargetObject: e.target.checked })
                        }
                      />
                      Target object
                    </label>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-fg-faint">{type.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeType(type.id)}
                  className="rounded p-1 text-fg-muted hover:text-red-400"
                  title={`Remove ${type.label}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <TextInput value={newLabel} onChange={setNewLabel} placeholder="New element type label" />
          </div>
          <PrimaryButton onClick={addType} disabled={!newLabel.trim()}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} /> Add
            </span>
          </PrimaryButton>
        </div>

        {saving && <p className="mt-3 text-xs text-fg-muted">Saving…</p>}
      </div>
    </div>
  );
}
