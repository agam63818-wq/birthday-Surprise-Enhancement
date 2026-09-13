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
  // ── Legacy scenes ──────────────────────────────────────────────────────
  landing: {
    id: "landing",
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
  butterfly: () => import("@/scenes/ButterflyScene"),
  giftReveal: () => import("@/scenes/GiftRevealScene"),
  youAndMe: () => import("@/scenes/YouAndMeScene"),
  notebook: () => import("@/scenes/NotebookScene"),
  roseBloom: () => import("@/scenes/RoseBloomScene"),
};

// ── Validation ───────────────────────────────────────────────────────────
export function isValidSceneId(id: string): id is SceneId {
  return id in SCENE_REGISTRY;
}

export function isValidFeatureKey(key: string): key is keyof FeatureFlags {
  const validKeys: (keyof FeatureFlags)[] = [
    "intro", "cutenessMeter", "celebration", "memoryWall", "ourStory",
    "whyYouMatter", "beforeLeave", "lastNote",
    "butterfly", "giftReveal", "youAndMe", "notebook", "roseBloom",
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
// Given a scene list and feature flags, returns only the scenes that
// should actually render (enabled + valid).
export function computeActiveSequence(
  scenes: SceneId[],
  features: FeatureFlags,
): SceneId[] {
  return scenes.filter((id) => {
    if (!isValidSceneId(id)) return false;
    const meta = SCENE_REGISTRY[id];
    if (!meta.featureKey) return true; // always-on scenes (landing, cake)
    return features[meta.featureKey] !== false;
  });
}
