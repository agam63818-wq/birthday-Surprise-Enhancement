import type { CSSProperties, ReactNode } from "react";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";

interface HeroRevealCardProps {
  /** Glowing icon slot, e.g. <PremiumHeart />. */
  icon?: ReactNode;
  /** Small chip line above the title. */
  eyebrow?: string;
  /** Short emotional title from config — revealed word by word. */
  title: string;
  /** Personalized message from config. */
  subtitle?: string;
  /**
   * Font for the subtitle — pass resolveFontFamily(config.textStyles, page)
   * so the font-style picker choice is respected.
   */
  subtitleFontFamily?: string;
  ctaText: string;
  onCta: () => void;
  ctaStyle?: CSSProperties;
  /** Fade + lift the card out (after the CTA is pressed). */
  exiting?: boolean;
}

/** The hero/landing glass card — the first emotional reveal. */
export default function HeroRevealCard({
  icon,
  eyebrow,
  title,
  subtitle,
  subtitleFontFamily,
  ctaText,
  onCta,
  ctaStyle,
  exiting = false,
}: HeroRevealCardProps) {
  return (
    <GlassCard
      enter
      style={{
        maxWidth: "380px",
        width: "100%",
        padding: "clamp(36px, 9vw, 48px) clamp(24px, 7vw, 36px)",
        textAlign: "center",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.05) translateY(-10px)" : "scale(1)",
        transition:
          "opacity var(--dur-slow) var(--ease-smooth), transform var(--dur-slow) var(--ease-luxe)",
      }}
    >
      {icon}
      {eyebrow && (
        <p className="chip blur-in" style={{ marginBottom: "18px" }}>
          {eyebrow}
        </p>
      )}
      <StaggeredText
        as="h1"
        text={title}
        delay={0.25}
        className="font-script hero-gradient-text"
        style={{
          fontSize: "var(--text-hero)",
          lineHeight: "var(--leading-tight)",
          marginBottom: "14px",
          filter: "drop-shadow(0 0 30px rgba(236, 72, 153, 0.4))",
        }}
      />
      {subtitle && (
        <p
          className="blur-in"
          style={{
            color: "var(--ink-soft)",
            fontSize: "1.05rem",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "34px",
            fontFamily: subtitleFontFamily,
            animationDelay: "0.55s",
          }}
        >
          {subtitle}
        </p>
      )}
      <GlowButton onClick={onCta} style={ctaStyle}>
        {ctaText}
      </GlowButton>
    </GlassCard>
  );
}
