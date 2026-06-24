import { FilePlus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { adrDestPath, ADR_STATUSES, generateAdrMarkdown, type AdrData } from "../../lib/adr";
import { api } from "../../lib/api";
import { nextAdrNumber } from "../../lib/documentTemplates";
import { Modal } from "../Modal";
import { Field, PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from "../forms/FormField";

interface AdrWizardProps {
  open: boolean;
  projectPath: string;
  onClose: () => void;
  onCreated: (path: string) => void;
}

const EMPTY: AdrData = {
  number: 1,
  title: "",
  status: "Proposed",
  deciders: "",
  context: "",
  decision: "",
  alternativeA: "",
  alternativeB: "",
  consequences: "",
};

export function AdrWizard({ open, projectPath, onClose, onCreated }: AdrWizardProps) {
  const [data, setData] = useState<AdrData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    nextAdrNumber(projectPath).then((n) => setData({ ...EMPTY, number: n }));
  }, [open, projectPath]);

  const update = (patch: Partial<AdrData>) => setData((d) => ({ ...d, ...patch }));

  const save = async () => {
    if (!data.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createDirectory(`${projectPath}/02-design/adrs`);
      const dest = adrDestPath(projectPath, data);
      const content = generateAdrMarkdown(data);
      await api.createFile(dest, content);
      onCreated(dest);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="New Architecture Decision Record"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Creating…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <FilePlus size={14} /> Create ADR
              </span>
            )}
          </PrimaryButton>
        </div>
      }
    >
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ADR number">
            <TextInput
              value={String(data.number)}
              onChange={(v) => update({ number: parseInt(v, 10) || 1 })}
              type="number"
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={data.status}
              onChange={(v) => update({ status: v })}
              options={ADR_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </Field>
        </div>
        <Field label="Title" hint="Short decision title — used in filename">
          <TextInput
            value={data.title}
            onChange={(v) => update({ title: v })}
            placeholder="e.g. Use batch pipeline for initial sync"
          />
        </Field>
        <Field label="Deciders">
          <TextInput
            value={data.deciders}
            onChange={(v) => update({ deciders: v })}
            placeholder="Names or roles"
          />
        </Field>
        <Field label="Context">
          <TextArea
            value={data.context}
            onChange={(v) => update({ context: v })}
            rows={3}
            placeholder="What is the issue or forcing function?"
          />
        </Field>
        <Field label="Decision">
          <TextArea
            value={data.decision}
            onChange={(v) => update({ decision: v })}
            rows={3}
            placeholder="What did we decide?"
          />
        </Field>
        <Field label="Alternative A">
          <TextArea value={data.alternativeA} onChange={(v) => update({ alternativeA: v })} rows={2} />
        </Field>
        <Field label="Alternative B">
          <TextArea value={data.alternativeB} onChange={(v) => update({ alternativeB: v })} rows={2} />
        </Field>
        <Field label="Consequences">
          <TextArea
            value={data.consequences}
            onChange={(v) => update({ consequences: v })}
            rows={3}
          />
        </Field>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
