import { THEME_PRESETS, type ThemePresetId } from "@/lib/themePresets";
import type { ExperienceTheme } from "./protocol";
import type { ExtendedThemePresetId } from "@/lib/v2/schema";

const FALLBACK_THEME: ThemePresetId = "midnightPurple";

/**
 * Convert the active host preset into the small, closed iframe protocol
 * allowlist. Experience canvases keep their own signature colours; these
 * tokens are for surrounding cards, controls and readable text only.
 */
export function getExperienceTheme(preset: ExtendedThemePresetId | undefined): ExperienceTheme {
  const selected = (preset && preset in THEME_PRESETS ? preset : FALLBACK_THEME) as ThemePresetId;
  const vars = THEME_PRESETS[selected].vars;
  return {
    "--exp-accent": vars["--pink"] ?? "#ec4899",
    "--exp-accent-2": vars["--violet"] ?? "#a78bfa",
    "--exp-bg": vars["--bg-deep"] ?? "#07011a",
    "--exp-text": vars["--ink"] ?? "#f3ecff",
  };
}
