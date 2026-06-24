import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ARCHITECTURE_NODE_TYPES_PATH,
  ARCH_NODE_ICONS,
  defaultColorForNewArchType,
  loadArchitectureNodeTypes,
  newArchNodeTypeId,
  saveArchitectureNodeTypes,
  type ArchNodeIcon,
  type ArchitectureNodeTypeDefinition,
} from "../../lib/architectureNodeTypes";
import {
  DELIVERY_COLOR_STYLES,
  DELIVERY_TYPE_COLORS,
  loadDeliveryTypes,
  type DeliveryTypeColor,
} from "../../lib/deliveryTypes";
import { PrimaryButton, SelectInput, TextInput } from "../forms/FormField";

interface ArchitectureNodeTypesEditorProps {
  onStatus?: (message: string) => void;
}

export function ArchitectureNodeTypesEditor({ onStatus }: ArchitectureNodeTypesEditorProps) {
  const [types, setTypes] = useState<ArchitectureNodeTypeDefinition[]>([]);
  const [deliveryTypeOptions, setDeliveryTypeOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [archTypes, deliveryTypes] = await Promise.all([
      loadArchitectureNodeTypes(),
      loadDeliveryTypes(),
    ]);
    setTypes(archTypes);
    setDeliveryTypeOptions([
      { value: "", label: "None (not on delivery board)" },
      ...deliveryTypes.map((t) => ({ value: t.id, label: t.label })),
    ]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (next: ArchitectureNodeTypeDefinition[]) => {
    setTypes(next);
    setSaving(true);
    try {
      await saveArchitectureNodeTypes(next);
      onStatus?.("Architecture node types saved");
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = newArchNodeTypeId(label, types);
    persist([
      ...types,
      {
        id,
        label,
        color: defaultColorForNewArchType(types),
        icon: "layers",
        linkable: false,
      },
    ]);
    setNewLabel("");
  };

  const updateType = (id: string, patch: Partial<ArchitectureNodeTypeDefinition>) => {
    persist(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeType = (id: string) => {
    persist(types.filter((t) => t.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mx-auto w-full max-w-lg">
        <h3 className="text-lg font-semibold text-fg-primary">Architecture node types</h3>
        <p className="mt-1 text-sm text-fg-secondary">
          Labels, colors, and delivery board mapping for diagram nodes. Stored in{" "}
          <code className="text-brand-300">{ARCHITECTURE_NODE_TYPES_PATH}</code>. Types linked to a
          delivery type inherit its color.
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
                    placeholder="Node label"
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
                      value={type.icon}
                      onChange={(v) => updateType(type.id, { icon: v as ArchNodeIcon })}
                      options={(Object.keys(ARCH_NODE_ICONS) as ArchNodeIcon[]).map((icon) => ({
                        value: icon,
                        label: icon,
                      }))}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-fg-faint">{type.id}</span>
                    <label className="inline-flex items-center gap-1.5 text-xs text-fg-secondary">
                      <input
                        type="checkbox"
                        checked={type.linkable}
                        onChange={(e) => updateType(type.id, { linkable: e.target.checked })}
                        className="rounded border-surface-border-strong"
                      />
                      Foundry link
                    </label>
                    <div className="min-w-[10rem] flex-1">
                      <SelectInput
                        value={type.deliveryTypeId || ""}
                        onChange={(v) =>
                          updateType(type.id, { deliveryTypeId: v || undefined })
                        }
                        options={deliveryTypeOptions}
                      />
                    </div>
                  </div>
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
            <TextInput value={newLabel} onChange={setNewLabel} placeholder="New node type label" />
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
