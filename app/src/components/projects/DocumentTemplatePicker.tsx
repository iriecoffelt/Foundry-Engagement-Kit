import { FilePlus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createFromTemplate,
  listDocumentTemplates,
  type DocumentTemplate,
} from "../../lib/documentTemplates";
import { Modal } from "../Modal";
import { SecondaryButton } from "../forms/FormField";

interface DocumentTemplatePickerProps {
  projectPath: string;
  onCreated: (path: string) => void;
}

export function DocumentTemplatePicker({ projectPath, onCreated }: DocumentTemplatePickerProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    listDocumentTemplates().then((t) => {
      setTemplates(t);
      setLoading(false);
    });
  }, []);

  const create = async (template: DocumentTemplate) => {
    setCreating(template.id);
    setError("");
    try {
      const path = await createFromTemplate(projectPath, template);
      setPickerOpen(false);
      onCreated(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(null);
    }
  };

  const byCategory = templates.reduce<Record<string, DocumentTemplate[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-strong px-3 py-1.5 text-sm text-fg-body hover:bg-surface-elevated"
      >
        <FilePlus size={14} />
        From template
      </button>

      <Modal
        open={pickerOpen}
        title="Create from template"
        onClose={() => setPickerOpen(false)}
        footer={
          <SecondaryButton onClick={() => setPickerOpen(false)}>Close</SecondaryButton>
        }
      >
        {loading ? (
          <p className="text-sm text-fg-muted">Loading templates…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-fg-muted">No templates found in project/_template/</p>
        ) : (
          <div className="max-h-[50vh] space-y-5 overflow-y-auto">
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {category}
                </p>
                <ul className="space-y-1">
                  {items.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => create(t)}
                        disabled={creating !== null}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-elevated disabled:opacity-50"
                      >
                        <span className="text-fg-body">{t.label}</span>
                        {creating === t.id ? (
                          <Loader2 size={14} className="animate-spin text-fg-muted" />
                        ) : (
                          <FilePlus size={14} className="text-fg-muted" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Modal>
    </>
  );
}
