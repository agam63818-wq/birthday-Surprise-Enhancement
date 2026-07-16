import { useEffect, useMemo, useState } from "react";
import PremiumHeart from "@/components/PremiumHeart";
import HeroRevealCard from "@/components/HeroRevealCard";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Landing = cinematic prelude + hero reveal.
 * 1. Prelude: the glowing heart blooms out of the darkness with three
 *    shimmering dots — an intentional, premium opening beat (not a
 *    generic spinner). Skipped entirely under prefers-reduced-motion.
 * 2. Hero: HeroRevealCard with the personalized config.landing copy,
 *    staggered title reveal and a shimmering GlowButton CTA.
 */
export default function PageLanding({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "landing");
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [phase, setPhase] = useState<"prelude" | "hero">(reduced ? "hero" : "prelude");
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (phase !== "prelude") return;
    const t = window.setTimeout(() => setPhase("hero"), 1700);
    return () => clearTimeout(t);
  }, [phase]);

  const handleCta = () => {
    setPressed(true);
    setTimeout(onNext, 700);
  };

  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "calc(24px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px))",
        position: "relative",
        zIndex: 5,
      }}
    >
      <BackgroundEffectsLayer accent="pink" density="medium" zIndex={1} />

      {phase === "prelude" ? (
        <div className="prelude-bloom" style={{ textAlign: "center", position: "relative", zIndex: 5 }}>
          <PremiumHeart size={110} style={{ margin: "0 auto 22px" }} />
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="prelude-dot" style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <HeroRevealCard
          icon={<PremiumHeart size={96} style={{ margin: "0 auto 26px" }} />}
          eyebrow="✦ A Special Surprise ✦"
          title={config.landing.title}
          subtitle={config.landing.subtitle}
          subtitleFontFamily={bodyFont}
          ctaText={config.landing.buttonText}
          onCta={handleCta}
          ctaStyle={{ background: "linear-gradient(135deg, #7c1d6f, #9d174d, #be185d, #7c3aed)" }}
          exiting={pressed}
        />
      )}
    </div>
  );
}
