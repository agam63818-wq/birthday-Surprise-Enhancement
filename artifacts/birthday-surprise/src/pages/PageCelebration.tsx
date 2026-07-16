import PremiumHeart from "@/components/PremiumHeart";
import TypewriterText from "@/components/TypewriterText";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

/**
 * Celebration — the warm afterglow of the cake moment. Premium glass
 * treatment, staggered title reveal, existing typewriter message kept.
 * Respects config.celebration + config.textStyles?.celebration.
 */
export default function PageCelebration({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "celebration");
  const { title, subtitle1, subtitle2, badge, message, buttonText } = config.celebration;

  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "24px",
        position: "relative", zIndex: 5,
      }}
    >
      <BackgroundEffectsLayer accent="pink" density="high" zIndex={1} />

      <GlassCard
        enter
        style={{
          maxWidth: "390px", width: "100%", padding: "40px 30px",
          textAlign: "center", position: "relative", zIndex: 5,
        }}
      >
        <p className="chip" style={{ marginBottom: "14px" }}>Birthday Vibes</p>

        <StaggeredText
          as="h1"
          text={title}
          delay={0.2}
          className="font-script hero-gradient-text"
          style={{
            fontSize: "clamp(2rem, 6vw, 3rem)",
            lineHeight: "var(--leading-tight)",
            marginBottom: "10px",
            filter: "drop-shadow(0 0 20px rgba(232, 121, 249, 0.35))",
          }}
        />

        <p className="blur-in" style={{ color: "var(--ink-soft)", fontSize: "14px", fontFamily: bodyFont, marginBottom: "2px", animationDelay: "0.5s" }}>
          {subtitle1}
        </p>
        <p className="blur-in" style={{ color: "var(--ink-faint)", fontSize: "13px", fontFamily: bodyFont, marginBottom: "20px", animationDelay: "0.65s" }}>
          {subtitle2}
        </p>

        <div
          className="blur-in"
          style={{
            display: "inline-block", padding: "5px 16px", borderRadius: "var(--rad-pill)",
            background: "rgba(167, 139, 250, 0.08)", border: "1px solid rgba(167, 139, 250, 0.18)",
            color: "var(--ink-faint)", fontSize: "10px", letterSpacing: "0.15em",
            marginBottom: "28px", animationDelay: "0.8s",
          }}
        >
          {badge}
        </div>

        <PremiumHeart size={100} style={{ margin: "0 auto 24px" }} />

        <p
          style={{
            color: "rgba(235, 210, 255, 0.85)", fontSize: "1.05rem",
            lineHeight: "var(--leading-relaxed)", marginBottom: "32px",
            fontFamily: bodyFont,
          }}
        >
          <TypewriterText text={message} speed={40} delay={0.3} />
        </p>

        <GlowButton onClick={onNext} style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)" }}>
          {buttonText}
        </GlowButton>
      </GlassCard>
    </div>
  );
}
