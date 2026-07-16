import { useState, useEffect } from "react";
import { TeddySVGOnly } from "@/components/Teddy";
import TypewriterText from "@/components/TypewriterText";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

/**
 * Before You Leave — a gentle, reflective breath before the emotional
 * peak of the Last Note. Soft glow, minimal distraction, calm pacing:
 * a quiet ambient layer (no floating hearts), a floating teddy and the
 * slow typewriter message. Respects config.beforeLeave +
 * config.textStyles?.beforeLeave.
 */
export default function PageBeforeYouLeave({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "beforeLeave");
  const { message, buttonText } = config.beforeLeave;
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowButton(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "24px",
        position: "relative", zIndex: 5,
      }}
    >
      {/* Calm ambient layer — dim stars + one soft orb, no hearts */}
      <BackgroundEffectsLayer accent="violet" density="low" showHearts={false} zIndex={1} />

      <GlassCard
        enter
        style={{
          maxWidth: "390px", width: "100%", padding: "48px 30px",
          textAlign: "center", position: "relative", zIndex: 5,
          boxShadow: "var(--shadow-strong), var(--glow-subtle)",
        }}
      >
        <TeddySVGOnly size={100} animate="float" style={{ margin: "0 auto 24px" }} />

        <h1
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.5rem)",
            lineHeight: 1.35,
            marginBottom: "36px",
            background: "linear-gradient(135deg, #f9a8d4, #c084fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            filter: "drop-shadow(0 0 16px rgba(196, 132, 252, 0.3))",
            fontFamily: bodyFont,
          }}
        >
          <TypewriterText text={message} speed={48} delay={0.3} />
        </h1>

        <GlowButton
          onClick={onNext}
          style={{
            background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)",
            opacity: showButton ? 1 : 0,
            transform: showButton ? "translateY(0)" : "translateY(10px)",
            pointerEvents: showButton ? "all" : "none",
            transition:
              "opacity var(--dur-slow) var(--ease-entrance), transform var(--dur-slow) var(--ease-entrance)",
          }}
        >
          {buttonText}
        </GlowButton>
      </GlassCard>
    </div>
  );
}
