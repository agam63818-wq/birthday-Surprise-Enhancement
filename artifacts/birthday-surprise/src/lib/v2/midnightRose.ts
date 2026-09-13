// ============================================================
//  MIDNIGHT ROSE — Premium design tokens (v2 only)
//
//  Applied ONLY when themePreset === "midnightRose".
//  Scoped to the experience container — dashboard/auth/payment
//  are NOT rethemed. Saved theme choices are preserved.
//
//  Design principles:
//  - Deep near-black base (not pure black)
//  - Wine/crimson accent (restrained, not garish)
//  - Champagne/gold highlights
//  - Serif headings / readable sans body
//  - Subtle glass/gradients/grain
//  - Generous space, controlled glow
//  - No pink/hearts/glow/particles everywhere
//  - Emphasis on composition/typography/choreography
// ============================================================

export const MIDNIGHT_ROSE_VARS: Record<string, string> = {
  // ── Base palette ─────────────────────────────────────────
  "--bg-deep":          "#0a0205",
  "--plum-deep":        "#1a0508",
  "--midnight-purple":  "#120306",
  "--black-violet":     "#060102",

  // ── Text ─────────────────────────────────────────────────
  "--ink":              "#f5ede8",
  "--ink-soft":         "rgba(245, 220, 210, 0.72)",
  "--ink-faint":        "rgba(245, 220, 210, 0.42)",

  // ── Accent colors ────────────────────────────────────────
  "--pink":             "#c0392b",          // wine/crimson (not pink)
  "--pink-magenta":     "#a93226",          // deeper crimson
  "--violet":           "#d4a574",          // champagne/gold
  "--lavender":         "#e8c99a",          // warm champagne
  "--magenta":          "#8b1a1a",          // dark wine

  // ── Brand gradient ───────────────────────────────────────
  "--grad-brand":       "linear-gradient(135deg, #e8c99a, #c0392b, #8b1a1a)",

  // ── Semantic tokens ──────────────────────────────────────
  "--background":       "#0a0205",
  "--foreground":       "#f5ede8",
  "--card":             "#160508",
  "--card-foreground":  "#f5ede8",
  "--primary":          "#9b2335",
  "--primary-foreground": "#f5ede8",
  "--primary-border":   "rgba(192,57,43,0.35)",
  "--secondary":        "#1a0508",
  "--secondary-foreground": "#f5ede8",
  "--muted":            "#120306",
  "--muted-foreground": "rgba(245,220,210,0.65)",
  "--accent":           "#2a0a0e",
  "--accent-foreground": "#f5ede8",
  "--border":           "rgba(192,57,43,0.18)",
  "--input":            "rgba(192,57,43,0.22)",
  "--ring":             "#d4a574",
  "--button-outline":   "rgba(192,57,43,0.3)",

  // ── Glow (restrained — no pink everywhere) ───────────────
  "--glow-subtle":      "0 0 14px rgba(192,57,43,0.12)",
  "--glow-soft":        "0 0 22px rgba(192,57,43,0.2), 0 0 40px rgba(212,165,116,0.08)",
  "--glow-medium":      "0 0 30px rgba(192,57,43,0.32), 0 0 60px rgba(212,165,116,0.12)",
  "--glow-strong":      "0 0 44px rgba(192,57,43,0.5), 0 0 90px rgba(212,165,116,0.18)",

  // ── Typography ───────────────────────────────────────────
  "--font-script":      "'Playfair Display', Georgia, serif",
  "--font-heading":     "'Playfair Display', Georgia, serif",
  "--font-body":        "'Inter', system-ui, -apple-system, sans-serif",
};

/**
 * Apply Midnight Rose tokens to the experience container element.
 * Scoped to the element — does NOT touch document.documentElement,
 * so dashboard/auth/payment are unaffected.
 */
export function applyMidnightRoseToElement(el: HTMLElement): void {
  for (const [prop, value] of Object.entries(MIDNIGHT_ROSE_VARS)) {
    el.style.setProperty(prop, value);
  }
}

/**
 * Remove Midnight Rose tokens from an element (restore to inherited values).
 */
export function removeMidnightRoseFromElement(el: HTMLElement): void {
  for (const prop of Object.keys(MIDNIGHT_ROSE_VARS)) {
    el.style.removeProperty(prop);
  }
}
