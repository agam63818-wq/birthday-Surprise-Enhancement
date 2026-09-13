import { describe, it, expect } from "vitest";
import defaultConfig from "@/config";
import { normalizeConfig, promoteToCinematic, migrateV1ToV2, DEFAULT_V2_SCENE_SEQUENCE, LEGACY_SCENE_SEQUENCE, notebookAddPage } from "../migrate";
import { SCENE_REGISTRY, computeActiveSequence } from "../registry";
import { THEME_PRESETS } from "@/lib/themePresets";
import { OCCASION_META } from "@/lib/occasions";
import { validatePatch, applyConfigPatch, configToPatch, validateV2Config, safeMediaUrl, SCENE_IDS, FEATURE_IDS, THEME_IDS, OCCASION_IDS, PAGE_TYPES } from "../../../../supabase/functions/_shared/configPatch";

const change = (path: string, value: unknown) => ({ changes: [{ path, value }] });
describe("canonical migration and metadata", () => {
  it.each(["birthday", "rakshabandhan", "mothersday", "fathersday", "loveday", "custom"] as const)("preserves legacy %s without automatic promotion", occasionType => {
    const base = { ...structuredClone(defaultConfig), occasionType, _ext: { kept: { x: 0 } } };
    expect(normalizeConfig(base).scenes).toEqual(LEGACY_SCENE_SEQUENCE);
    const next = promoteToCinematic(base);
    expect(next._version).toBe(2);
    expect(next.scenes).toEqual(DEFAULT_V2_SCENE_SEQUENCE);
    for (const key of Object.keys(base)) expect(next[key as keyof typeof next]).toEqual(base[key as keyof typeof base]);
    expect(base).not.toHaveProperty("_version");
    expect(promoteToCinematic(next)).toEqual(next);
    expect(migrateV1ToV2(next)).toEqual(next);
  });
  it("preserves explicit empty scene list and fills absent V2 sequence", () => {
    expect(normalizeConfig({ ...defaultConfig, _version: 2, scenes: [] }).scenes).toEqual([]);
    expect(normalizeConfig({ ...defaultConfig, _version: 2 }).scenes).toEqual(DEFAULT_V2_SCENE_SEQUENCE);
    expect(DEFAULT_V2_SCENE_SEQUENCE).toHaveLength(10);
  });
  it("all runtime/editor/AI IDs agree", () => {
    expect(Object.keys(SCENE_REGISTRY).sort()).toEqual([...SCENE_IDS].sort());
    expect(Object.keys(THEME_PRESETS).sort()).toEqual([...THEME_IDS].sort());
    expect(Object.keys(OCCASION_META).sort()).toEqual([...OCCASION_IDS].sort());
    for (const meta of Object.values(SCENE_REGISTRY)) expect(FEATURE_IDS).toContain(meta.featureKey);
  });
  it.each(SCENE_IDS)("disabling %s removes navigation without erasing settings", id => {
    const base = { ...promoteToCinematic(defaultConfig), scenes: [...SCENE_IDS] };
    const key = SCENE_REGISTRY[id].featureKey!;
    const disabled = applyConfigPatch(base, change(`features.${key}`, false));
    const n = normalizeConfig(disabled);
    expect(computeActiveSequence(n.scenes, n.features)).not.toContain(id);
    expect(disabled.scenes).toEqual(base.scenes);
    expect(disabled.memoryWall).toEqual(base.memoryWall);
    expect(applyConfigPatch(disabled, change(`features.${key}`, true)).features?.[key]).toBe(true);
  });
});
describe("transactional patch validation", () => {
  it("applies a validated multi-change patch without touching base, media or extensions", () => {
    const base = { ...promoteToCinematic(defaultConfig), _ext: { future: true } };
    const snapshot = structuredClone(base);
    const next = applyConfigPatch(base, { changes: [{ path: "features.roseBloom", value: false }, { path: "roseBloom.text", value: "" }, { path: "occasionId", value: "anniversary" }] });
    expect(next.features?.roseBloom).toBe(false);
    expect(next.roseBloom?.text).toBe("");
    expect(next.occasionType).toBe("anniversary");
    expect(next.memoryWall).toEqual(base.memoryWall);
    expect(next._ext).toEqual(base._ext);
    expect(base).toEqual(snapshot);
    expect(() => validateV2Config(next)).not.toThrow();
  });
  it.each([
    change("__proto__.polluted", true), change("features.constructor", true), change("features.unknown", true),
    change("scenes", ["roseBloom", "roseBloom"]), change("scenes", ["constructor"]), change("themePreset", "neon"),
    change("occasionId", "unknown"), change("roseBloom.speed", "extreme"), change("roseBloom.intensity", 50),
    change("features.roseBloom", "true"), change("name", "x".repeat(121)), change("giftReveal.photoUrl", "javascript:alert(1)"),
    change("giftReveal.photoUrl", "//evil.example/file.png"), change("_ext", { x: "code" }), change("is_paid", true),
    { changes: [{ path: "name", value: "a" }, { path: "name", value: "b" }] },
    { changes: [{ path: "name", value: "a", invented: true }] }, { changes: [], extra: true },
    change("notebook.pages", [{ id: "1", enabled: true, type: "evil", title: "x" }]),
  ])("rejects malformed or unsupported patch %j atomically", patch => {
    const base = promoteToCinematic(defaultConfig); const snapshot = structuredClone(base);
    expect(() => applyConfigPatch(base, patch)).toThrow(); expect(base).toEqual(snapshot);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("a bad second operation cannot partially apply the first", () => {
    const base = promoteToCinematic(defaultConfig);
    expect(() => applyConfigPatch(base, { changes: [{ path: "name", value: "Changed" }, { path: "features.nope", value: true }] })).toThrow();
    expect(base.name).toBe(defaultConfig.name);
  });
  it("accepts unsupported-request empty patches as no-op", () => {
    expect(validatePatch({ changes: [] })).toEqual({ changes: [] });
    expect(applyConfigPatch(defaultConfig, { changes: [] })).toEqual(defaultConfig);
  });
  it("guided legacy output uses same contract, preserving empty arrays", () => {
    expect(configToPatch({ name: "New name", memoryWall: { photos: [] } })).toEqual(change("name", "New name"));
    expect(() => configToPatch({ name: "New", malicious: {} })).toThrow();
  });
  it.each(PAGE_TYPES)("accepts ordered disabled %s pages", type => {
    const notebook = notebookAddPage({ pages: [] }, type);
    notebook.pages[0].enabled = false;
    expect(() => validatePatch(change("notebook.pages", notebook.pages))).not.toThrow();
    expect(() => validatePatch(change("notebook.pages", [...notebook.pages, ...notebook.pages]))).toThrow();
  });
  it("validates save-time V2 values too", () => {
    expect(() => validateV2Config({ ...defaultConfig, _version: 2, features: { bad: true } })).toThrow();
    expect(() => validateV2Config({ ...defaultConfig, _version: 2, notebook: { pages: [{ type: "memory", id: "x", enabled: true, title: "x", image: "ftp://example.com/file" }] } })).toThrow();
  });
  it.each(["https://example.com/photo.jpg", "http://example.com/a.png", "/photos/photo1.png", ""])("accepts safe media URL %s", url => expect(safeMediaUrl(url)).toBe(true));
});
