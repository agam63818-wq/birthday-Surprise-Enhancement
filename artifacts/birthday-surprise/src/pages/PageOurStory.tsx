import Reveal from "@/components/Reveal";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

/**
 * Our Story — romantic timeline. Alternating left/right cards along a
 * glowing central line on desktop, stacked on mobile. Each item reveals
 * with the Part 1 blur-to-clear entrance as it scrolls into view.
 * Respects config.ourStory + config.textStyles?.ourStory.
 */
export default function PageOurStory({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "ourStory");
  const { cards, title, subtitle, buttonText } = config.ourStory;

  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "24px",
        position: "relative", zIndex: 5,
      }}
    >
      <BackgroundEffectsLayer accent="rose" density="low" zIndex={1} />

      <GlassCard
        enter
        style={{
          maxWidth: "520px", width: "100%", padding: "40px 24px",
          textAlign: "center", position: "relative", zIndex: 5,
        }}
      >
        <p className="chip" style={{ marginBottom: "14px" }}>Our Journey</p>

        <StaggeredText
          as="h1"
          text={title}
          delay={0.2}
          className="font-script hero-gradient-text"
          style={{
            fontSize: "clamp(1.9rem, 5.5vw, 2.8rem)",
            lineHeight: "var(--leading-tight)",
            marginBottom: "10px",
            filter: "drop-shadow(0 0 18px rgba(232, 121, 249, 0.35))",
          }}
        />
        <p
          className="blur-in"
          style={{
            color: "var(--ink-faint)", fontSize: "13px", fontFamily: bodyFont,
            marginBottom: "28px", animationDelay: "0.5s",
          }}
        >
          {subtitle}
        </p>

        <div className="timeline" style={{ marginBottom: "28px" }}>
          {cards.map((card, i) => (
            <Reveal
              key={i}
              delay={i * 0.12}
              className={`timeline-item ${i % 2 === 0 ? "tl-left" : "tl-right"}`}
            >
              <span className="timeline-dot" aria-hidden="true" />
              <div className="timeline-card glow-hover">
                <div style={{ fontSize: "22px", marginBottom: "8px", filter: "drop-shadow(0 0 10px rgba(249, 168, 212, 0.35))" }}>
                  {card.icon}
                </div>
                <div style={{ fontFamily: bodyFont, color: "rgba(235, 205, 255, 0.92)", fontSize: "1rem", fontWeight: 700, marginBottom: "6px" }}>
                  {card.title}
                </div>
                <div style={{ color: "rgba(200, 170, 255, 0.68)", fontSize: "12px", lineHeight: 1.65, fontFamily: bodyFont }}>
                  {card.desc}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <GlowButton onClick={onNext} style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)" }}>
          {buttonText}
        </GlowButton>
      </GlassCard>
    </div>
  );
}
