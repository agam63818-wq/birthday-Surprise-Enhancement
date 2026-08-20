// ============================================================
//  THEME PRESETS
//  Shared color-theme presets for the full-page experience.
//  Used by:
//    - BirthdayExperienceInner (to apply the theme on mount)
//    - ThemePicker (dashboard UI to select the theme)
//    - Config.themeId (persisted top-level selection)
//
//  Each theme is expressed as a set of CSS custom-property overrides
//  applied to document.documentElement — the same variables already
//  defined in index.css. "midnightPurple" reproduces the current live
//  values exactly, so existing users see zero visual change.
// ============================================================

export type ThemePresetId =
  | "midnightPurple"
  | "roseGold"
  | "deepEmerald"
  | "royalGold";

export interface ThemePreset {
  label: string;
  emoji: string;
  /** Gradient shown in the swatch (two-stop, left→right). */
  swatchGradient: string;
  /** CSS custom-property overrides applied to :root. */
  vars: Record<string, string>;
}

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  // ── Midnight Purple ─────────────────────────────────────────
  // Reproduces the current live look — no visual change for existing users.
  midnightPurple: {
    label: "Midnight Purple",
    emoji: "💜",
    swatchGradient: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)",
    vars: {
      "--bg-deep":          "#07011a",
      "--plum-deep":        "#2a0a3f",
      "--midnight-purple":  "#1e0550",
      "--black-violet":     "#0f0228",
      "--ink":              "#f3ecff",
      "--ink-soft":         "rgba(226, 199, 255, 0.72)",
      "--ink-faint":        "rgba(226, 199, 255, 0.45)",
      "--pink":             "#f472b6",
      "--pink-magenta":     "#ec4899",
      "--violet":           "#a78bfa",
      "--lavender":         "#c4b5fd",
      "--magenta":          "#e879f9",
      "--grad-brand":       "linear-gradient(135deg, #f9a8d4, #e879f9, #a78bfa)",
      "--background":       "#07011a",
      "--foreground":       "#f3ecff",
      "--card":             "#150a30",
      "--card-foreground":  "#f3ecff",
      "--primary":          "#7c3aed",
      "--primary-foreground": "#ffffff",
      "--primary-border":   "rgba(167, 139, 250, 0.35)",
      "--secondary":        "#23123f",
      "--secondary-foreground": "#f3ecff",
      "--muted":            "#1b0e3a",
      "--muted-foreground": "rgba(226, 199, 255, 0.72)",
      "--accent":           "#3a1f66",
      "--accent-foreground": "#f3ecff",
      "--border":           "rgba(167, 139, 250, 0.2)",
      "--input":            "rgba(167, 139, 250, 0.3)",
      "--ring":             "#a78bfa",
      "--button-outline":   "rgba(167, 139, 250, 0.35)",
      "--glow-subtle":      "0 0 14px rgba(236, 72, 153, 0.18)",
      "--glow-soft":        "0 0 22px rgba(236, 72, 153, 0.28), 0 0 40px rgba(167, 139, 250, 0.14)",
      "--glow-medium":      "0 0 30px rgba(236, 72, 153, 0.42), 0 0 60px rgba(167, 139, 250, 0.2)",
      "--glow-strong":      "0 0 44px rgba(236, 72, 153, 0.6), 0 0 90px rgba(167, 139, 250, 0.3)",
    },
  },

  // ── Rose Gold ───────────────────────────────────────────────
  // Warm blush-and-gold palette — romantic, feminine, warm.
  roseGold: {
    label: "Rose Gold",
    emoji: "🌹",
    swatchGradient: "linear-gradient(135deg, #7f1d1d, #be185d, #d97706)",
    vars: {
      "--bg-deep":          "#1a0a0a",
      "--plum-deep":        "#3f1020",
      "--midnight-purple":  "#2d0a18",
      "--black-violet":     "#120208",
      "--ink":              "#fff1f2",
      "--ink-soft":         "rgba(255, 220, 220, 0.75)",
      "--ink-faint":        "rgba(255, 200, 200, 0.45)",
      "--pink":             "#fb7185",
      "--pink-magenta":     "#f43f5e",
      "--violet":           "#fda4af",
      "--lavender":         "#fecdd3",
      "--magenta":          "#e11d48",
      "--grad-brand":       "linear-gradient(135deg, #fda4af, #f43f5e, #d97706)",
      "--background":       "#1a0a0a",
      "--foreground":       "#fff1f2",
      "--card":             "#2d1010",
      "--card-foreground":  "#fff1f2",
      "--primary":          "#be185d",
      "--primary-foreground": "#ffffff",
      "--primary-border":   "rgba(253, 164, 175, 0.35)",
      "--secondary":        "#3f1020",
      "--secondary-foreground": "#fff1f2",
      "--muted":            "#2d1010",
      "--muted-foreground": "rgba(255, 220, 220, 0.72)",
      "--accent":           "#5c1a2a",
      "--accent-foreground": "#fff1f2",
      "--border":           "rgba(253, 164, 175, 0.2)",
      "--input":            "rgba(253, 164, 175, 0.3)",
      "--ring":             "#fda4af",
      "--button-outline":   "rgba(253, 164, 175, 0.35)",
      "--glow-subtle":      "0 0 14px rgba(244, 63, 94, 0.18)",
      "--glow-soft":        "0 0 22px rgba(244, 63, 94, 0.28), 0 0 40px rgba(217, 119, 6, 0.14)",
      "--glow-medium":      "0 0 30px rgba(244, 63, 94, 0.42), 0 0 60px rgba(217, 119, 6, 0.2)",
      "--glow-strong":      "0 0 44px rgba(244, 63, 94, 0.6), 0 0 90px rgba(217, 119, 6, 0.3)",
    },
  },

  // ── Deep Emerald ────────────────────────────────────────────
  // Rich forest-green and teal — fresh, lush, nature-inspired.
  deepEmerald: {
    label: "Deep Emerald",
    emoji: "💚",
    swatchGradient: "linear-gradient(135deg, #064e3b, #059669, #0d9488)",
    vars: {
      "--bg-deep":          "#011a0e",
      "--plum-deep":        "#0a3f20",
      "--midnight-purple":  "#052e16",
      "--black-violet":     "#020f07",
      "--ink":              "#ecfdf5",
      "--ink-soft":         "rgba(167, 243, 208, 0.75)",
      "--ink-faint":        "rgba(167, 243, 208, 0.45)",
      "--pink":             "#34d399",
      "--pink-magenta":     "#10b981",
      "--violet":           "#6ee7b7",
      "--lavender":         "#a7f3d0",
      "--magenta":          "#059669",
      "--grad-brand":       "linear-gradient(135deg, #6ee7b7, #059669, #0d9488)",
      "--background":       "#011a0e",
      "--foreground":       "#ecfdf5",
      "--card":             "#0a2e1a",
      "--card-foreground":  "#ecfdf5",
      "--primary":          "#059669",
      "--primary-foreground": "#ffffff",
      "--primary-border":   "rgba(110, 231, 183, 0.35)",
      "--secondary":        "#0a3f20",
      "--secondary-foreground": "#ecfdf5",
      "--muted":            "#0a2e1a",
      "--muted-foreground": "rgba(167, 243, 208, 0.72)",
      "--accent":           "#1a5c35",
      "--accent-foreground": "#ecfdf5",
      "--border":           "rgba(110, 231, 183, 0.2)",
      "--input":            "rgba(110, 231, 183, 0.3)",
      "--ring":             "#6ee7b7",
      "--button-outline":   "rgba(110, 231, 183, 0.35)",
      "--glow-subtle":      "0 0 14px rgba(16, 185, 129, 0.18)",
      "--glow-soft":        "0 0 22px rgba(16, 185, 129, 0.28), 0 0 40px rgba(13, 148, 136, 0.14)",
      "--glow-medium":      "0 0 30px rgba(16, 185, 129, 0.42), 0 0 60px rgba(13, 148, 136, 0.2)",
      "--glow-strong":      "0 0 44px rgba(16, 185, 129, 0.6), 0 0 90px rgba(13, 148, 136, 0.3)",
    },
  },

  // ── Royal Gold ──────────────────────────────────────────────
  // Deep navy and amber-gold — regal, celebratory, luxurious.
  royalGold: {
    label: "Royal Gold",
    emoji: "👑",
    swatchGradient: "linear-gradient(135deg, #1e1b4b, #4338ca, #d97706)",
    vars: {
      "--bg-deep":          "#07061a",
      "--plum-deep":        "#1e1b4b",
      "--midnight-purple":  "#13124a",
      "--black-violet":     "#050418",
      "--ink":              "#fefce8",
      "--ink-soft":         "rgba(254, 240, 138, 0.75)",
      "--ink-faint":        "rgba(254, 240, 138, 0.45)",
      "--pink":             "#fbbf24",
      "--pink-magenta":     "#f59e0b",
      "--violet":           "#fde68a",
      "--lavender":         "#fef3c7",
      "--magenta":          "#d97706",
      "--grad-brand":       "linear-gradient(135deg, #fde68a, #f59e0b, #4338ca)",
      "--background":       "#07061a",
      "--foreground":       "#fefce8",
      "--card":             "#13124a",
      "--card-foreground":  "#fefce8",
      "--primary":          "#4338ca",
      "--primary-foreground": "#ffffff",
      "--primary-border":   "rgba(253, 230, 138, 0.35)",
      "--secondary":        "#1e1b4b",
      "--secondary-foreground": "#fefce8",
      "--muted":            "#13124a",
      "--muted-foreground": "rgba(254, 240, 138, 0.72)",
      "--accent":           "#2e2a6b",
      "--accent-foreground": "#fefce8",
      "--border":           "rgba(253, 230, 138, 0.2)",
      "--input":            "rgba(253, 230, 138, 0.3)",
      "--ring":             "#fde68a",
      "--button-outline":   "rgba(253, 230, 138, 0.35)",
      "--glow-subtle":      "0 0 14px rgba(245, 158, 11, 0.18)",
      "--glow-soft":        "0 0 22px rgba(245, 158, 11, 0.28), 0 0 40px rgba(67, 56, 202, 0.14)",
      "--glow-medium":      "0 0 30px rgba(245, 158, 11, 0.42), 0 0 60px rgba(67, 56, 202, 0.2)",
      "--glow-strong":      "0 0 44px rgba(245, 158, 11, 0.6), 0 0 90px rgba(67, 56, 202, 0.3)",
    },
  },
};

export const DEFAULT_THEME_PRESET: ThemePresetId = "midnightPurple";

/**
 * Apply a theme by setting its CSS custom-property overrides on
 * `document.documentElement`. Safe to call on every render — it only
 * touches the properties defined in the chosen theme's `vars` map.
 *
 * Mirrors the technique used by FontPicker / fontPresets.ts: a single
 * helper called from a useEffect in BirthdayExperienceInner.
 */
export function applyTheme(themeId: ThemePresetId | undefined): void {
  const id: ThemePresetId = themeId ?? DEFAULT_THEME_PRESET;
  const preset = THEME_PRESETS[id] ?? THEME_PRESETS[DEFAULT_THEME_PRESET];
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(preset.vars)) {
    root.style.setProperty(prop, value);
  }
}
