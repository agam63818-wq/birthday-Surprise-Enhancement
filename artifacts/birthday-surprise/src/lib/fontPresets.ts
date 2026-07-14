// ============================================================
//  FONT PRESETS
//  Shared font-style presets for per-page text customization.
//  Used by:
//    - Page components (to render body text in the chosen font)
//    - FontPicker (dashboard UI to select the font)
//    - Config.textStyles (persisted per-page selection)
// ============================================================

export type FontPresetId = "elegant" | "readable" | "warm" | "storybook";

export const FONT_PRESETS: Record<
  FontPresetId,
  { label: string; emoji: string; fontFamily: string }
> = {
  elegant:   { label: "Elegant Script",   emoji: "✒️", fontFamily: "'Dancing Script', cursive" },
  readable:  { label: "Clean & Readable", emoji: "🔤", fontFamily: "'Inter', system-ui, sans-serif" },
  warm:      { label: "Warm & Friendly",  emoji: "🌸", fontFamily: "'Poppins', sans-serif" },
  storybook: { label: "Storybook Serif",  emoji: "📖", fontFamily: "'Playfair Display', serif" },
};

export const DEFAULT_FONT_PRESET: FontPresetId = "elegant";

// Keys for every page that supports a per-page font override.
export type FontPageKey =
  | "landing"
  | "intro"
  | "cutenessMeter"
  | "celebration"
  | "cake"
  | "whyYouMatter"
  | "ourStory"
  | "memoryWall"
  | "beforeLeave"
  | "lastNote";

/**
 * Resolve the font-family string to use for a given page, given the
 * (possibly undefined) `config.textStyles` object. Safe for older
 * saved surprises that don't have this field yet.
 */
export function resolveFontFamily(
  textStyles: Partial<Record<FontPageKey, FontPresetId>> | undefined,
  page: FontPageKey,
): string {
  const id = (textStyles?.[page] ?? DEFAULT_FONT_PRESET) as FontPresetId;
  return (FONT_PRESETS[id] ?? FONT_PRESETS[DEFAULT_FONT_PRESET]).fontFamily;
}
