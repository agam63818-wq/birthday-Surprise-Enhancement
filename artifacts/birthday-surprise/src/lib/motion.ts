// ============================================================
//  MOTION SYSTEM HELPERS
//  JS mirror of the motion design tokens in index.css, plus the
//  shared reduced-motion check used by every animated component.
// ============================================================

/** Motion durations in ms — mirrors --dur-* CSS custom properties. */
export const DURATIONS = {
  fast: 150,
  base: 300,
  slow: 600,
  cinematic: 950,
} as const;

/** Named easing curves — mirrors --ease-* CSS custom properties. */
export const EASINGS = {
  /** Gentle ease-out for element entrances. */
  entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Smooth ease-in-out for section/state transitions. */
  smooth: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** Softer luxurious curve for hero / cinematic moments. */
  luxe: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

/**
 * True when the user prefers reduced motion. Every cinematic
 * animation must branch on this and fall back to an instant or
 * simple-fade state (consistent with PageLastNote.tsx).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
