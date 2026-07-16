import { useId, useState, type ReactNode } from "react";

interface AccordionEditorItemProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Controlled open state — omit to let the item manage itself. */
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  /**
   * Completion indicator: true = glowing check, false = empty circle,
   * undefined = no indicator rendered (Part 1 visual-shell behavior).
   */
  complete?: boolean;
  children?: ReactNode;
}

/**
 * Polished glassmorphism accordion item. Smooth grid-template-rows
 * expand/collapse driven by the motion tokens; collapses instantly
 * under prefers-reduced-motion via the global rule.
 */
export default function AccordionEditorItem({
  title,
  subtitle,
  icon,
  open,
  defaultOpen = false,
  onToggle,
  complete,
  children,
}: AccordionEditorItemProps) {
  const panelId = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInternalOpen(next);
    onToggle?.(next);
  };

  return (
    <div className={`accordion-item${isOpen ? " open" : ""}`}>
      <button
        type="button"
        className="accordion-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        {icon && <span style={{ fontSize: "1.1rem", lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
        <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
          <span>{title}</span>
          {subtitle && (
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 400,
                color: "var(--ink-faint)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </span>
          )}
        </span>
        {complete !== undefined && (
          <span
            aria-hidden="true"
            title={complete ? "Section complete" : "Section incomplete"}
            style={{
              flexShrink: 0,
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 700,
              border: complete ? "1px solid rgba(236, 72, 153, 0.55)" : "1px solid rgba(167, 139, 250, 0.3)",
              background: complete ? "linear-gradient(135deg, #7c3aed, #ec4899)" : "transparent",
              color: complete ? "#fff" : "rgba(226, 199, 255, 0.35)",
              boxShadow: complete ? "var(--glow-subtle)" : "none",
              transition: "background var(--dur-base) ease, box-shadow var(--dur-base) ease",
            }}
          >
            {complete ? "✓" : ""}
          </span>
        )}
        <svg
          className="accordion-chevron"
          style={complete !== undefined ? { marginLeft: 0 } : undefined}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={panelId} className="accordion-panel" role="region">
        <div className="accordion-panel-inner">
          <div style={{ padding: "0 16px 16px" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
