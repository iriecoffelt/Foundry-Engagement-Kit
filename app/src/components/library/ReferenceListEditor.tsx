import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PrimaryButton, TextInput } from "../forms/FormField";

interface ReferenceListEditorProps {
  title: string;
  description: string;
  pathLabel: string;
  itemPlaceholder: string;
  load: () => Promise<string[]>;
  save: (items: string[]) => Promise<void>;
  onStatus?: (message: string) => void;
}

export function ReferenceListEditor({
  title,
  description,
  pathLabel,
  itemPlaceholder,
  load,
  save,
  onStatus,
}: ReferenceListEditorProps) {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setItems(await load());
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (next: string[]) => {
    setItems(next);
    setSaving(true);
    try {
      await save(next);
      onStatus?.(`${title} saved`);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const label = newItem.trim();
    if (!label || items.includes(label)) return;
    persist([...items, label]);
    setNewItem("");
  };

  const removeItem = (item: string) => {
    persist(items.filter((entry) => entry !== item));
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mx-auto w-full max-w-lg">
        <h3 className="text-lg font-semibold text-fg-primary">{title}</h3>
        <p className="mt-1 text-sm text-fg-secondary">
          {description} Stored in <code className="text-brand-300">{pathLabel}</code>.
        </p>

        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between rounded-lg border border-surface-border-strong bg-surface-base/50 px-3 py-2"
            >
              <span className="text-sm text-fg-body">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="rounded p-1 text-fg-muted hover:text-red-400"
                title={`Remove ${item}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <TextInput
              value={newItem}
              onChange={setNewItem}
              placeholder={itemPlaceholder}
            />
          </div>
          <PrimaryButton onClick={addItem} disabled={!newItem.trim()}>
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
