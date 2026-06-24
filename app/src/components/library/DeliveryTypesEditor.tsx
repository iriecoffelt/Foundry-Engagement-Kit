import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  DELIVERY_COLOR_STYLES,
  DELIVERY_TYPE_COLORS,
  DELIVERY_TYPES_PATH,
  defaultColorForNewType,
  loadDeliveryTypes,
  newDeliveryTypeId,
  saveDeliveryTypes,
  type DeliveryTypeColor,
  type DeliveryTypeDefinition,
} from "../../lib/deliveryTypes";
import { PrimaryButton, SelectInput, TextInput } from "../forms/FormField";

interface DeliveryTypesEditorProps {
  onStatus?: (message: string) => void;
}

export function DeliveryTypesEditor({ onStatus }: DeliveryTypesEditorProps) {
  const [types, setTypes] = useState<DeliveryTypeDefinition[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setTypes(await loadDeliveryTypes());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (next: DeliveryTypeDefinition[]) => {
    setTypes(next);
    setSaving(true);
    try {
      await saveDeliveryTypes(next);
      onStatus?.("Delivery types saved");
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = newDeliveryTypeId(label, types);
    persist([
      ...types,
      { id, label, color: defaultColorForNewType(types) },
    ]);
    setNewLabel("");
  };

  const updateType = (id: string, patch: Partial<DeliveryTypeDefinition>) => {
    persist(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeType = (id: string) => {
    persist(types.filter((t) => t.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mx-auto w-full max-w-lg">
        <h3 className="text-lg font-semibold text-fg-primary">Delivery component types</h3>
        <p className="mt-1 text-sm text-fg-secondary">
          Labels and colors for delivery board cards. Stored in{" "}
          <code className="text-brand-300">{DELIVERY_TYPES_PATH}</code>.
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-fg-faint">
                      {type.id}
                    </span>
                    <div className="w-36">
                      <SelectInput
                        value={type.color}
                        onChange={(v) =>
                          updateType(type.id, { color: v as DeliveryTypeColor })
                        }
                        options={DELIVERY_TYPE_COLORS.map((color) => ({
                          value: color,
                          label: color.charAt(0).toUpperCase() + color.slice(1),
                        }))}
                      />
                    </div>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${DELIVERY_COLOR_STYLES[type.color].badge}`}
                    >
                      Preview
                    </span>
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
            <TextInput
              value={newLabel}
              onChange={setNewLabel}
              placeholder="New type label"
            />
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
