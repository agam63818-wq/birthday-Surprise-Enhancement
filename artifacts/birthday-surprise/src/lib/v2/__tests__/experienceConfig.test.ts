import { describe, expect, it } from "vitest";
import defaultConfig from "@/config";
import type { SurpriseConfig } from "../schema";
import { EXPERIENCE_SCENE_IDS } from "../schema";
import {
  DEFAULT_V2_SCENE_SEQUENCE,
  migrateV1ToV2,
  normalizeConfig,
  promoteToCinematic,
  sceneReorder,
} from "../migrate";
import {
  computeActiveSequence,
  SCENE_LAZY_LOADERS,
  SCENE_REGISTRY,
  setSceneEnabled,
} from "../registry";
import {
  getHeartTunnelDefaults,
  resolveHeartTunnelConfig,
  resolveLoveConfessionConfig,
  resolveLoveDriveConfig,
} from "../experienceDefaults";
import { getSceneStickers, normalizeStickersConfig } from "@/lib/stickers/model";
import { applyConfigPatch, SCENE_IDS, validateV2Config } from "../../../../supabase/functions/_shared/configPatch";
import { isHostToFrameMessage } from "@/lib/experiences/protocol";

function legacyFixture(): SurpriseConfig {
  const config = structuredClone(defaultConfig) as SurpriseConfig;
  config.name = "Asha";
  config.occasionType = "rakshabandhan";
  config.themeId = "roseGold";
  config.audio.playback = {
    backgroundMusic: {
      mode: "untilSceneEnds",
      startAt: "scene",
      startScene: "intro",
      stopScene: "lastNote",
      fadeInDuration: 1,
    },
  };
  config.stickers = { version: 1, scenes: { intro: { enabled: true, items: [] } } };
  config._ext = { future: { preserved: true } };
  return config;
}

function v2Fixture(): SurpriseConfig {
  return {
    ...legacyFixture(),
    _version: 2,
    occasionId: "anniversary",
    themePreset: "champagne",
    scenes: ["intro", "butterfly", "giftReveal", "lastNote"],
    features: { intro: true, butterfly: false, giftReveal: true, letters: false },
    notebook: { pages: [{ id: "note-1", type: "letter", enabled: true, title: "Note", content: "Keep me" }] },
    roseBloom: { text: "Bloom", speed: "slow", intensity: "subtle", fallingPetals: false, soundEnabled: false },
    butterfly: { message: "Butterfly", subMessage: "Message" },
    giftReveal: { occasionText: "Occasion", recipientName: "Asha", senderName: "Ravi", message: "Gift", photoUrl: "/photos/photo1.png" },
    youAndMe: { name1: "Ravi", name2: "Asha" },
    textStyles: { global: "warm", intro: "elegant" },
  };
}

describe("Part 1 normalization compatibility snapshots", () => {
  it("keeps the representative old v1 normalization byte-identical", () => {
    expect(JSON.stringify(normalizeConfig(legacyFixture()))).toMatchSnapshot();
  });

  it("keeps the representative old v2 normalization byte-identical", () => {
    expect(JSON.stringify(normalizeConfig(v2Fixture()))).toMatchSnapshot();
  });
});

describe("Part 2 opt-in scene plumbing", () => {
  it.each([...EXPERIENCE_SCENE_IDS])("%s is absent/OFF for old configs and never enters the default sequence", id => {
    for (const raw of [legacyFixture(), v2Fixture()]) {
      const normalized = normalizeConfig(raw);
      expect(normalized.features[id]).toBeUndefined();
      expect(normalized).not.toHaveProperty(id);
      expect(computeActiveSequence([id], normalized.features)).toEqual([]);
      expect(DEFAULT_V2_SCENE_SEQUENCE).not.toContain(id);
    }
  });

  it.each([...EXPERIENCE_SCENE_IDS])("enabling %s inserts it and disabling skips it without erasing order", id => {
    const base = v2Fixture();
    const normalized = normalizeConfig(base);
    const absentDisable = setSceneEnabled([], normalized.features, id, false);
    expect(absentDisable.scenes).toEqual([]);
    expect(computeActiveSequence(absentDisable.scenes, absentDisable.features)).toEqual([]);
    const enabled = setSceneEnabled([], normalized.features, id, true);
    expect(enabled.scenes).toEqual([id]);
    expect(computeActiveSequence(enabled.scenes, enabled.features)).toEqual([id]);
    const disabled = setSceneEnabled(enabled.scenes, enabled.features, id, false);
    expect(disabled.scenes).toEqual([id]);
    expect(computeActiveSequence(disabled.scenes, disabled.features)).toEqual([]);
    expect(base.scenes).toEqual(v2Fixture().scenes);
  });

  it("reorders sequences containing all three new IDs", () => {
    const reordered = sceneReorder(["heartTunnel", "loveConfession", "loveDrive"], 0, 2);
    expect(reordered).toEqual(["loveConfession", "loveDrive", "heartTunnel"]);
  });

  it("registry and lazy loaders cover exactly the new heavy wrappers", () => {
    for (const id of EXPERIENCE_SCENE_IDS) {
      expect(SCENE_REGISTRY[id]).toMatchObject({ id, isLegacy: false, isHeavy: true, featureKey: id });
      expect(SCENE_LAZY_LOADERS[id]).toEqual(expect.any(Function));
      expect(SCENE_IDS).toContain(id);
    }
  });

  it("v1 upgrade/promotion never adds the new scenes or flags", () => {
    for (const next of [migrateV1ToV2(legacyFixture()), promoteToCinematic(legacyFixture())]) {
      expect(next.scenes?.some(id => (EXPERIENCE_SCENE_IDS as readonly string[]).includes(id))).toBe(false);
      for (const id of EXPERIENCE_SCENE_IDS) expect(next.features?.[id]).toBeUndefined();
    }
  });

  it("resolves shared defaults when only scene/flag opt-in is present", () => {
    const raw: SurpriseConfig = {
      ...v2Fixture(),
      scenes: [...EXPERIENCE_SCENE_IDS],
      features: {
        ...v2Fixture().features,
        heartTunnel: true,
        loveConfession: true,
        loveDrive: true,
      },
    };
    const normalized = normalizeConfig(raw);
    expect(normalized.heartTunnel?.revealTitle).toBe("Happy\nAnniversary");
    expect(normalized.loveConfession?.noGiveInAfter).toBe(6);
    expect(normalized.loveDrive?.recipientName).toBe("Asha");
    expect(computeActiveSequence(normalized.scenes, normalized.features)).toEqual([...EXPERIENCE_SCENE_IDS]);
  });

  it("resolved defaults are valid Part 1 iframe init config payloads", () => {
    const payloads = [
      { experience: "heart-tunnel", config: resolveHeartTunnelConfig(undefined, "birthday") },
      { experience: "love-confession", config: resolveLoveConfessionConfig(undefined, "Ravi") },
      { experience: "love-drive", config: resolveLoveDriveConfig(undefined, "birthday", { recipientName: "Asha" }) },
    ] as const;
    for (const payload of payloads) {
      expect(isHostToFrameMessage({
        v: 1,
        type: "init",
        experience: payload.experience,
        config: payload.config,
        theme: {},
        reducedMotion: false,
        muted: true,
        occasion: "birthday",
      })).toBe(true);
    }
  });

  it("resolves occasion-aware defaults without anniversary leakage into birthdays", () => {
    const birthday = getHeartTunnelDefaults("birthday");
    expect(birthday.revealTitle).toBe("Happy\nBirthday");
    expect(birthday.yearsNumber).toBe("");
    expect(birthday.yearsUnit).toBe("");
    expect(birthday.dateText).toBe("");
    expect(birthday.startMain).not.toMatch(/anniversary/i);
    const anniversary = getHeartTunnelDefaults("anniversary");
    expect(anniversary.revealTitle).toBe("Happy\nAnniversary");
    expect(anniversary.yearsNumber).toBe("5");
    expect(anniversary.dateText).not.toBe("");
  });

  it("resolves explicit empty values and rejects unsafe saved values through fallbacks", () => {
    const resolved = resolveHeartTunnelConfig({
      revealTitle: "Custom\nTitle",
      yearsUnit: "",
      dateText: "",
      letterBody: ["One", "Two"],
      startMain: "<img src=x onerror=alert(1)>",
      photoUrl: "javascript:alert(1)",
    }, "birthday");
    expect(resolved.revealTitle).toBe("Custom\nTitle");
    expect(resolved.yearsUnit).toBe("");
    expect(resolved.dateText).toBe("");
    expect(resolved.letterBody).toEqual(["One", "Two"]);
    expect(resolved.startMain).toBe(getHeartTunnelDefaults("birthday").startMain);
    expect(resolved.photoUrl).toBe("");

    expect(resolveLoveConfessionConfig({ noGiveInAfter: 2 }, "Ravi").noGiveInAfter).toBe(6);
    expect(resolveLoveConfessionConfig({}, "Ravi").signatureName).toBe("Ravi");
    const drive = resolveLoveDriveConfig({ collectLabels: { letter: "Letter" } }, "birthday", { recipientName: "Asha" });
    expect(drive.collectLabels).toEqual({ letter: "Letter", gift: "Birthday Gift", heart: "Golden Heart" });
    expect(drive.finalTitle).toContain("Asha");
  });

  it("keeps unrelated stickers/audio/theme/text when only Heart Tunnel is enabled", () => {
    const base = v2Fixture();
    const snapshot = structuredClone(base);
    const next = applyConfigPatch(base, { changes: [
      { path: "features.heartTunnel", value: true },
      { path: "scenes", value: ["heartTunnel"] },
    ] });
    expect(next.features?.heartTunnel).toBe(true);
    expect(next.scenes).toEqual(["heartTunnel"]);
    expect(next.stickers).toEqual(base.stickers);
    expect(next.audio).toEqual(base.audio);
    expect(next.themePreset).toBe(base.themePreset);
    expect(next.name).toBe(base.name);
    expect(next.landing).toEqual(base.landing);
    expect(next.heartTunnel).toEqual(base.heartTunnel);
    expect(base).toEqual(snapshot);
    expect(() => validateV2Config(next)).not.toThrow();
  });

  it("accepts the expanded scene list in audio playback validation", () => {
    const config = {
      ...v2Fixture(),
      audio: {
        ...v2Fixture().audio,
        playback: { backgroundMusic: { mode: "full", startAt: "scene", startScene: "heartTunnel", stopScene: "loveDrive" } },
      },
    };
    expect(() => validateV2Config(config)).not.toThrow();
  });

  it("allows stickers on Heart Tunnel but always returns none for Love Drive", () => {
    const item = { uid: "one", stickerId: "kitty-01", x: 0.2, y: 0.2, w: 0.2, rotate: 0, z: 0 };
    const config: SurpriseConfig = {
      ...v2Fixture(),
      stickers: { version: 1, scenes: {
        heartTunnel: { enabled: true, items: [item] },
        loveDrive: { enabled: true, items: [item] },
        unknownScene: { enabled: true, items: [item] },
      } },
    };
    expect(getSceneStickers(config, "heartTunnel")).toHaveLength(1);
    expect(getSceneStickers(config, "loveDrive")).toEqual([]);
    expect(getSceneStickers(config, "unknownScene")).toEqual([]);
    expect(normalizeStickersConfig(config.stickers)?.scenes.loveDrive).toBeDefined();
  });
});
