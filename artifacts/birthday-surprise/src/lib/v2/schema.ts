// ============================================================
//  SURPRISE CONFIG v2 — Canonical runtime schema
//
//  This is the single source of truth for the SurpriseConfig
//  shape used at runtime. It is ADDITIVE over the existing
//  Config type from src/config.ts — all legacy fields are
//  preserved verbatim; new fields are optional so existing
//  DB rows keep working without any schema migration.
//
//  HARD RULES:
//  - No Supabase schema changes (tables/columns/RLS/RPCs)
//  - No changes to existing save payloads
//  - No auto-save on migration/read
//  - Legacy records retain legacy theme/sequence
//  - New cinematic scenes only for explicit new configuration
// ============================================================

export type { AudioPlaybackSettings, AudioPlaybackMap, AudioTrackId } from "../../../supabase/functions/_shared/audioPlayback";
import type { Config } from "@/config";
import type { ThemePresetId } from "@/lib/themePresets";
import type { FontPresetId } from "@/lib/fontPresets";

// ── Version discriminant ─────────────────────────────────────────────────
export type ConfigVersion = 1 | 2;

// ── Occasion IDs (extended from legacy) ─────────────────────────────────
export type OccasionId =
  | "birthday"
  | "anniversary"
  | "friendship"
  | "mothersday"
  | "fathersday"
  | "rakshabandhan"
  | "congratulations"
  | "romantic"
  | "justbecause"
  | "loveday"   // legacy alias → romantic
  | "custom";

// ── Scene IDs ────────────────────────────────────────────────────────────
// Legacy scenes (always present in v1 records):
export type LegacySceneId =
  | "landing"
  | "intro"
  | "cuteness"
  | "celebration"
  | "cake"          // occasion hero (birthday/custom)
  | "rakhiHero"     // occasion hero (rakshabandhan)
  | "familyHero"    // occasion hero (fathersday/mothersday)
  | "loveDayHero"   // occasion hero (loveday/romantic)
  | "whyYouMatter"
  | "ourStory"
  | "memoryWall"
  | "beforeLeave"
  | "lastNote";

// New cinematic scenes (v2 only, opt-in):
export type NewSceneId =
  | "letters"
  | "butterfly"
  | "giftReveal"
  | "youAndMe"
  | "notebook"
  | "roseBloom";

export type SceneId = LegacySceneId | NewSceneId;

/** Canonical scene key covering all legacy pages, occasion heroes, and v2 scenes. */
export type SceneKey = SceneId;

// ── Stickers config (additive across v1 + v2) ────────────────────────────
export type StickerEntryMode = "none" | "fade" | "pop";

export interface StickerPlacement {
  uid: string;
  stickerId: string;
  /** Horizontal center position relative to scene box (0..1). */
  x: number;
  /** Vertical center position relative to scene box (0..1). */
  y: number;
  /** Width as fraction of scene width (0.05..0.9); height derived from manifest aspect. */
  w: number;
  /** Rotation angle in degrees (-180..180). */
  rotate: number;
  /** Layer stacking index within the scene's StickerLayer. */
  z: number;
  /** Optional horizontal mirror flip. */
  flipX?: boolean;
  /** Optional entry animation mode (only "fade" implemented in Part 2; "none" skips fade). */
  entry?: StickerEntryMode;
}

export interface SceneStickersConfig {
  enabled: boolean;
  items: StickerPlacement[];
}

export interface StickersConfig {
  version: 1;
  scenes: Partial<Record<SceneKey, SceneStickersConfig>>;
}

// ── Feature flags ────────────────────────────────────────────────────────
export interface FeatureFlags {
  letters?: boolean;
  landing?: boolean;
  cake?: boolean;
  rakhiHero?: boolean;
  familyHero?: boolean;
  loveDayHero?: boolean;
  // Legacy features (always true for v1 records)
  intro: boolean;
  cutenessMeter: boolean;
  celebration: boolean;
  memoryWall: boolean;
  ourStory: boolean;
  whyYouMatter: boolean;
  beforeLeave: boolean;
  lastNote: boolean;

  // New cinematic scenes (default false for legacy records)
  butterfly: boolean;
  giftReveal: boolean;
  youAndMe: boolean;
  notebook: boolean;
  roseBloom: boolean;
}

// ── Notebook page types ──────────────────────────────────────────────────
export type NotebookPageType = "cover" | "letter" | "memory" | "quote" | "ending";

export interface NotebookPageBase {
  id: string;
  type: NotebookPageType;
  enabled: boolean;
}

export interface NotebookCoverPage extends NotebookPageBase {
  type: "cover";
  title: string;
  subtitle: string;
}

export interface NotebookLetterPage extends NotebookPageBase {
  type: "letter";
  title: string;
  content: string;
}

export interface NotebookMemoryPage extends NotebookPageBase {
  type: "memory";
  title: string;
  image?: string;
  caption?: string;
}

export interface NotebookQuotePage extends NotebookPageBase {
  type: "quote";
  title: string;
  text: string;
}

export interface NotebookEndingPage extends NotebookPageBase {
  type: "ending";
  title: string;
  text: string;
}

export type NotebookPage =
  | NotebookCoverPage
  | NotebookLetterPage
  | NotebookMemoryPage
  | NotebookQuotePage
  | NotebookEndingPage;

// ── Notebook config ──────────────────────────────────────────────────────
export interface NotebookConfig {
  pages: NotebookPage[];
}

// ── Rose Bloom config ────────────────────────────────────────────────────
export interface RoseBloomConfig {
  text?: string;
  speed?: "slow" | "normal" | "fast";
  intensity?: "subtle" | "normal" | "dramatic";
  fallingPetals?: boolean;
  soundEnabled?: boolean;
}

// ── Butterfly config ─────────────────────────────────────────────────────
export interface ButterflyConfig {
  message?: string;
  subMessage?: string;
}

// ── Gift Reveal config ───────────────────────────────────────────────────
export interface GiftRevealConfig {
  occasionText?: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
  photoUrl?: string;
}

// ── You & Me config ──────────────────────────────────────────────────────
export interface YouAndMeConfig {
  name1?: string;
  name2?: string;
}

// ── Midnight Rose theme tokens ───────────────────────────────────────────
// Applied only when themeId === "midnightRose" (new v2 preset)
// Scoped to the experience; dashboard/auth/payment are NOT rethemed.
export type ExtendedThemePresetId = ThemePresetId | "midnightRose";

// ── v2 extension fields (all optional — safe for legacy records) ─────────
export interface SurpriseConfigV2Extension {
  /** Schema version. Absent = v1 (legacy). */
  _version?: ConfigVersion;

  /** Extended occasion IDs (superset of legacy occasionType). */
  occasionId?: OccasionId;

  /** Ordered scene IDs for the experience. Absent = legacy fixed sequence. */
  scenes?: SceneId[];

  /** Feature flags. Absent = all legacy features on, new scenes off. */
  features?: Partial<FeatureFlags>;

  /** Extended theme preset (includes midnightRose). */
  themePreset?: ExtendedThemePresetId;

  /** Notebook configuration. */
  notebook?: NotebookConfig;

  /** Rose Bloom configuration. */
  roseBloom?: RoseBloomConfig;

  /** Butterfly configuration. */
  butterfly?: ButterflyConfig;

  /** Gift Reveal configuration. */
  giftReveal?: GiftRevealConfig;

  /** You & Me configuration. */
  youAndMe?: YouAndMeConfig;

  /** Per-page font overrides (extended to include new scenes). */
  textStyles?: Partial<Record<string, FontPresetId>>;

  /** Optional per-scene sticker placements (additive across both v1 and v2 configs). */
  stickers?: StickersConfig;

  /** Unknown extension data preserved without execution. */
  _ext?: Record<string, unknown>;
}

// ── Canonical SurpriseConfig (v1 + v2 extension) ────────────────────────
// This is the runtime type. It is a strict superset of the existing Config
// type — all existing fields are preserved, new fields are optional.
export type SurpriseConfig = Config & SurpriseConfigV2Extension;

// ── Normalized runtime config (always fully resolved) ───────────────────
// After normalization, all optional fields have safe defaults.
// This is what the scene engine and components consume.
export interface NormalizedConfig {
  version: ConfigVersion;
  occasion: OccasionId;
  recipient: { name: string; photo?: string };
  sender: { name: string };
  theme: {
    preset: ExtendedThemePresetId;
    legacyThemeId?: ThemePresetId;
  };
  features: FeatureFlags;
  scenes: SceneId[];
  audio: {
    music: string;
    musicVolume: number;
    muted: boolean;
    soundEffectsEnabled: boolean;
    birthdaySong: string;
    useFallbackTones: boolean;
  };
  notebook: NotebookConfig;
  roseBloom: RoseBloomConfig;
  butterfly: ButterflyConfig;
  giftReveal: GiftRevealConfig;
  youAndMe: YouAndMeConfig;
  /** The original raw config, preserved for legacy page rendering. */
  raw: SurpriseConfig;
}
