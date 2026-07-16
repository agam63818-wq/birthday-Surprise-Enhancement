import { useMemo, type CSSProperties } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Density = "low" | "medium" | "high";
type Accent = "pink" | "violet" | "rose";

const DENSITY: Record<Density, { stars: number; hearts: number; orbs: number }> = {
  low: { stars: 10, hearts: 3, orbs: 2 },
  medium: { stars: 16, hearts: 6, orbs: 3 },
  high: { stars: 24, hearts: 9, orbs: 4 },
};

const ACCENT: Record<Accent, { orb: string; heart: string; heartAlt: string }> = {
  pink: {
    orb: "rgba(236, 72, 153, 0.14)",
    heart: "rgba(244, 114, 182, 0.5)",
    heartAlt: "rgba(249, 168, 212, 0.4)",
  },
  violet: {
    orb: "rgba(124, 58, 237, 0.14)",
    heart: "rgba(167, 139, 250, 0.5)",
    heartAlt: "rgba(196, 181, 253, 0.4)",
  },
  rose: {
    orb: "rgba(224, 168, 153, 0.12)",
    heart: "rgba(249, 168, 212, 0.45)",
    heartAlt: "rgba(224, 168, 153, 0.38)",
  },
};

interface BackgroundEffectsLayerProps {
  density?: Density;
  accent?: Accent;
  showStars?: boolean;
  showHearts?: boolean;
  showOrbs?: boolean;
  zIndex?: number;
}

/**
 * Atmospheric layer: twinkling stars + floating hearts + blurred light
 * orbs. CSS transform/opacity animations only, low particle counts.
 * Configurable per page (density + color accent) so each section can
 * reuse it with slight variation. Complements the main canvas
 * Background — never replaces it.
 *
 * Reduced motion: hearts are skipped and stars/orbs render statically
 * (the global reduced-motion CSS rule collapses their animations).
 */
export default function BackgroundEffectsLayer({
  density = "medium",
  accent = "pink",
  showStars = true,
  showHearts = true,
  showOrbs = true,
  zIndex = 2,
}: BackgroundEffectsLayerProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const counts = DENSITY[density];
  const colors = ACCENT[accent];

  const stars = useMemo(
    () =>
      Array.from({ length: counts.stars }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 97}%`,
        top: `${(i * 53 + 7) % 92}%`,
        size: 1 + (i % 3),
        dur: `${2.6 + (i % 5) * 0.7}s`,
        delay: `${(i * 0.47) % 4}s`,
      })),
    [counts.stars],
  );

  const hearts = useMemo(
    () =>
      reduced
        ? []
        : Array.from({ length: counts.hearts }, (_, i) => ({
            id: i,
            left: `${(i * 31 + 8) % 90}%`,
            size: 10 + ((i * 5) % 14),
            dur: `${9 + ((i * 1.4) % 7)}s`,
            delay: `${(i * 1.9) % 8}s`,
            color: i % 2 === 0 ? colors.heart : colors.heartAlt,
          })),
    [counts.hearts, reduced, colors],
  );

  const orbs = useMemo(
    () =>
      Array.from({ length: counts.orbs }, (_, i) => ({
        id: i,
        left: `${(i * 41 + 6) % 75}%`,
        top: `${(i * 29 + 12) % 70}%`,
        size: 180 + i * 70,
        delay: `${i * 2.4}s`,
      })),
    [counts.orbs],
  );

  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex, pointerEvents: "none", overflow: "hidden" }}
    >
      {showOrbs &&
        orbs.map((o) => (
          <div
            key={`o${o.id}`}
            className="bgfx-orb"
            style={{
              left: o.left,
              top: o.top,
              width: o.size,
              height: o.size,
              background: colors.orb,
              animationDelay: o.delay,
            }}
          />
        ))}
      {showStars &&
        stars.map((s) => (
          <span
            key={`s${s.id}`}
            className="bgfx-star"
            style={
              {
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                "--bgfx-dur": s.dur,
                "--bgfx-delay": s.delay,
              } as CSSProperties
            }
          />
        ))}
      {showHearts &&
        hearts.map((h) => (
          <span
            key={`h${h.id}`}
            className="floating-heart"
            style={{
              position: "absolute",
              bottom: "-30px",
              left: h.left,
              fontSize: `${h.size}px`,
              color: h.color,
              animationDuration: h.dur,
              animationDelay: h.delay,
            }}
          >
            ♥
          </span>
        ))}
    </div>
  );
}
