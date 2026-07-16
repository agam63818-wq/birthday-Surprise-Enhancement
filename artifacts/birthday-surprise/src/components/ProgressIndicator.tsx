import type { CSSProperties } from "react";

interface ProgressIndicatorProps {
  completed: number;
  total: number;
  /** Trailing label, defaults to "sections completed". */
  label?: string;
  style?: CSSProperties;
}

/**
 * Small reusable "X of N sections completed" indicator.
 * Visual component only for Part 1 — wiring it to real completion
 * state happens in Part 3.
 */
export default function ProgressIndicator({
  completed,
  total,
  label = "sections completed",
  style,
}: ProgressIndicatorProps) {
  const safeTotal = Math.max(1, total);
  const safeDone = Math.min(Math.max(0, completed), safeTotal);
  const pct = (safeDone / safeTotal) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
        }}
      >
        {safeDone} of {safeTotal} {label}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeDone}
        style={{
          height: "4px",
          borderRadius: "var(--rad-pill)",
          background: "rgba(167, 139, 250, 0.14)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "var(--rad-pill)",
            background: "linear-gradient(90deg, #7c3aed, #ec4899, #f9a8d4)",
            boxShadow: "var(--glow-subtle)",
            transition: "width var(--dur-slow) var(--ease-smooth)",
          }}
        />
      </div>
    </div>
  );
}
