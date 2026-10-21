import defaultConfig from "@/config";
import { migrateV1ToV2, normalizeConfig } from "@/lib/v2/migrate";
import { SCENE_REGISTRY } from "@/lib/v2/registry";
import type { StickersConfig, SurpriseConfig } from "@/lib/v2/schema";
import { describe, expect, it } from "vitest";
import { createSeededStickerFixture } from "./fixtures";
import {
  addStickerPlacement,
  ALL_SCENE_KEYS,
  getSceneStickers,
  MAX_STICKERS_PER_SCENE,
  normalizeSceneKeyAlias,
  normalizeStickersConfig,
  removeStickerPlacement,
  reorderStickerPlacements,
  resolveActiveSceneKey,
  resolveHeroSceneKey,
  sanitizePlacement,
  setSceneStickersEnabled,
  updateStickerPlacement,
} from "../model";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

describe("Sticker model — schema coverage & legacy safety", () => {
  it("does not ship fake stickers in defaultConfig and leaves legacy configs completely unchanged", () => {
    expect(defaultConfig).not.toHaveProperty("stickers");
    expect((defaultConfig as SurpriseConfig).stickers).toBeUndefined();

    const frozenLegacy = deepFreeze(structuredClone(defaultConfig) as SurpriseConfig);
    expect(normalizeStickersConfig(frozenLegacy.stickers)).toBeUndefined();

    const normalized = normalizeConfig(frozenLegacy);
    expect(normalized.version).toBe(1);
    expect(normalized.raw.stickers).toBeUndefined();

    const migrated = migrateV1ToV2(frozenLegacy);
    expect(migrated.stickers).toBeUndefined();

    for (const sceneKey of ALL_SCENE_KEYS) {
      expect(getSceneStickers(frozenLegacy, sceneKey)).toEqual([]);
    }
  });

  it("covers all 19 scenes from BirthdayExperience PAGES, occasion heroes, and SCENE_REGISTRY", () => {
    const registryIds = Object.keys(SCENE_REGISTRY).sort();
    expect([...ALL_SCENE_KEYS].sort()).toEqual(registryIds);

    const legacyPages = [
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
      "rakhiHero",
      "familyHero",
      "loveDayHero",
    ] as const;

    const v2Scenes = [
      "letters",
      "butterfly",
      "giftReveal",
      "youAndMe",
      "notebook",
      "roseBloom",
    ] as const;

    for (const id of [...legacyPages, ...v2Scenes]) {
      expect(ALL_SCENE_KEYS).toContain(id);
    }

    expect(normalizeSceneKeyAlias("cutenessMeter")).toBe("cuteness");
    expect(normalizeSceneKeyAlias("unknownScene")).toBeUndefined();
  });

  it("maps legacy occasion hero aliases accurately across both directions", () => {
    expect(resolveHeroSceneKey("birthday")).toBe("cake");
    expect(resolveHeroSceneKey("custom")).toBe("cake");
    expect(resolveHeroSceneKey("rakshabandhan")).toBe("rakhiHero");
    expect(resolveHeroSceneKey("fathersday")).toBe("familyHero");
    expect(resolveHeroSceneKey("mothersday")).toBe("familyHero");
    expect(resolveHeroSceneKey("loveday")).toBe("loveDayHero");
    expect(resolveHeroSceneKey("romantic")).toBe("loveDayHero");
    expect(resolveHeroSceneKey("anniversary")).toBe("loveDayHero");

    expect(resolveActiveSceneKey("cake", "rakshabandhan")).toBe("rakhiHero");
    expect(resolveActiveSceneKey("cake", "mothersday")).toBe("familyHero");
    expect(resolveActiveSceneKey("cake", "loveday")).toBe("loveDayHero");
    expect(resolveActiveSceneKey("cake", "birthday")).toBe("cake");

    // Stickers saved under rakhiHero resolve when queried via generic "cake" on rakshabandhan
    const rakhiCfg: SurpriseConfig = {
      ...(structuredClone(defaultConfig) as SurpriseConfig),
      occasionType: "rakshabandhan",
      stickers: {
        version: 1,
        scenes: {
          rakhiHero: {
            enabled: true,
            items: [{ uid: "r1", stickerId: "kitty-07", x: 0.5, y: 0.5, w: 0.2, rotate: 0, z: 0 }],
          },
        },
      },
    };
    expect(getSceneStickers(rakhiCfg, "cake").map((s) => s.uid)).toEqual(["r1"]);
    expect(getSceneStickers(rakhiCfg, "rakhiHero").map((s) => s.uid)).toEqual(["r1"]);
    expect(getSceneStickers(rakhiCfg, "familyHero")).toEqual([]);

    // Stickers saved under generic "cake" also appear when active hero resolves to "rakhiHero"
    const genericCakeOnRakhi: SurpriseConfig = {
      ...(structuredClone(defaultConfig) as SurpriseConfig),
      occasionType: "rakshabandhan",
      stickers: {
        version: 1,
        scenes: {
          cake: {
            enabled: true,
            items: [{ uid: "c1", stickerId: "kitty-06", x: 0.5, y: 0.5, w: 0.25, rotate: 0, z: 0 }],
          },
        },
      },
    };
    expect(getSceneStickers(genericCakeOnRakhi, "rakhiHero").map((s) => s.uid)).toEqual(["c1"]);
  });
});

describe("Sticker model — sanitization, clamping, unknown IDs, disabled state & immutability", () => {
  it("clamps x/y/w/rotate ranges and drops malformed placements", () => {
    const clampedLow = sanitizePlacement({
      uid: "low",
      stickerId: "kitty-01",
      x: -2.5,
      y: -0.1,
      w: 0.001,
      rotate: -540,
      z: 2,
    });
    expect(clampedLow).toEqual({
      uid: "low",
      stickerId: "kitty-01",
      x: 0,
      y: 0,
      w: 0.05,
      rotate: -180,
      z: 2,
    });

    const clampedHigh = sanitizePlacement({
      uid: "high",
      stickerId: "kitty-22",
      x: 3.2,
      y: 1.5,
      w: 2.0,
      rotate: 360,
      z: 5,
      flipX: true,
      entry: "fade",
    });
    expect(clampedHigh).toEqual({
      uid: "high",
      stickerId: "kitty-22",
      x: 1,
      y: 1,
      w: 0.9,
      rotate: 180,
      z: 5,
      flipX: true,
      entry: "fade",
    });

    expect(sanitizePlacement(null)).toBeNull();
    expect(sanitizePlacement("not-an-object")).toBeNull();
    expect(sanitizePlacement({ uid: "bad-x", stickerId: "kitty-01", x: Number.NaN, y: 0.5, w: 0.2 })).toBeNull();
    expect(sanitizePlacement({ uid: "bad-w", stickerId: "kitty-01", x: 0.5, y: 0.5, w: "wide" })).toBeNull();
  });

  it("silently skips unknown stickerIds without failing or affecting valid siblings", () => {
    expect(
      sanitizePlacement({
        uid: "ghost",
        stickerId: "kitty-removed-99",
        x: 0.5,
        y: 0.5,
        w: 0.2,
        rotate: 0,
        z: 0,
      }),
    ).toBeNull();

    const cfg: SurpriseConfig = {
      ...(structuredClone(defaultConfig) as SurpriseConfig),
      stickers: {
        version: 1,
        scenes: {
          intro: {
            enabled: true,
            items: [
              { uid: "valid-1", stickerId: "kitty-02", x: 0.2, y: 0.3, w: 0.2, rotate: 0, z: 1 },
              { uid: "removed-1", stickerId: "kitty-does-not-exist", x: 0.5, y: 0.5, w: 0.2, rotate: 0, z: 2 },
              { uid: "valid-2", stickerId: "kitty-11", x: 0.8, y: 0.7, w: 0.15, rotate: -12, z: 3 },
            ],
          },
        },
      },
    };

    const resolved = getSceneStickers(cfg, "intro");
    expect(resolved.map((i) => i.uid)).toEqual(["valid-1", "valid-2"]);
  });

  it("caps stickers per scene strictly at 8 in both normalization and addStickerPlacement", () => {
    const rawEleven = Array.from({ length: 11 }, (_, i) => ({
      uid: `u-${i}`,
      stickerId: "kitty-11",
      x: 0.1 * (i % 9),
      y: 0.5,
      w: 0.15,
      rotate: 0,
      z: i,
    }));

    const normalized = normalizeStickersConfig({
      version: 1,
      scenes: { celebration: { enabled: true, items: rawEleven } },
    });
    expect(normalized?.scenes.celebration?.items).toHaveLength(MAX_STICKERS_PER_SCENE);

    let state: StickersConfig | undefined;
    for (let i = 0; i < 12; i++) {
      state = addStickerPlacement(state, "intro", {
        uid: `added-${i}`,
        stickerId: "kitty-04",
        x: 0.5,
        y: 0.5,
        w: 0.2,
      });
    }
    expect(state?.scenes.intro?.items).toHaveLength(8);
  });

  it("returns [] when a scene is disabled while retaining its saved items in config", () => {
    let state = addStickerPlacement(undefined, "memoryWall", {
      uid: "mem-1",
      stickerId: "kitty-08",
      x: 0.25,
      y: 0.75,
      w: 0.2,
      rotate: -5,
    });
    state = addStickerPlacement(state, "memoryWall", {
      uid: "mem-2",
      stickerId: "kitty-19",
      x: 0.75,
      y: 0.25,
      w: 0.18,
      rotate: 8,
    });

    const disabledState = setSceneStickersEnabled(deepFreeze(state), "memoryWall", false);
    expect(disabledState.scenes.memoryWall?.enabled).toBe(false);
    expect(disabledState.scenes.memoryWall?.items).toHaveLength(2);

    const cfgDisabled: SurpriseConfig = {
      ...(structuredClone(defaultConfig) as SurpriseConfig),
      stickers: disabledState,
    };
    expect(getSceneStickers(cfgDisabled, "memoryWall")).toEqual([]);

    const reEnabled = setSceneStickersEnabled(deepFreeze(disabledState), "memoryWall", true);
    expect(
      getSceneStickers({ ...(structuredClone(defaultConfig) as SurpriseConfig), stickers: reEnabled }, "memoryWall").map(
        (i) => i.uid,
      ),
    ).toEqual(["mem-1", "mem-2"]);
  });

  it("maintains strict per-scene independence, immutability, and JSON round-trip integrity", () => {
    let state = addStickerPlacement(undefined, "intro", {
      uid: "intro-a",
      stickerId: "kitty-01",
      x: 0.2,
      y: 0.3,
      w: 0.2,
      rotate: -10,
    });
    state = addStickerPlacement(deepFreeze(state), "intro", {
      uid: "intro-b",
      stickerId: "kitty-05",
      x: 0.7,
      y: 0.6,
      w: 0.25,
      rotate: 15,
    });
    state = addStickerPlacement(deepFreeze(state), "roseBloom", {
      uid: "rose-a",
      stickerId: "kitty-21",
      x: 0.8,
      y: 0.8,
      w: 0.22,
      rotate: 5,
    });

    // Update intro-a without affecting intro-b or roseBloom
    const updated = updateStickerPlacement(deepFreeze(state), "intro", "intro-a", {
      x: 1.5, // clamped -> 1
      rotate: 45,
      flipX: true,
    });
    expect(updated.scenes.intro?.items[0].x).toBe(1);
    expect(updated.scenes.intro?.items[0].rotate).toBe(45);
    expect(updated.scenes.intro?.items[0].flipX).toBe(true);
    expect(updated.scenes.roseBloom?.items).toEqual(state.scenes.roseBloom?.items);

    // Reorder intro items and check z normalization
    const reordered = reorderStickerPlacements(deepFreeze(updated), "intro", 0, 1);
    expect(reordered.scenes.intro?.items.map((i) => ({ uid: i.uid, z: i.z }))).toEqual([
      { uid: "intro-b", z: 0 },
      { uid: "intro-a", z: 1 },
    ]);

    // Remove one item from intro without touching roseBloom
    const afterRemove = removeStickerPlacement(deepFreeze(reordered), "intro", "intro-b");
    expect(afterRemove.scenes.intro?.items.map((i) => i.uid)).toEqual(["intro-a"]);
    expect(afterRemove.scenes.roseBloom?.items.map((i) => i.uid)).toEqual(["rose-a"]);

    // Full JSON round-trip of seeded V2 fixture config
    const fixture = createSeededStickerFixture("v2");
    fixture.stickers = afterRemove;
    const roundTripped = JSON.parse(JSON.stringify(fixture)) as SurpriseConfig;
    expect(roundTripped.stickers).toEqual(afterRemove);
    expect(getSceneStickers(roundTripped, "intro").map((i) => i.uid)).toEqual(["intro-a"]);
    expect(getSceneStickers(roundTripped, "roseBloom").map((i) => i.uid)).toEqual(["rose-a"]);
    expect(getSceneStickers(roundTripped, "butterfly")).toEqual([]);
  });
});
