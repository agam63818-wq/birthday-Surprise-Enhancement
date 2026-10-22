// ============================================================
//  SCENE REGISTRY — Single typed source of IDs, metadata,
//  validation schemas, occasion recommendations, and lazy
//  scene loaders.
//
//  Rules:
//  - Lightweight metadata only; no eager heavy imports
//  - No duplicate feature catalogs
//  - Occasion recommendations cannot block creator override
//  - Disabled scene must not render/progress/nav or load assets
// ============================================================

import { EXPERIENCE_SCENE_IDS } from "./schema";
import type { SceneId, OccasionId, FeatureFlags } from "./schema";
import type { ComponentType } from "react";

// ── Scene metadata ───────────────────────────────────────────────────────
export interface SceneMeta {
  id: SceneId;
  label: string;
  description: string;
  isLegacy: boolean;
  /** Whether this scene is the occasion hero (switches based on occasionType). */
  isOccasionHero?: boolean;
  /** Feature flag key that controls this scene. */
  featureKey?: keyof FeatureFlags;
  /** Occasions where this scene is recommended (not enforced). */
  recommendedFor?: OccasionId[];
  /** Whether this scene requires heavy assets (lazy loaded). */
  isHeavy: boolean;
  /** Emotional pacing role. */
  pacing?: "anticipation" | "curiosity" | "surprise" | "personalization" | "memories" | "emotion" | "reflection" | "bloom" | "final" | "transition";
}

// ── Registry ─────────────────────────────────────────────────────────────
export const SCENE_REGISTRY: Record<SceneId, SceneMeta> = {
  letters: { id: "letters", label: "Interactive Letters", description: "Open personal notes from your final letter lines", isLegacy: false, featureKey: "letters", isHeavy: true, pacing: "emotion" },
  heartTunnel: {
    id: "heartTunnel",
    label: "Heart Tunnel",
    description: "A cinematic heart tunnel with a personal anniversary or celebration letter",
    isLegacy: false,
    featureKey: "heartTunnel",
    isHeavy: true,
    pacing: "emotion",
    recommendedFor: ["birthday", "anniversary", "romantic", "loveday", "custom"],
  },
  loveConfession: {
    id: "loveConfession",
    label: "Love Confession",
    description: "A playful confession, secret letter, and heartfelt reveal",
    isLegacy: false,
    featureKey: "loveConfession",
    isHeavy: true,
    pacing: "surprise",
    recommendedFor: ["romantic", "loveday", "anniversary", "birthday", "custom"],
  },
  loveDrive: {
    id: "loveDrive",
    label: "Love Drive",
    description: "A 3D driving mission with hidden surprises and a birthday letter",
    isLegacy: false,
    featureKey: "loveDrive",
    isHeavy: true,
    pacing: "curiosity",
    recommendedFor: ["birthday", "anniversary", "romantic", "loveday", "custom"],
  },
  // ── Legacy scenes ──────────────────────────────────────────────────────
  landing: {
    id: "landing",
    featureKey: "landing",
    label: "Landing",
    description: "The opening page with title and button",
    isLegacy: true,
    isHeavy: false,
    pacing: "anticipation",
  },
  intro: {
    id: "intro",
    label: "Intro",
    description: "Personal introduction message",
    isLegacy: true,
    featureKey: "intro",
    isHeavy: false,
    pacing: "personalization",
  },
  cuteness: {
    id: "cuteness",
    label: "Cuteness Meter",
    description: "Playful cuteness scanning animation",
    isLegacy: true,
    featureKey: "cutenessMeter",
    isHeavy: false,
    pacing: "curiosity",
  },
  celebration: {
    id: "celebration",
    label: "Celebration",
    description: "Celebration cards and message",
    isLegacy: true,
    featureKey: "celebration",
    isHeavy: false,
    pacing: "surprise",
  },
  cake: {
    id: "cake",
    featureKey: "cake",
    label: "Occasion Hero",
    description: "Birthday cake / Rakhi / Family Day / Love Day hero",
    isLegacy: true,
    isOccasionHero: true,
    isHeavy: false,
    pacing: "surprise",
    recommendedFor: ["birthday", "rakshabandhan", "mothersday", "fathersday", "loveday", "romantic", "anniversary", "custom"],
  },
  rakhiHero: {
    id: "rakhiHero",
    featureKey: "rakhiHero",
    label: "Rakhi Hero",
    description: "Rakshabandhan hero page",
    isLegacy: true,
    isOccasionHero: true,
    isHeavy: false,
    pacing: "surprise",
    recommendedFor: ["rakshabandhan"],
  },
  familyHero: {
    id: "familyHero",
    featureKey: "familyHero",
    label: "Family Day Hero",
    description: "Father's Day / Mother's Day hero page",
    isLegacy: true,
    isOccasionHero: true,
    isHeavy: false,
    pacing: "surprise",
    recommendedFor: ["fathersday", "mothersday"],
  },
  loveDayHero: {
    id: "loveDayHero",
    featureKey: "loveDayHero",
    label: "Love Day Hero",
    description: "Love Day / Romantic hero page",
    isLegacy: true,
    isOccasionHero: true,
    isHeavy: false,
    pacing: "surprise",
    recommendedFor: ["loveday", "romantic"],
  },
  whyYouMatter: {
    id: "whyYouMatter",
    label: "Why You Matter",
    description: "Cards explaining why the recipient matters",
    isLegacy: true,
    featureKey: "whyYouMatter",
    isHeavy: false,
    pacing: "personalization",
  },
  ourStory: {
    id: "ourStory",
    label: "Our Story",
    description: "Timeline of shared moments",
    isLegacy: true,
    featureKey: "ourStory",
    isHeavy: false,
    pacing: "memories",
  },
  memoryWall: {
    id: "memoryWall",
    label: "Memory Wall",
    description: "Photo gallery of memories",
    isLegacy: true,
    featureKey: "memoryWall",
    isHeavy: false,
    pacing: "memories",
  },
  beforeLeave: {
    id: "beforeLeave",
    label: "Before You Leave",
    description: "Transition message before the final note",
    isLegacy: true,
    featureKey: "beforeLeave",
    isHeavy: false,
    pacing: "reflection",
  },
  lastNote: {
    id: "lastNote",
    label: "Last Note",
    description: "Final heartfelt message",
    isLegacy: true,
    featureKey: "lastNote",
    isHeavy: false,
    pacing: "final",
  },

  // ── New cinematic scenes ───────────────────────────────────────────────
  butterfly: {
    id: "butterfly",
    label: "Butterfly",
    description: "Romantic butterfly swarm with heart formation",
    isLegacy: false,
    featureKey: "butterfly",
    isHeavy: true,
    pacing: "emotion",
    recommendedFor: ["birthday", "romantic", "loveday", "anniversary", "friendship", "justbecause"],
  },
  giftReveal: {
    id: "giftReveal",
    label: "Gift Reveal",
    description: "Animated gift box opening with message reveal",
    isLegacy: false,
    featureKey: "giftReveal",
    isHeavy: true,
    pacing: "surprise",
    recommendedFor: ["birthday", "anniversary", "congratulations", "justbecause", "custom"],
  },
  youAndMe: {
    id: "youAndMe",
    label: "You & Me",
    description: "Particle heart formation with sender and recipient names",
    isLegacy: false,
    featureKey: "youAndMe",
    isHeavy: true,
    pacing: "emotion",
    recommendedFor: ["romantic", "loveday", "anniversary", "birthday", "friendship"],
  },
  notebook: {
    id: "notebook",
    label: "Notebook",
    description: "3D page-turn notebook with letters, memories, and quotes",
    isLegacy: false,
    featureKey: "notebook",
    isHeavy: true,
    pacing: "reflection",
    recommendedFor: ["birthday", "anniversary", "friendship", "romantic", "justbecause", "custom"],
  },
  roseBloom: {
    id: "roseBloom",
    label: "Rose Bloom",
    description: "Cinematic rose blooming with stem, leaves, and petals",
    isLegacy: false,
    featureKey: "roseBloom",
    isHeavy: true,
    pacing: "bloom",
    recommendedFor: ["romantic", "loveday", "anniversary", "mothersday", "birthday"],
  },
};

// ── Lazy loaders ─────────────────────────────────────────────────────────
// Returns a dynamic import promise for heavy scene components.
// Lightweight scenes return null (they're always bundled).
// This prevents disabled scene assets from being loaded.

export type LazySceneLoader = () => Promise<{ default: ComponentType<SceneComponentProps> }>;

export interface SceneComponentProps {
  onNext: () => void;
  onPrev?: () => void;
  isActive: boolean;
  reducedMotion: boolean;
  globalMuted: boolean;
}

export const SCENE_LAZY_LOADERS: Partial<Record<SceneId, LazySceneLoader>> = {
  letters: () => import("@/scenes/LettersScene"),
  heartTunnel: () => import("@/scenes/HeartTunnelScene"),
  loveConfession: () => import("@/scenes/LoveConfessionScene"),
  loveDrive: () => import("@/scenes/LoveDriveScene"),
  butterfly: () => import("@/scenes/ButterflyScene"),
  giftReveal: () => import("@/scenes/GiftRevealScene"),
  youAndMe: () => import("@/scenes/YouAndMeScene"),
  notebook: () => import("@/scenes/NotebookScene"),
  roseBloom: () => import("@/scenes/RoseBloomScene"),
};

// ── Validation ───────────────────────────────────────────────────────────
export function isValidSceneId(id: string): id is SceneId {
  return Object.prototype.hasOwnProperty.call(SCENE_REGISTRY, id);
}

export function isValidFeatureKey(key: string): key is keyof FeatureFlags {
  const validKeys: (keyof FeatureFlags)[] = [
    "letters", "landing", "cake", "rakhiHero", "familyHero", "loveDayHero",
    "intro", "cutenessMeter", "celebration", "memoryWall", "ourStory",
    "whyYouMatter", "beforeLeave", "lastNote",
    "butterfly", "giftReveal", "youAndMe", "notebook", "roseBloom",
    "heartTunnel", "loveConfession", "loveDrive",
  ];
  return validKeys.includes(key as keyof FeatureFlags);
}

// ── Occasion recommendations ─────────────────────────────────────────────
// Returns recommended scene IDs for an occasion. NOT enforced — creator
// can always override.
export function getRecommendedScenes(occasion: OccasionId): SceneId[] {
  return Object.values(SCENE_REGISTRY)
    .filter((meta) => meta.recommendedFor?.includes(occasion))
    .map((meta) => meta.id);
}

// ── Active sequence computation ──────────────────────────────────────────
// Existing scenes retain their historical "absent means enabled" behavior.
// Bundled experiences are different: an absent flag is always OFF.
export function isSceneEnabled(
  sceneId: SceneId,
  scenes: readonly SceneId[],
  features: FeatureFlags,
): boolean {
  if (!scenes.includes(sceneId) || !isValidSceneId(sceneId)) return false;
  const meta = SCENE_REGISTRY[sceneId];
  if (!meta.featureKey) return true;
  if ((EXPERIENCE_SCENE_IDS as readonly string[]).includes(sceneId)) {
    return features[meta.featureKey] === true;
  }
  return features[meta.featureKey] !== false;
}

/** Pure editor operation: enabling adds an absent scene; disabling preserves order/settings. */
export function setSceneEnabled(
  scenes: readonly SceneId[],
  features: FeatureFlags,
  sceneId: SceneId,
  enabled: boolean,
): { scenes: SceneId[]; features: FeatureFlags } {
  const meta = SCENE_REGISTRY[sceneId];
  // Disabling an absent scene is a no-op for ordering; only an explicit
  // enable may introduce a new ID into a saved sequence.
  const nextScenes = scenes.includes(sceneId) || !enabled ? [...scenes] : [...scenes, sceneId];
  if (!meta.featureKey) return { scenes: nextScenes, features: { ...features } };
  return {
    scenes: nextScenes,
    features: { ...features, [meta.featureKey]: enabled },
  };
}

// Given a scene list and feature flags, returns only the scenes that
// should actually render (enabled + valid).
export function computeActiveSequence(
  scenes: SceneId[],
  features: FeatureFlags,
): SceneId[] {
  return [...new Set(scenes)].filter((id) => isSceneEnabled(id, scenes, features));
}
