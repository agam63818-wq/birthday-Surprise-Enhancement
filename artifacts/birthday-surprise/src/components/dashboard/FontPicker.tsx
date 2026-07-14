import { FieldLabel } from "@/components/auth/AuthLayout";
import {
  FONT_PRESETS,
  DEFAULT_FONT_PRESET,
  type FontPresetId,
} from "@/lib/fontPresets";

/**
 * FontPicker — 4 pill-style chip buttons for choosing a page's text
 * font-style. Designed to feel quick to tap on mobile, styled to match
 * the existing dashboard's dark violet/pink glassmorphism theme.
 */
export default function FontPicker({
  label = "Text style for this page",
  value,
  onChange,
  helperText,
}: {
  label?: string;
  value: FontPresetId | undefined;
  onChange: (id: FontPresetId) => void;
  helperText?: string;
}) {
  const selected: FontPresetId = value ?? DEFAULT_FONT_PRESET;
  const ids = Object.keys(FONT_PRESETS) as FontPresetId[];

  return (
    <div style={{ marginBottom: "14px" }}>
      <FieldLabel>{label}</FieldLabel>
      <div
        role="radiogroup"
        aria-label={label}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "2px",
        }}
      >
        {ids.map((id) => {
          const preset = FONT_PRESETS[id];
          const isActive = id === selected;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                lineHeight: 1.2,
                border: isActive
                  ? "1px solid rgba(236,72,153,0.65)"
                  : "1px solid rgba(167,139,250,0.28)",
                background: isActive
                  ? "linear-gradient(135deg, rgba(236,72,153,0.28), rgba(124,58,237,0.22))"
                  : "rgba(167,139,250,0.08)",
                color: isActive ? "#fde68a" : "var(--ink)",
                boxShadow: isActive
                  ? "0 6px 22px rgba(236,72,153,0.28), 0 0 0 1px rgba(255,255,255,0.04) inset"
                  : "none",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                transition:
                  "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, color 0.25s ease, transform 0.15s ease",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: "0.95rem" }}>
                {preset.emoji}
              </span>
              <span style={{ fontFamily: preset.fontFamily }}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
      {helperText && (
        <p
          style={{
            marginTop: "8px",
            fontSize: "0.75rem",
            color: "rgba(220,185,255,0.6)",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
