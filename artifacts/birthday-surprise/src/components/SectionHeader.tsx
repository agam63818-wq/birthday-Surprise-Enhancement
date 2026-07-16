import type { CSSProperties } from "react";
import StaggeredText from "@/components/StaggeredText";

interface SectionHeaderProps {
  /** Small uppercase chip above the title, e.g. "✦ A Special Surprise ✦". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /**
   * script = elegant script (short emotional headings only)
   * serif  = refined serif (section headings)
   */
  titleVariant?: "script" | "serif";
  /** Reveal the title word-by-word (reduced-motion safe). */
  staggered?: boolean;
  align?: "center" | "left";
  /**
   * Font for the subtitle body text. Pass
   * resolveFontFamily(config.textStyles, page) so the font-style
   * picker choice is respected wherever config text is rendered.
   */
  subtitleFontFamily?: string;
  style?: CSSProperties;
}

/** Consistent heading treatment for every section of the experience. */
export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  titleVariant = "script",
  staggered = true,
  align = "center",
  subtitleFontFamily,
  style,
}: SectionHeaderProps) {
  const titleClass = `${titleVariant === "script" ? "font-script" : "font-display"} hero-gradient-text`;
  const titleStyle: CSSProperties = {
    fontSize: "var(--text-2xl)",
    lineHeight: "var(--leading-tight)",
    marginBottom: subtitle ? "10px" : 0,
    fontWeight: titleVariant === "serif" ? 600 : undefined,
    filter: "drop-shadow(0 0 22px rgba(232, 121, 249, 0.35))",
  };

  return (
    <div style={{ textAlign: align, ...style }}>
      {eyebrow && (
        <p className="chip" style={{ marginBottom: "14px" }}>
          {eyebrow}
        </p>
      )}
      {staggered ? (
        <StaggeredText as="h2" text={title} className={titleClass} style={titleStyle} />
      ) : (
        <h2 className={titleClass} style={titleStyle}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p
          style={{
            color: "var(--ink-soft)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            fontFamily: subtitleFontFamily,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
