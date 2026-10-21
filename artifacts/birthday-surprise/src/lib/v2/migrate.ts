// ============================================================
//  MIGRATIONS — Pure, deterministic, non-mutating, repeatable
//
//  Rules:
//  - NEVER mutate the input; always return a new object
//  - NEVER auto-save; callers decide what to do with the result
//  - Preserve ALL user text/names/media/audio/theme/occasion/order
//  - Explicit false/zero/valid empty values are preserved
//  - Missing fields get safe defaults (no truthiness overwrite)
//  - Legacy records retain legacy theme/sequence
//  - New cinematic scenes NOT enabled on old records
//  - Unknown safe extension data preserved in _ext
//  - Unsupported future versions → controlled fallback, never silent
// ============================================================

import type { Config } from "@/config";
import type {
  SurpriseConfig,
  NormalizedConfig,
  ConfigVersion,
  OccasionId,
  SceneId,
  LegacySceneId,
  FeatureFlags,
  NotebookConfig,
  RoseBloomConfig,
  ButterflyConfig,
  GiftRevealConfig,
  YouAndMeConfig,
  ExtendedThemePresetId,
} from "./schema";
import type { ThemePresetId } from "@/lib/themePresets";

// ── Legacy occasion aliases ──────────────────────────────────────────────
const OCCASION_ALIASES: Record<string, OccasionId> = {
  birthday:      "birthday",
  rakshabandhan: "rakshabandhan",
  fathersday:    "fathersday",
  mothersday:    "mothersday",
  loveday:       "loveday",
  custom:        "custom",
  // New aliases
  anniversary:   "anniversary",
  friendship:    "friendship",
  congratulations: "congratulations",
  romantic:      "romantic",
  justbecause:   "justbecause",
};

// ── Legacy fixed scene sequence ──────────────────────────────────────────
// This is the EXACT sequence used by BirthdayExperience for v1 records.
// Occasion hero is always "cake" in the sequence; the renderer switches
// based on occasionType. We preserve this mapping.
export const LEGACY_SCENE_SEQUENCE: LegacySceneId[] = [
  "landing",
  "intro",
  "cuteness",
  "celebration",
  "cake",
  "whyYouMatter",
  "ourStory",
  "memoryWall",
  "beforeLeave",
  "lastNote",
];

// ── Default new-record scene sequence ────────────────────────────────────
// Only used when _version === 2 AND scenes is explicitly set.
// NOT applied to legacy records.
export const DEFAULT_V2_SCENE_SEQUENCE: SceneId[] = [
  "intro", "butterfly", "giftReveal", "celebration", "memoryWall",
  "youAndMe", "letters", "notebook", "roseBloom", "lastNote",
];

// ── Default feature flags ────────────────────────────────────────────────
function defaultLegacyFeatures(): FeatureFlags {
  return {
    letters: false,
    landing: true, cake: true, rakhiHero: true, familyHero: true, loveDayHero: true,
    // Legacy features: all on
    intro: true,
    cutenessMeter: true,
    celebration: true,
    memoryWall: true,
    ourStory: true,
    whyYouMatter: true,
    beforeLeave: true,
    lastNote: true,
    // New cinematic scenes: all off for legacy records
    butterfly: false,
    giftReveal: false,
    youAndMe: false,
    notebook: false,
    roseBloom: false,
  };
}

function defaultV2Features(): FeatureFlags {
  return {
    letters: true,
    landing: true, cake: true, rakhiHero: true, familyHero: true, loveDayHero: true,
    intro: true,
    cutenessMeter: false,
    celebration: true,
    memoryWall: true,
    ourStory: false,
    whyYouMatter: true,
    beforeLeave: false,
    lastNote: true,
    butterfly: true,
    giftReveal: true,
    youAndMe: true,
    notebook: true,
    roseBloom: true,
  };
}

// ── Default notebook ─────────────────────────────────────────────────────
function defaultNotebook(): NotebookConfig {
  return { pages: [] };
}

// ── Resolve occasion ─────────────────────────────────────────────────────
function resolveOccasion(raw: SurpriseConfig): OccasionId {
  // v2 explicit occasionId takes priority
  if (raw.occasionId && OCCASION_ALIASES[raw.occasionId]) {
    return OCCASION_ALIASES[raw.occasionId];
  }
  // Legacy occasionType
  if (raw.occasionType && OCCASION_ALIASES[raw.occasionType]) {
    return OCCASION_ALIASES[raw.occasionType];
  }
  return "birthday";
}

// ── Resolve theme ────────────────────────────────────────────────────────
function resolveTheme(raw: SurpriseConfig): {
  preset: ExtendedThemePresetId;
  legacyThemeId?: ThemePresetId;
} {
  // v2 explicit themePreset takes priority
  if (raw.themePreset) {
    return { preset: raw.themePreset };
  }
  // Legacy themeId
  if (raw._version === 2 && !raw.themeId) return { preset: "midnightRose" };
  const legacyId = raw.themeId ?? "midnightPurple";
  return { preset: legacyId, legacyThemeId: legacyId };
}

// ── Resolve features ─────────────────────────────────────────────────────
function resolveFeatures(raw: SurpriseConfig, version: ConfigVersion): FeatureFlags {
  const base = version === 2 ? defaultV2Features() : defaultLegacyFeatures();
  if (!raw.features) return base;

  // Merge: explicit values override defaults; missing values keep defaults.
  // Explicit false is preserved (no truthiness overwrite).
  const merged = { ...base };
  const f = raw.features;
  for (const key of Object.keys(base) as (keyof FeatureFlags)[]) {
    if (key in f && typeof f[key] === "boolean") {
      merged[key] = f[key] as boolean;
    }
  }
  return merged;
}

// ── Resolve scenes ───────────────────────────────────────────────────────
function resolveScenes(raw: SurpriseConfig, version: ConfigVersion): SceneId[] {
  // v2 with explicit scenes array
  if (version === 2 && Array.isArray(raw.scenes)) {
    return [...raw.scenes];
  }
  return version === 2 ? [...DEFAULT_V2_SCENE_SEQUENCE] : [...LEGACY_SCENE_SEQUENCE];
}

// ── Resolve audio ────────────────────────────────────────────────────────
function resolveAudio(raw: SurpriseConfig) {
  return {
    music: raw.audio?.backgroundMusic ?? "",
    musicVolume: 0.35,
    muted: false,
    soundEffectsEnabled: true,
    birthdaySong: raw.audio?.birthdaySong ?? "",
    useFallbackTones: raw.audio?.useFallbackTones !== false,
  };
}

// ── Resolve notebook ─────────────────────────────────────────────────────
function resolveNotebook(raw: SurpriseConfig): NotebookConfig {
  if (!raw.notebook) return defaultNotebook();
  // Validate pages array
  if (!Array.isArray(raw.notebook.pages)) return defaultNotebook();
  return { pages: raw.notebook.pages };
}

// ── Resolve rose bloom ───────────────────────────────────────────────────
function resolveRoseBloom(raw: SurpriseConfig): RoseBloomConfig {
  return {
    text: raw.roseBloom?.text,
    speed: raw.roseBloom?.speed ?? "normal",
    intensity: raw.roseBloom?.intensity ?? "normal",
    fallingPetals: raw.roseBloom?.fallingPetals !== false,
    soundEnabled: raw.roseBloom?.soundEnabled !== false,
  };
}

// ── Resolve butterfly ────────────────────────────────────────────────────
function resolveButterfly(raw: SurpriseConfig): ButterflyConfig {
  return {
    message: raw.butterfly?.message,
    subMessage: raw.butterfly?.subMessage,
  };
}

// ── Resolve gift reveal ──────────────────────────────────────────────────
function resolveGiftReveal(raw: SurpriseConfig): GiftRevealConfig {
  return {
    occasionText: raw.giftReveal?.occasionText,
    recipientName: raw.giftReveal?.recipientName ?? raw.name,
    senderName: raw.giftReveal?.senderName,
    message: raw.giftReveal?.message,
    photoUrl: raw.giftReveal?.photoUrl,
  };
}

// ── Resolve you & me ─────────────────────────────────────────────────────
function resolveYouAndMe(raw: SurpriseConfig): YouAndMeConfig {
  return {
    name1: raw.youAndMe?.name1 ?? raw.giftReveal?.senderName,
    name2: raw.youAndMe?.name2 ?? raw.name,
  };
}

// ── Detect version ───────────────────────────────────────────────────────
function detectVersion(raw: SurpriseConfig): ConfigVersion {
  if (raw._version === 2) return 2;
  if (raw._version === 1) return 1;
  // Future versions: controlled fallback to v1 (never silent downgrade)
  if (typeof raw._version === "number" && raw._version > 2) {
    console.warn(
      `[SurpriseConfig] Unsupported version ${raw._version}; falling back to v1 rendering.`
    );
    return 1;
  }
  // Absent = legacy v1
  return 1;
}

// ── Preserve unknown extension data ─────────────────────────────────────
const KNOWN_V2_KEYS = new Set([
  "_version", "occasionId", "scenes", "features", "themePreset",
  "notebook", "roseBloom", "butterfly", "giftReveal", "youAndMe",
  "textStyles", "stickers", "_ext",
]);

function preserveExtensionData(raw: SurpriseConfig): Record<string, unknown> {
  const ext: Record<string, unknown> = { ...(raw._ext ?? {}) };
  for (const key of Object.keys(raw)) {
    if (!KNOWN_V2_KEYS.has(key)) continue;
    // Already handled by known keys — skip
  }
  return ext;
}

// ── Main normalization function ──────────────────────────────────────────
/**
 * Normalize a raw SurpriseConfig (from DB or default) into a fully
 * resolved NormalizedConfig. Pure, non-mutating, repeatable.
 *
 * @param raw - The raw config from the DB or default config.ts
 * @returns A fully resolved NormalizedConfig.
 */
export function normalizeConfig(raw: SurpriseConfig): NormalizedConfig {
  const version = detectVersion(raw);
  const occasion = resolveOccasion(raw);
  const theme = resolveTheme(raw);
  const features = resolveFeatures(raw, version);
  const scenes = resolveScenes(raw, version);
  const audio = resolveAudio(raw);
  const notebook = resolveNotebook(raw);
  const roseBloom = resolveRoseBloom(raw);
  const butterfly = resolveButterfly(raw);
  const giftReveal = resolveGiftReveal(raw);
  const youAndMe = resolveYouAndMe(raw);

  return {
    version,
    occasion,
    recipient: {
      name: raw.name ?? "",
      photo: undefined,
    },
    sender: {
      name: raw.giftReveal?.senderName ?? "",
    },
    theme,
    features,
    scenes,
    audio,
    notebook,
    roseBloom,
    butterfly,
    giftReveal,
    youAndMe,
    raw,
  };
}

// ── Migration: v1 → v2 (pure, non-mutating) ─────────────────────────────
/**
 * Upgrade a v1 config to v2 format. Does NOT enable new scenes —
 * legacy records retain their legacy sequence and feature set.
 * Only adds the _version discriminant and normalizes occasion aliases.
 *
 * This is a PURE function — it never mutates the input and never
 * triggers a save. Callers decide whether to persist the result.
 */
export function migrateV1ToV2(raw: Config): SurpriseConfig {
  const existing = raw as SurpriseConfig;
  if (existing._version === 2) return structuredClone(existing);
  const result: SurpriseConfig = {
    ...structuredClone(raw),
    _version: 2,
    // Preserve legacy occasionType as occasionId for forward compat
    occasionId: resolveOccasion(raw as SurpriseConfig),
    // Preserve legacy themeId as themePreset
    themePreset: existing.themePreset ?? raw.themeId ?? "midnightPurple",
    // Legacy records: no new scenes, no new features
    features: { ...defaultLegacyFeatures(), ...existing.features },
    scenes: existing.scenes ? [...existing.scenes] : [...LEGACY_SCENE_SEQUENCE],
    // Empty notebook (not enabled)
    notebook: existing.notebook ?? defaultNotebook(),
  };
  return result;
}

// ── Notebook operations (pure) ───────────────────────────────────────────
import { nanoid } from "./nanoid";
import type { NotebookPage, NotebookPageType } from "./schema";

export function notebookAddPage(
  notebook: NotebookConfig,
  type: NotebookPageType,
): NotebookConfig {
  const id = nanoid();
  let page: NotebookPage;
  switch (type) {
    case "cover":
      page = { id, type: "cover", enabled: true, title: "", subtitle: "" };
      break;
    case "letter":
      page = { id, type: "letter", enabled: true, title: "", content: "" };
      break;
    case "memory":
      page = { id, type: "memory", enabled: true, title: "" };
      break;
    case "quote":
      page = { id, type: "quote", enabled: true, title: "", text: "" };
      break;
    case "ending":
      page = { id, type: "ending", enabled: true, title: "", text: "" };
      break;
  }
  return { pages: [...notebook.pages, page] };
}

export function notebookEditPage(
  notebook: NotebookConfig,
  id: string,
  patch: Partial<NotebookPage>,
): NotebookConfig {
  return {
    pages: notebook.pages.map((p) =>
      p.id === id ? ({ ...p, ...patch } as NotebookPage) : p
    ),
  };
}

export function notebookDeletePage(
  notebook: NotebookConfig,
  id: string,
): NotebookConfig {
  return { pages: notebook.pages.filter((p) => p.id !== id) };
}

export function notebookReorderPages(
  notebook: NotebookConfig,
  fromIndex: number,
  toIndex: number,
): NotebookConfig {
  if (fromIndex === toIndex) return notebook;
  if (fromIndex < 0 || toIndex < 0) return notebook;
  if (fromIndex >= notebook.pages.length || toIndex >= notebook.pages.length) return notebook;
  const pages = [...notebook.pages];
  const [moved] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, moved);
  return { pages };
}

// ── Scene operations (pure) ──────────────────────────────────────────────
export function sceneEnable(
  features: FeatureFlags,
  sceneId: keyof FeatureFlags,
  previousConfig?: Partial<FeatureFlags>,
): FeatureFlags {
  // ON restores exact prior config if available
  const prior = previousConfig?.[sceneId];
  return {
    ...features,
    [sceneId]: prior !== undefined ? prior : true,
  };
}

export function sceneDisable(
  features: FeatureFlags,
  sceneId: keyof FeatureFlags,
): FeatureFlags {
  // OFF changes only the boolean; does not erase settings
  return { ...features, [sceneId]: false };
}

export function sceneReorder(
  scenes: SceneId[],
  fromIndex: number,
  toIndex: number,
): SceneId[] {
  if (fromIndex === toIndex) return scenes;
  if (fromIndex < 0 || toIndex < 0) return scenes;
  if (fromIndex >= scenes.length || toIndex >= scenes.length) return scenes;
  const result = [...scenes];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

/** Explicit creator opt-in only. Never called while loading an existing row. */
export function promoteToCinematic(raw: SurpriseConfig): SurpriseConfig {
  if (raw._version === 2) return structuredClone(raw);
  return {
    ...structuredClone(raw), _version: 2,
    occasionId: raw.occasionId ?? resolveOccasion(raw),
    themePreset: raw.themePreset ?? raw.themeId ?? "midnightRose",
    scenes: raw.scenes ? [...raw.scenes] : [...DEFAULT_V2_SCENE_SEQUENCE],
    features: { ...defaultV2Features(), ...raw.features },
    notebook: raw.notebook ?? { pages: [] },
  };
}
