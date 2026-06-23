import { save } from "@tauri-apps/plugin-dialog";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { Modal } from "../Modal";

interface ExportReportModalProps {
  open: boolean;
  projectPath: string;
  projectName: string;
  onClose: () => void;
}

export function ExportReportModal({
  open,
  projectPath,
  projectName,
  onClose,
}: ExportReportModalProps) {
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const exportReport = async () => {
    setError("");
    setSuccess("");
    const ext = format === "pdf" ? "pdf" : "docx";
    const dest = await save({
      title: "Save project report",
      defaultPath: `${projectName.replace(/\s+/g, "-")}-report.${ext}`,
      filters: [
        {
          name: format === "pdf" ? "PDF" : "Word document",
          extensions: [ext],
        },
      ],
    });
    if (!dest) return;

    setLoading(true);
    try {
      await api.exportProjectReport(projectPath, format, dest);
      setSuccess(`Report saved successfully`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Export project report"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">
            {success ? "Close" : "Cancel"}
          </button>
          {!success && (
            <button
              onClick={exportReport}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500 disabled:opacity-40"
            >
              <FileDown size={16} />
              {loading ? "Exporting…" : "Export"}
            </button>
          )}
        </>
      }
    >
      <p className="text-sm text-slate-400">
        Compile engagement docs, architecture, standups, and reference files into a shareable
        report.
      </p>

      <div className="mt-4 flex gap-3">
        {(["pdf", "docx"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              format === f
                ? "border-brand-500 bg-brand-600/20 text-brand-200"
                : "border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            {f === "pdf" ? "PDF" : "Word (.docx)"}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-1 text-xs text-slate-500">
        <li>• Engagement overview & discovery/scoping docs</li>
        <li>• Design, ontology, pipeline, and workshop specs</li>
        <li>• Architecture diagram summary</li>
        <li>• Project standups & weekly reviews</li>
        <li>• Reference file listing</li>
      </ul>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
    </Modal>
  );
}
