import Reveal from "@/components/Reveal";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

/**
 * Why You Matter — emotional appreciation section. Spotlight glass
 * cards with staggered blur-to-clear reveals.
 * Respects config.whyYouMatter + config.textStyles?.whyYouMatter.
 */
export default function PageWhyYouMatter({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "whyYouMatter");
  const { cards, title, subtitle, buttonText } = config.whyYouMatter;

  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "24px",
        position: "relative", zIndex: 5,
      }}
    >
      <BackgroundEffectsLayer accent="violet" density="low" zIndex={1} />

      <GlassCard
        enter
        style={{
          maxWidth: "430px", width: "100%", padding: "40px 24px",
          textAlign: "center", position: "relative", zIndex: 5,
        }}
      >
        <p className="chip" style={{ marginBottom: "14px" }}>Why You Matter</p>

        <StaggeredText
          as="h1"
          text={title}
          delay={0.2}
          className="font-script hero-gradient-text"
          style={{
            fontSize: "clamp(1.9rem, 5.5vw, 2.8rem)",
            lineHeight: "var(--leading-tight)",
            marginBottom: "10px",
            filter: "drop-shadow(0 0 18px color-mix(in srgb, var(--pink) 35%, transparent))",
          }}
        />
        <p
          className="blur-in"
          style={{
            color: "var(--ink-soft)", fontSize: "13px", lineHeight: 1.7,
            fontFamily: bodyFont, maxWidth: "300px",
            margin: "0 auto 28px", animationDelay: "0.5s",
          }}
        >
          {subtitle}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px", marginBottom: "28px",
          }}
        >
          {cards.map((card, i) => (
            <Reveal key={i} delay={i * 0.14}>
              <div className="spotlight-card glow-hover">
                <div style={{ fontSize: "24px", marginBottom: "10px", filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--pink) 35%, transparent))" }}>
                  {card.icon}
                </div>
                <div style={{ fontFamily: bodyFont, color: "var(--ink)", fontSize: "1rem", fontWeight: 700, marginBottom: "6px" }}>
                  {card.title}
                </div>
                <div style={{ color: "var(--ink-soft)", fontSize: "12px", lineHeight: 1.65, fontFamily: bodyFont }}>
                  {card.desc}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <GlowButton onClick={onNext}>
          {buttonText}
        </GlowButton>
      </GlassCard>
    </div>
  );
}
