import { useState, useEffect } from "react";
import { TeddySVGOnly } from "@/components/Teddy";
import TypewriterText from "@/components/TypewriterText";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

/**
 * Intro — warm, intimate emotional deepening. Staggered heading reveal,
 * the existing typewriter message (config-driven), and a glowing CTA.
 * Respects config.intro fields and config.textStyles?.intro.
 */
export default function PageIntro({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "intro");
  const [progress, setProgress] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      let p = 0;
      const iv = setInterval(() => {
        p += 1.1;
        setProgress(Math.min(p, 100));
        if (p >= 100) { clearInterval(iv); setTimeout(() => setShowButton(true), 600); }
      }, 30);
      return () => clearInterval(iv);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        zIndex: 5,
      }}
    >
      <BackgroundEffectsLayer accent="violet" density="low" zIndex={1} />

      <GlassCard
        enter
        style={{
          maxWidth: "390px",
          width: "100%",
          padding: "40px 32px",
          textAlign: "center",
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Teddy with float animation */}
        <TeddySVGOnly size={110} animate="float" style={{ margin: "0 auto 20px" }} />

        <StaggeredText
          as="h1"
          text={config.intro.heading}
          delay={0.2}
          className="font-script hero-gradient-text"
          style={{
            fontSize: "clamp(1.8rem, 5.5vw, 2.6rem)",
            lineHeight: "var(--leading-tight)",
            marginBottom: "18px",
            filter: "drop-shadow(0 0 20px rgba(196, 132, 252, 0.4))",
          }}
        />

        <p
          style={{
            color: "var(--ink-soft)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            fontFamily: bodyFont,
            marginBottom: "28px",
            minHeight: "3.2rem",
          }}
        >
          <TypewriterText text={config.intro.message} speed={36} delay={0.5} />
        </p>

        {/* Progress bar — tokenized glow */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              height: "3px",
              background: "rgba(167, 139, 250, 0.12)",
              borderRadius: "var(--rad-pill)",
              overflow: "hidden",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #7c3aed, #ec4899, #f9a8d4)",
                borderRadius: "var(--rad-pill)",
                transition: "width 0.04s linear",
                boxShadow: "var(--glow-subtle)",
              }}
            />
          </div>
          <p
            style={{
              color: "var(--ink-faint)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              fontStyle: "italic",
            }}
          >
            {progress < 100 ? config.intro.loadingText : "Ready ✦"}
          </p>
        </div>

        <GlowButton
          onClick={onNext}
          style={{
            opacity: showButton ? 1 : 0,
            transform: showButton ? "translateY(0)" : "translateY(10px)",
            pointerEvents: showButton ? "all" : "none",
            transition:
              "opacity var(--dur-slow) var(--ease-entrance), transform var(--dur-slow) var(--ease-entrance)",
          }}
        >
          {config.intro.buttonText}
        </GlowButton>
      </GlassCard>
    </div>
  );
}
