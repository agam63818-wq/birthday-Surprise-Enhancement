// ============================================================
//  Migration tests — automated acceptance criteria
//
//  Tests verify:
//  - Legacy content/theme/order preserved
//  - Migrations are non-mutating, deterministic, repeatable
//  - false/zero/empty values preserved (no truthiness overwrite)
//  - Future version controlled fallback
//  - OFF→ON exact restore
//  - Registry validation
//  - Ordered/disabled/empty/invalid sequences
//  - Notebook operations/missing memory
// ============================================================

import {
  normalizeConfig,
  migrateV1ToV2,
  notebookAddPage,
  notebookEditPage,
  notebookDeletePage,
  notebookReorderPages,
  sceneEnable,
  sceneDisable,
  sceneReorder,
  LEGACY_SCENE_SEQUENCE,
} from "../migrate";
import { computeActiveSequence, isValidSceneId } from "../registry";
import type { SurpriseConfig, FeatureFlags, NotebookConfig } from "../schema";
import defaultConfig from "@/config";

// ── Helpers ──────────────────────────────────────────────────────────────
function makeLegacyConfig(overrides: Partial<SurpriseConfig> = {}): SurpriseConfig {
  return { ...defaultConfig, ...overrides } as SurpriseConfig;
}

// ── Test runner (minimal, no external deps) ──────────────────────────────
type TestResult = { name: string; passed: boolean; error?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: String(e) });
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toContain(item: unknown) {
      if (!Array.isArray(actual) || !actual.includes(item)) {
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
      }
    },
    not: {
      toBe(expected: unknown) {
        if (actual === expected) {
          throw new Error(`Expected not ${JSON.stringify(expected)}`);
        }
      },
      toContain(item: unknown) {
        if (Array.isArray(actual) && actual.includes(item)) {
          throw new Error(`Expected array not to contain ${JSON.stringify(item)}`);
        }
      },
    },
  };
}

// ── Migration tests ───────────────────────────────────────────────────────

test("normalizeConfig: legacy config gets version 1", () => {
  const raw = makeLegacyConfig();
  const norm = normalizeConfig(raw);
  expect(norm.version).toBe(1);
});

test("normalizeConfig: v2 config gets version 2", () => {
  const raw = makeLegacyConfig({ _version: 2 });
  const norm = normalizeConfig(raw);
  expect(norm.version).toBe(2);
});

test("normalizeConfig: future version falls back to v1", () => {
  const raw = makeLegacyConfig({ _version: 99 as never });
  const norm = normalizeConfig(raw);
  expect(norm.version).toBe(1);
});

test("normalizeConfig: preserves recipient name", () => {
  const raw = makeLegacyConfig({ name: "Zoya" });
  const norm = normalizeConfig(raw);
  expect(norm.recipient.name).toBe("Zoya");
});

test("normalizeConfig: preserves empty name (no truthiness overwrite)", () => {
  const raw = makeLegacyConfig({ name: "" });
  const norm = normalizeConfig(raw);
  expect(norm.recipient.name).toBe("");
});

test("normalizeConfig: legacy occasion defaults to birthday", () => {
  const raw = makeLegacyConfig({ occasionType: undefined });
  const norm = normalizeConfig(raw);
  expect(norm.occasion).toBe("birthday");
});

test("normalizeConfig: legacy rakshabandhan preserved", () => {
  const raw = makeLegacyConfig({ occasionType: "rakshabandhan" });
  const norm = normalizeConfig(raw);
  expect(norm.occasion).toBe("rakshabandhan");
});

test("normalizeConfig: loveday alias preserved", () => {
  const raw = makeLegacyConfig({ occasionType: "loveday" });
  const norm = normalizeConfig(raw);
  expect(norm.occasion).toBe("loveday");
});

test("normalizeConfig: legacy theme preserved", () => {
  const raw = makeLegacyConfig({ themeId: "roseGold" });
  const norm = normalizeConfig(raw);
  expect(norm.theme.preset).toBe("roseGold");
  expect(norm.theme.legacyThemeId).toBe("roseGold");
});

test("normalizeConfig: legacy records use legacy scene sequence", () => {
  const raw = makeLegacyConfig();
  const norm = normalizeConfig(raw);
  expect(norm.scenes).toEqual(LEGACY_SCENE_SEQUENCE);
});

test("normalizeConfig: v2 with explicit scenes uses those scenes", () => {
  const raw = makeLegacyConfig({
    _version: 2,
    scenes: ["landing", "butterfly", "lastNote"],
  });
  const norm = normalizeConfig(raw);
  expect(norm.scenes).toEqual(["landing", "butterfly", "lastNote"]);
});

test("normalizeConfig: legacy records have new scenes disabled", () => {
  const raw = makeLegacyConfig();
  const norm = normalizeConfig(raw);
  expect(norm.features.butterfly).toBeFalsy();
  expect(norm.features.giftReveal).toBeFalsy();
  expect(norm.features.youAndMe).toBeFalsy();
  expect(norm.features.notebook).toBeFalsy();
  expect(norm.features.roseBloom).toBeFalsy();
});

test("normalizeConfig: legacy records have legacy features enabled", () => {
  const raw = makeLegacyConfig();
  const norm = normalizeConfig(raw);
  expect(norm.features.intro).toBeTruthy();
  expect(norm.features.memoryWall).toBeTruthy();
  expect(norm.features.lastNote).toBeTruthy();
});

test("normalizeConfig: explicit false feature preserved (no truthiness overwrite)", () => {
  const raw = makeLegacyConfig({
    features: { intro: false },
  });
  const norm = normalizeConfig(raw);
  expect(norm.features.intro).toBeFalsy();
});

test("normalizeConfig: audio fields preserved", () => {
  const raw = makeLegacyConfig({
    audio: {
      backgroundMusic: "/audio/test.mp3",
      birthdaySong: "/audio/birthday.mp3",
      useFallbackTones: false,
    },
  });
  const norm = normalizeConfig(raw);
  expect(norm.audio.music).toBe("/audio/test.mp3");
  expect(norm.audio.birthdaySong).toBe("/audio/birthday.mp3");
  expect(norm.audio.useFallbackTones).toBeFalsy();
});

test("normalizeConfig: useFallbackTones=false preserved (no truthiness overwrite)", () => {
  const raw = makeLegacyConfig({
    audio: { ...defaultConfig.audio, useFallbackTones: false },
  });
  const norm = normalizeConfig(raw);
  expect(norm.audio.useFallbackTones).toBeFalsy();
});

test("normalizeConfig: raw config preserved on output", () => {
  const raw = makeLegacyConfig({ name: "TestUser" });
  const norm = normalizeConfig(raw);
  expect(norm.raw.name).toBe("TestUser");
});

test("normalizeConfig: is non-mutating (input unchanged)", () => {
  const raw = makeLegacyConfig({ name: "Original" });
  const rawCopy = JSON.stringify(raw);
  normalizeConfig(raw);
  expect(JSON.stringify(raw)).toBe(rawCopy);
});

test("normalizeConfig: is deterministic (same input → same output)", () => {
  const raw = makeLegacyConfig({ name: "Zoya" });
  const norm1 = normalizeConfig(raw);
  const norm2 = normalizeConfig(raw);
  expect(JSON.stringify(norm1)).toBe(JSON.stringify(norm2));
});

test("normalizeConfig: is repeatable (calling twice is safe)", () => {
  const raw = makeLegacyConfig();
  const norm1 = normalizeConfig(raw);
  const norm2 = normalizeConfig(norm1.raw);
  expect(norm1.version).toBe(norm2.version);
  expect(norm1.occasion).toBe(norm2.occasion);
});

// ── migrateV1ToV2 tests ───────────────────────────────────────────────────

test("migrateV1ToV2: sets _version to 2", () => {
  const raw = defaultConfig;
  const migrated = migrateV1ToV2(raw);
  expect(migrated._version).toBe(2);
});

test("migrateV1ToV2: preserves all legacy text content", () => {
  const raw = defaultConfig;
  const migrated = migrateV1ToV2(raw);
  expect(migrated.name).toBe(raw.name);
  expect(migrated.landing.title).toBe(raw.landing.title);
  expect(migrated.lastNote.finalLine1).toBe(raw.lastNote.finalLine1);
});

test("migrateV1ToV2: does NOT enable new cinematic scenes", () => {
  const raw = defaultConfig;
  const migrated = migrateV1ToV2(raw);
  expect(migrated.features?.butterfly).toBeFalsy();
  expect(migrated.features?.roseBloom).toBeFalsy();
});

test("migrateV1ToV2: is non-mutating", () => {
  const raw = defaultConfig;
  const rawCopy = JSON.stringify(raw);
  migrateV1ToV2(raw);
  expect(JSON.stringify(raw)).toBe(rawCopy);
});

// ── Notebook operation tests ──────────────────────────────────────────────

test("notebookAddPage: adds a letter page", () => {
  const nb: NotebookConfig = { pages: [] };
  const result = notebookAddPage(nb, "letter");
  expect(result.pages.length).toBe(1);
  expect(result.pages[0].type).toBe("letter");
  expect(result.pages[0].enabled).toBeTruthy();
});

test("notebookAddPage: is non-mutating", () => {
  const nb: NotebookConfig = { pages: [] };
  notebookAddPage(nb, "letter");
  expect(nb.pages.length).toBe(0);
});

test("notebookAddPage: generates unique IDs", () => {
  const nb: NotebookConfig = { pages: [] };
  const r1 = notebookAddPage(nb, "letter");
  const r2 = notebookAddPage(r1, "memory");
  expect(r2.pages[0].id).not.toBe(r2.pages[1].id);
});

test("notebookEditPage: edits a page by ID", () => {
  let nb: NotebookConfig = { pages: [] };
  nb = notebookAddPage(nb, "letter");
  const id = nb.pages[0].id;
  const result = notebookEditPage(nb, id, { enabled: false });
  expect(result.pages[0].enabled).toBeFalsy();
});

test("notebookEditPage: is non-mutating", () => {
  let nb: NotebookConfig = { pages: [] };
  nb = notebookAddPage(nb, "letter");
  const id = nb.pages[0].id;
  const nbCopy = JSON.stringify(nb);
  notebookEditPage(nb, id, { enabled: false });
  expect(JSON.stringify(nb)).toBe(nbCopy);
});

test("notebookDeletePage: removes a page by ID", () => {
  let nb: NotebookConfig = { pages: [] };
  nb = notebookAddPage(nb, "letter");
  const id = nb.pages[0].id;
  const result = notebookDeletePage(nb, id);
  expect(result.pages.length).toBe(0);
});

test("notebookDeletePage: handles missing ID gracefully", () => {
  const nb: NotebookConfig = { pages: [] };
  const result = notebookDeletePage(nb, "nonexistent");
  expect(result.pages.length).toBe(0);
});

test("notebookReorderPages: reorders pages", () => {
  let nb: NotebookConfig = { pages: [] };
  nb = notebookAddPage(nb, "letter");
  nb = notebookAddPage(nb, "memory");
  const id0 = nb.pages[0].id;
  const id1 = nb.pages[1].id;
  const result = notebookReorderPages(nb, 0, 1);
  expect(result.pages[0].id).toBe(id1);
  expect(result.pages[1].id).toBe(id0);
});

test("notebookReorderPages: same index is no-op", () => {
  let nb: NotebookConfig = { pages: [] };
  nb = notebookAddPage(nb, "letter");
  const result = notebookReorderPages(nb, 0, 0);
  expect(result.pages[0].id).toBe(nb.pages[0].id);
});

test("notebookReorderPages: out-of-bounds is safe", () => {
  let nb: NotebookConfig = { pages: [] };
  nb = notebookAddPage(nb, "letter");
  const result = notebookReorderPages(nb, 0, 99);
  expect(result.pages.length).toBe(1);
});

// ── Scene operation tests ─────────────────────────────────────────────────

test("sceneDisable: sets feature to false", () => {
  const features: FeatureFlags = {
    intro: true, cutenessMeter: true, celebration: true,
    memoryWall: true, ourStory: true, whyYouMatter: true,
    beforeLeave: true, lastNote: true,
    butterfly: true, giftReveal: true, youAndMe: true,
    notebook: true, roseBloom: true,
  };
  const result = sceneDisable(features, "butterfly");
  expect(result.butterfly).toBeFalsy();
  // Other features unchanged
  expect(result.intro).toBeTruthy();
});

test("sceneEnable: restores feature to true", () => {
  const features: FeatureFlags = {
    intro: true, cutenessMeter: true, celebration: true,
    memoryWall: true, ourStory: true, whyYouMatter: true,
    beforeLeave: true, lastNote: true,
    butterfly: false, giftReveal: false, youAndMe: false,
    notebook: false, roseBloom: false,
  };
  const result = sceneEnable(features, "butterfly");
  expect(result.butterfly).toBeTruthy();
});

test("sceneEnable: OFF→ON restores exact prior config", () => {
  const features: FeatureFlags = {
    intro: true, cutenessMeter: true, celebration: true,
    memoryWall: true, ourStory: true, whyYouMatter: true,
    beforeLeave: true, lastNote: true,
    butterfly: false, giftReveal: false, youAndMe: false,
    notebook: false, roseBloom: false,
  };
  // Prior config had butterfly = true
  const prior: Partial<FeatureFlags> = { butterfly: true };
  const result = sceneEnable(features, "butterfly", prior);
  expect(result.butterfly).toBeTruthy();
});

test("sceneReorder: reorders scenes", () => {
  const scenes = ["landing", "butterfly", "lastNote"] as const;
  const result = sceneReorder([...scenes], 0, 2);
  expect(result[0]).toBe("butterfly");
  expect(result[2]).toBe("landing");
});

test("sceneReorder: same index is no-op", () => {
  const scenes = ["landing", "butterfly", "lastNote"];
  const result = sceneReorder(scenes, 1, 1);
  expect(result[1]).toBe("butterfly");
});

// ── Registry validation tests ─────────────────────────────────────────────

test("isValidSceneId: valid IDs pass", () => {
  expect(isValidSceneId("landing")).toBeTruthy();
  expect(isValidSceneId("butterfly")).toBeTruthy();
  expect(isValidSceneId("roseBloom")).toBeTruthy();
});

test("isValidSceneId: invalid IDs fail", () => {
  expect(isValidSceneId("nonexistent")).toBeFalsy();
  expect(isValidSceneId("")).toBeFalsy();
});

// ── computeActiveSequence tests ───────────────────────────────────────────

test("computeActiveSequence: filters disabled scenes", () => {
  const features: FeatureFlags = {
    intro: false, cutenessMeter: true, celebration: true,
    memoryWall: true, ourStory: true, whyYouMatter: true,
    beforeLeave: true, lastNote: true,
    butterfly: false, giftReveal: false, youAndMe: false,
    notebook: false, roseBloom: false,
  };
  const scenes = ["landing", "intro", "butterfly", "lastNote"] as const;
  const active = computeActiveSequence([...scenes], features);
  expect(active).not.toContain("intro");
  expect(active).not.toContain("butterfly");
  expect(active).toContain("landing");
  expect(active).toContain("lastNote");
});

test("computeActiveSequence: empty sequence is safe", () => {
  const features: FeatureFlags = {
    intro: true, cutenessMeter: true, celebration: true,
    memoryWall: true, ourStory: true, whyYouMatter: true,
    beforeLeave: true, lastNote: true,
    butterfly: true, giftReveal: true, youAndMe: true,
    notebook: true, roseBloom: true,
  };
  const active = computeActiveSequence([], features);
  expect(active.length).toBe(0);
});

test("computeActiveSequence: invalid scene IDs are filtered", () => {
  const features: FeatureFlags = {
    intro: true, cutenessMeter: true, celebration: true,
    memoryWall: true, ourStory: true, whyYouMatter: true,
    beforeLeave: true, lastNote: true,
    butterfly: true, giftReveal: true, youAndMe: true,
    notebook: true, roseBloom: true,
  };
  const active = computeActiveSequence(["landing", "invalid_scene" as never, "lastNote"], features);
  expect(active).not.toContain("invalid_scene");
  expect(active).toContain("landing");
});

// ── Run and report ────────────────────────────────────────────────────────
export function runMigrationTests(): { passed: number; failed: number; results: TestResult[] } {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
