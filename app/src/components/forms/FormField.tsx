import { Lock } from "lucide-react";
import type { ReactNode } from "react";

const inputClass =
  "w-full rounded-xl border border-surface-border-strong bg-surface-input px-4 py-2.5 text-sm text-fg-primary outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30";

export type DataClassification = "sensitive" | "customer-specific" | "internal";

const classificationLabels: Record<DataClassification, string> = {
  sensitive: "Sensitive data",
  "customer-specific": "Customer-specific",
  internal: "Internal only",
};

export function FormField({
  label,
  hint,
  sensitive,
  classification,
  children,
}: {
  label: string;
  hint?: string;
  sensitive?: boolean;
  classification?: DataClassification;
  children: ReactNode;
}) {
  const effectiveClassification = classification ?? (sensitive ? "sensitive" : undefined);

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-fg-body">
        {label}
        {effectiveClassification && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
            <Lock size={10} />
            {classificationLabels[effectiveClassification]}
          </span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-fg-muted">{hint}</span>}
    </label>
  );
}

export const Field = FormField;

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputClass} resize-y`}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="card-kit p-6">
      <h3 className="text-lg font-semibold text-fg-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-fg-secondary">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-fg-on-accent transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-surface-border-strong px-5 py-2.5 text-sm font-medium text-fg-body transition hover:border-surface-border-strong hover:text-fg-primary active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}
