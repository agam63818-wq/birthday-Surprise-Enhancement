import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/auth/AuthLayout";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <FieldLabel>{label}</FieldLabel>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ resize: "vertical" }}
      />
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "14px",
        fontSize: "0.85rem",
        color: "var(--ink-soft)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: "16px", height: "16px", accentColor: "var(--violet)" }}
      />
      {label}
    </label>
  );
}

// Small pill-style icon button, used for remove/add actions in list editors.
export function IconTextButton({
  children,
  onClick,
  tone = "default",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger";
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "10px",
        fontSize: "0.78rem",
        fontWeight: 500,
        cursor: "pointer",
        border: tone === "danger" ? "1px solid rgba(244,63,94,0.35)" : "1px solid rgba(167,139,250,0.3)",
        background: tone === "danger" ? "rgba(244,63,94,0.1)" : "rgba(167,139,250,0.1)",
        color: tone === "danger" ? "#fda4af" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

export function SectionDivider() {
  return <div style={{ height: "1px", background: "rgba(167,139,250,0.15)", margin: "16px 0" }} />;
}
