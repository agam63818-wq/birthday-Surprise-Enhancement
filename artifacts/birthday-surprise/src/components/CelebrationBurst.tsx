import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { prefersReducedMotion } from "@/lib/motion";

// On-palette celebration colors (pink / violet / lavender / rose-gold).
const PALETTE = ["#f472b6", "#c084fc", "#e879f9", "#f9a8d4", "#a78bfa", "#e0a899", "#ffffff"];

interface CelebrationBurstProps {
  /** Fires once per rising edge of `active`. */
  active: boolean;
  /** grand = the cake-cutting moment; standard = smaller celebrations. */
  intensity?: "standard" | "grand";
  /** Normalized burst origin (0–1). */
  origin?: { x: number; y: number };
  onComplete?: () => void;
}

/**
 * Powerful but tasteful celebration burst — deliberately more energetic
 * than the ambient background particles. Built now so Part 2 can trigger
 * it at the cake-cutting moment.
 *
 * Reduced motion: no particle motion — a single soft light flash fades
 * out instead, then onComplete fires.
 */
export default function CelebrationBurst({
  active,
  intensity = "grand",
  origin = { x: 0.5, y: 0.55 },
  onComplete,
}: CelebrationBurstProps) {
  const firedRef = useRef(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;

    if (prefersReducedMotion()) {
      setFlash(true);
      const t = window.setTimeout(() => {
        setFlash(false);
        onComplete?.();
      }, 900);
      return () => clearTimeout(t);
    }

    const grand = intensity === "grand";
    const timers: number[] = [];

    // Main energetic burst from the origin (the cake).
    confetti({
      particleCount: grand ? 160 : 100,
      spread: 95,
      startVelocity: 42,
      origin,
      colors: PALETTE,
      scalar: 1.15,
      gravity: 0.85,
      ticks: 320,
      disableForReducedMotion: true,
    });
    // Side cannons.
    timers.push(
      window.setTimeout(
        () =>
          confetti({
            particleCount: grand ? 90 : 55,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.72 },
            colors: PALETTE,
            scalar: 0.95,
            disableForReducedMotion: true,
          }),
        180,
      ),
    );
    timers.push(
      window.setTimeout(
        () =>
          confetti({
            particleCount: grand ? 90 : 55,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.72 },
            colors: PALETTE,
            scalar: 0.95,
            disableForReducedMotion: true,
          }),
        320,
      ),
    );
    // Slow glitter drift finale.
    timers.push(
      window.setTimeout(
        () =>
          confetti({
            particleCount: grand ? 70 : 40,
            spread: 120,
            startVelocity: 24,
            decay: 0.94,
            origin: { x: origin.x, y: Math.max(0, origin.y - 0.15) },
            colors: PALETTE,
            scalar: 0.8,
            ticks: 380,
            disableForReducedMotion: true,
          }),
        750,
      ),
    );
    if (grand) {
      timers.push(
        window.setTimeout(
          () =>
            confetti({
              particleCount: 50,
              spread: 160,
              startVelocity: 18,
              gravity: 0.6,
              origin: { x: 0.5, y: 0.35 },
              colors: PALETTE,
              scalar: 0.7,
              ticks: 420,
              disableForReducedMotion: true,
            }),
          1300,
        ),
      );
    }
    timers.push(window.setTimeout(() => onComplete?.(), grand ? 2600 : 1800));

    return () => timers.forEach((t) => clearTimeout(t));
  }, [active, intensity, origin, onComplete]);

  return flash ? <div className="celebration-flash" /> : null;
}
