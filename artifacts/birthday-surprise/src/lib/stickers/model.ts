// ============================================================
//  STICKER DATA MODEL — Pure, deterministic, immutable helpers
//
//  Rules:
//  - NEVER mutate inputs; always return fresh objects/arrays
//  - Legacy configs without `stickers` stay untouched (`undefined`)
//  - Unknown `stickerId`s are dropped/skipped silently
//  - Invalid placements are dropped; out-of-range numbers are clamped
//  - Max 8 placements per scene
//  - Disabled scenes return [] at runtime while keeping saved items
// ============================================================

import { nanoid } from "@/lib/v2/nanoid";
import { isValidSceneId } from "@/lib/v2/registry";
import type {
  SceneKey,
  SceneStickersConfig,
  StickerEntryMode,
  StickerPlacement,
  StickersConfig,
  SurpriseConfig,
} from "@/lib/v2/schema";
import { getStickerById } from "./manifest";

export const STICKERS_VERSION = 1 as const;
export const MAX_STICKERS_PER_SCENE = 8 as const;

export const STICKER_X_MIN = 0;
export const STICKER_X_MAX = 1;
export const STICKER_Y_MIN = 0;
export const STICKER_Y_MAX = 1;
export const STICKER_W_MIN = 0.05;
export const STICKER_W_MAX = 0.9;
export const STICKER_ROTATE_MIN = -180;
export const STICKER_ROTATE_MAX = 180;
export const DEFAULT_STICKER_WIDTH = 0.22;

export const ALL_SCENE_KEYS: readonly SceneKey[] = [
  // Legacy flow scenes (BirthdayExperience PAGES + occasion heroes)
  "landing",
  "intro",
  "cuteness",
  "celebration",
  "cake",
  "rakhiHero",
  "familyHero",
  "loveDayHero",
  "whyYouMatter",
  "ourStory",
  "memoryWall",
  "beforeLeave",
  "lastNote",
  // V2 cinematic scenes
  "letters",
  "butterfly",
  "giftReveal",
  "youAndMe",
  "notebook",
  "roseBloom",
  "heartTunnel",
  "loveConfession",
  "loveDrive",
] as const;

/** Love Drive owns the full game surface; decorative host stickers are never mounted there. */
export const STICKERS_DISABLED_SCENE_KEYS: readonly SceneKey[] = ["loveDrive"];
export function areStickersSupported(sceneKey: SceneKey | string): boolean {
  return !(STICKERS_DISABLED_SCENE_KEYS as readonly string[]).includes(sceneKey);
}

const VALID_ENTRY_MODES = new Set<StickerEntryMode>(["none", "fade", "pop"]);
const OCCASION_HERO_KEYS = new Set<SceneKey>([
  "cake",
  "rakhiHero",
  "familyHero",
  "loveDayHero",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function clamp(value: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return Object.is(clamped, -0) ? 0 : clamped;
}

export function isValidSceneKey(key: unknown): key is SceneKey {
  return typeof key === "string" && isValidSceneId(key);
}

/**
 * Normalizes a raw scene identifier into a canonical SceneKey, handling
 * legacy feature naming aliases (e.g. "cutenessMeter" -> "cuteness").
 */
export function normalizeSceneKeyAlias(rawKey: string): SceneKey | undefined {
  if (isValidSceneKey(rawKey)) return rawKey;
  if (rawKey === "cutenessMeter") return "cuteness";
  return undefined;
}

/**
 * Maps an occasion ID/type to the concrete hero SceneKey rendered at runtime
 * for the "cake" hero slot (matching BirthdayExperience.renderHeroPage).
 */
export function resolveHeroSceneKey(
  occasion?: string | null,
): "cake" | "rakhiHero" | "familyHero" | "loveDayHero" {
  switch (occasion) {
    case "rakshabandhan":
      return "rakhiHero";
    case "fathersday":
    case "mothersday":
      return "familyHero";
    case "loveday":
    case "romantic":
    case "anniversary":
      return "loveDayHero";
    case "birthday":
    case "custom":
    default:
      return "cake";
  }
}

/**
 * Resolves the active scene key for runtime rendering, expanding the generic
 * "cake" slot into the occasion-specific hero key when applicable.
 */
export function resolveActiveSceneKey(
  sceneId: string,
  occasion?: string | null,
): SceneKey | undefined {
  if (sceneId === "cake") return resolveHeroSceneKey(occasion);
  return normalizeSceneKeyAlias(sceneId);
}

function getEffectiveOccasion(
  config?: Pick<SurpriseConfig, "occasionId" | "occasionType"> | null,
): string {
  return config?.occasionId ?? config?.occasionType ?? "birthday";
}

/**
 * Validates and clamps a single sticker placement.
 * Returns null if the object is malformed or references an unknown stickerId.
 */
export function sanitizePlacement(
  input: unknown,
  fallbackZ = 0,
): StickerPlacement | null {
  if (!isPlainObject(input)) return null;

  const stickerId = input.stickerId;
  if (typeof stickerId !== "string" || !getStickerById(stickerId)) {
    return null;
  }

  if (
    typeof input.x !== "number" ||
    Number.isNaN(input.x) ||
    typeof input.y !== "number" ||
    Number.isNaN(input.y) ||
    typeof input.w !== "number" ||
    Number.isNaN(input.w)
  ) {
    return null;
  }

  const rawRotate = input.rotate === undefined ? 0 : input.rotate;
  if (typeof rawRotate !== "number" || Number.isNaN(rawRotate)) {
    return null;
  }

  const rawZ = input.z === undefined ? fallbackZ : input.z;
  if (typeof rawZ !== "number" || Number.isNaN(rawZ)) {
    return null;
  }

  const uid =
    typeof input.uid === "string" && input.uid.trim().length > 0
      ? input.uid.trim()
      : nanoid();

  const normalized: StickerPlacement = {
    uid,
    stickerId,
    x: clamp(input.x, STICKER_X_MIN, STICKER_X_MAX),
    y: clamp(input.y, STICKER_Y_MIN, STICKER_Y_MAX),
    w: clamp(input.w, STICKER_W_MIN, STICKER_W_MAX),
    rotate: clamp(rawRotate, STICKER_ROTATE_MIN, STICKER_ROTATE_MAX),
    z: Number.isFinite(rawZ) ? Math.trunc(rawZ) : fallbackZ,
  };

  if (typeof input.flipX === "boolean") {
    normalized.flipX = input.flipX;
  }
  if (
    typeof input.entry === "string" &&
    VALID_ENTRY_MODES.has(input.entry as StickerEntryMode)
  ) {
    normalized.entry = input.entry as StickerEntryMode;
  }

  return normalized;
}

/**
 * Sanitizes a single scene's sticker bucket (preserving `enabled: false` and
 * saved valid items up to MAX_STICKERS_PER_SCENE).
 */
export function normalizeSceneStickers(
  sceneInput: unknown,
): SceneStickersConfig | undefined {
  if (!isPlainObject(sceneInput)) return undefined;

  const enabled =
    typeof sceneInput.enabled === "boolean" ? sceneInput.enabled : true;
  const rawItems = Array.isArray(sceneInput.items) ? sceneInput.items : [];

  const seenUids = new Set<string>();
  const items: StickerPlacement[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const clean = sanitizePlacement(rawItems[i], i);
    if (!clean) continue;
    let uid = clean.uid;
    while (seenUids.has(uid)) {
      uid = nanoid();
    }
    seenUids.add(uid);
    items.push(uid === clean.uid ? clean : { ...clean, uid });
    if (items.length >= MAX_STICKERS_PER_SCENE) break;
  }

  return { enabled, items };
}

/**
 * Pure top-level sanitizer for `config.stickers`.
 * Returns `undefined` when absent so legacy configs remain byte-for-byte unchanged.
 */
export function normalizeStickersConfig(
  stickersInput: unknown,
): StickersConfig | undefined {
  if (stickersInput === undefined || stickersInput === null) {
    return undefined;
  }
  if (!isPlainObject(stickersInput)) {
    return undefined;
  }
  if (
    stickersInput.version !== undefined &&
    stickersInput.version !== STICKERS_VERSION
  ) {
    return undefined;
  }

  const scenesOut: Partial<Record<SceneKey, SceneStickersConfig>> = {};
  const rawScenes = isPlainObject(stickersInput.scenes)
    ? stickersInput.scenes
    : {};

  for (const [rawKey, rawBucket] of Object.entries(rawScenes)) {
    const key = normalizeSceneKeyAlias(rawKey);
    if (!key) continue;
    // Canonical key takes precedence over legacy alias if both exist
    if (key !== rawKey && Object.prototype.hasOwnProperty.call(rawScenes, key)) {
      continue;
    }
    const normalizedBucket = normalizeSceneStickers(rawBucket);
    if (normalizedBucket) {
      scenesOut[key] = normalizedBucket;
    }
  }

  return {
    version: STICKERS_VERSION,
    scenes: scenesOut,
  };
}

/**
 * Returns the active, sanitized, z-ordered StickerPlacement array for a scene.
 * - Legacy configs without `stickers` -> []
 * - Disabled scenes (`enabled: false`) -> [] (saved items remain intact in config)
 * - Unknown `stickerId`s -> skipped silently
 * - Hero alias aware between "cake" and the active occasion's hero key
 */
export function getSceneStickers(
  config:
    | Pick<SurpriseConfig, "stickers" | "occasionId" | "occasionType">
    | null
    | undefined,
  sceneKey: SceneKey | string,
): StickerPlacement[] {
  if (!areStickersSupported(sceneKey)) return [];
  const normalized = normalizeStickersConfig(config?.stickers);
  if (!normalized) return [];

  const canonicalKey = normalizeSceneKeyAlias(sceneKey);
  if (!canonicalKey) return [];

  const scenes = normalized.scenes;
  let bucket = scenes[canonicalKey];

  if (!bucket && OCCASION_HERO_KEYS.has(canonicalKey)) {
    const activeHero = resolveHeroSceneKey(getEffectiveOccasion(config));
    if (canonicalKey === "cake" && activeHero !== "cake") {
      bucket = scenes[activeHero];
    } else if (canonicalKey === activeHero) {
      bucket = scenes.cake;
    }
  }

  if (!bucket || !bucket.enabled || bucket.items.length === 0) {
    return [];
  }

  return bucket.items
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => (a.item.z !== b.item.z ? a.item.z - b.item.z : a.idx - b.idx))
    .map(({ item }) => ({ ...item }));
}

export interface NewStickerPlacementInput {
  uid?: string;
  stickerId: string;
  x?: number;
  y?: number;
  w?: number;
  rotate?: number;
  z?: number;
  flipX?: boolean;
  entry?: StickerEntryMode;
}

export type StickerPlacementPatch = Partial<Omit<StickerPlacement, "uid">>;

function ensureEditableStickers(stickers?: StickersConfig): StickersConfig {
  return (
    normalizeStickersConfig(stickers) ?? {
      version: STICKERS_VERSION,
      scenes: {},
    }
  );
}

/**
 * Purely adds a sticker placement to `sceneKey` (capped at 8 items per scene).
 * No-ops safely if `stickerId` is unknown or the scene cap has been reached.
 */
export function addStickerPlacement(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  input: NewStickerPlacementInput,
): StickersConfig {
  const base = ensureEditableStickers(stickers);
  const existing = base.scenes[sceneKey];
  const currentItems = existing ? [...existing.items] : [];

  if (currentItems.length >= MAX_STICKERS_PER_SCENE) {
    return base;
  }

  const nextZ =
    input.z !== undefined
      ? input.z
      : currentItems.reduce((max, item) => Math.max(max, item.z), -1) + 1;

  const created = sanitizePlacement(
    {
      uid: input.uid ?? nanoid(),
      stickerId: input.stickerId,
      x: input.x ?? 0.5,
      y: input.y ?? 0.5,
      w: input.w ?? DEFAULT_STICKER_WIDTH,
      rotate: input.rotate ?? 0,
      z: nextZ,
      flipX: input.flipX,
      entry: input.entry,
    },
    nextZ,
  );

  if (!created) {
    return base;
  }

  return {
    version: STICKERS_VERSION,
    scenes: {
      ...base.scenes,
      [sceneKey]: {
        enabled: existing ? existing.enabled : true,
        items: [...currentItems, created],
      },
    },
  };
}

/**
 * Purely updates a sticker placement matching `uid` within `sceneKey`,
 * clamping any updated coordinates/dimensions/rotation.
 */
export function updateStickerPlacement(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  uid: string,
  patch: StickerPlacementPatch,
): StickersConfig {
  const base = ensureEditableStickers(stickers);
  const existing = base.scenes[sceneKey];
  if (!existing) return base;

  let changed = false;
  const nextItems = existing.items.map((item) => {
    if (item.uid !== uid) return item;
    const candidate = sanitizePlacement({ ...item, ...patch, uid: item.uid }, item.z);
    if (!candidate) return item;
    changed = true;
    return candidate;
  });

  if (!changed) return base;

  return {
    version: STICKERS_VERSION,
    scenes: {
      ...base.scenes,
      [sceneKey]: {
        ...existing,
        items: nextItems,
      },
    },
  };
}

/**
 * Purely removes a single sticker placement by `uid` from `sceneKey`.
 */
export function removeStickerPlacement(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  uid: string,
): StickersConfig {
  const base = ensureEditableStickers(stickers);
  const existing = base.scenes[sceneKey];
  if (!existing) return base;

  const nextItems = existing.items.filter((item) => item.uid !== uid);
  if (nextItems.length === existing.items.length) return base;

  return {
    version: STICKERS_VERSION,
    scenes: {
      ...base.scenes,
      [sceneKey]: {
        ...existing,
        items: nextItems,
      },
    },
  };
}

/**
 * Purely reorders placements in `sceneKey` and normalizes `z` indices to match
 * the resulting visual stack order.
 */
export function reorderStickerPlacements(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  fromIndex: number,
  toIndex: number,
): StickersConfig {
  const base = ensureEditableStickers(stickers);
  const existing = base.scenes[sceneKey];
  if (!existing) return base;

  const len = existing.items.length;
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= len ||
    toIndex >= len
  ) {
    return base;
  }

  const movedList = [...existing.items];
  const [moved] = movedList.splice(fromIndex, 1);
  movedList.splice(toIndex, 0, moved);

  const reindexed = movedList.map((item, idx) => ({ ...item, z: idx }));

  return {
    version: STICKERS_VERSION,
    scenes: {
      ...base.scenes,
      [sceneKey]: {
        ...existing,
        items: reindexed,
      },
    },
  };
}

/**
 * Purely toggles `enabled` for `sceneKey` without erasing saved placements.
 */
export function setSceneStickersEnabled(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  enabled: boolean,
): StickersConfig {
  const base = ensureEditableStickers(stickers);
  const existing = base.scenes[sceneKey];
  return {
    version: STICKERS_VERSION,
    scenes: {
      ...base.scenes,
      [sceneKey]: {
        enabled,
        items: existing ? [...existing.items] : [],
      },
    },
  };
}
