import { describe, expect, it } from "vitest";
import defaultConfig from "@/config";
import {
  applyConfigPatch,
  configToPatch,
  PATCH_PATHS,
  validatePatch,
  validateV2Config,
} from "../../../../supabase/functions/_shared/configPatch";

const change = (path: string, value: unknown) => ({ changes: [{ path, value }] });

describe("Part 2 experience patch and save validators", () => {
  it("accepts valid plain-text slices, paragraph arrays, groups and bounded numbers", () => {
    const valid = {
      heartTunnel: {
        revealTitle: "Happy\nBirthday",
        letterBody: ["First", "Second"],
        photoUrl: "/photos/photo1.png",
        yearsUnit: "",
      },
      loveConfession: { question: "Do you?", noGiveInAfter: 6, noReaction: "A little maybe 💕" },
      loveDrive: {
        exploringObjective: "Keep going! {remaining} left",
        collectLabels: { letter: "Letter", gift: "Gift", heart: "Heart" },
        collectedToasts: { letter: "Letter found", gift: "Gift found", heart: "Heart found" },
        letterBody: "A long but plain letter",
      },
    };
    expect(() => validateV2Config({ ...defaultConfig, _version: 2, ...valid })).not.toThrow();
    expect(validatePatch(change("heartTunnel.letterBody", ["one", "two"]))).toEqual(change("heartTunnel.letterBody", ["one", "two"]));
    expect(validatePatch(change("loveDrive.collectLabels", valid.loveDrive.collectLabels))).toEqual(change("loveDrive.collectLabels", valid.loveDrive.collectLabels));
    expect(validatePatch(change("loveDrive.collectLabels.letter", "Letter"))).toEqual(change("loveDrive.collectLabels.letter", "Letter"));
    expect(PATCH_PATHS).toEqual(expect.arrayContaining([
      "heartTunnel.startMain", "heartTunnel.letterBody", "loveConfession.noGiveInAfter",
      "loveDrive.deliveryToast", "loveDrive.collectLabels", "loveDrive.collectLabels.letter", "loveDrive.collectedToasts",
    ]));
  });

  it.each([
    change("heartTunnel.startMain", "<script>alert(1)</script>"),
    change("heartTunnel.startMain", "x".repeat(121)),
    change("heartTunnel.revealTitle", 42),
    change("heartTunnel.letterBody", ["a", "b", "c", "d", "e", "f", "g"]),
    change("heartTunnel.letterBody", ["<img src=x onerror=alert(1)>"]),
    change("heartTunnel.photoUrl", "javascript:alert(1)"),
    change("loveConfession.noGiveInAfter", 2),
    change("loveConfession.noGiveInAfter", 13),
    change("loveConfession.noGiveInAfter", 3.5),
    change("loveConfession.question", "javascript:alert(1)"),
    change("loveDrive.collectLabels", { letter: "Letter", gift: "Gift", heart: "Heart", extra: "no" }),
    change("loveDrive.collectLabels", { letter: 42 }),
    change("loveDrive.collectLabels.letter", "<b>Letter</b>"),
    change("loveDrive.deliveryToast", "<b>locked</b>"),
    change("loveDrive.letterBody", "x".repeat(6001)),
  ])("rejects oversize, HTML-shaped, wrong-type or unsupported values: %j", patch => {
    expect(() => validatePatch(patch)).toThrow();
  });

  it("rejects invalid nested roots at the V2 save boundary", () => {
    expect(() => validateV2Config({ ...defaultConfig, _version: 2, heartTunnel: { unknown: "x" } })).toThrow();
    expect(() => validateV2Config({ ...defaultConfig, _version: 2, loveConfession: { noGiveInAfter: 99 } })).toThrow();
    expect(() => validateV2Config({ ...defaultConfig, _version: 2, loveDrive: { collectedToasts: { letter: "<svg onload=alert(1)>" } } })).toThrow();
  });

  it("applies a new nested path atomically without changing unrelated roots", () => {
    const base = {
      ...structuredClone(defaultConfig),
      _version: 2 as const,
      heartTunnel: { startMain: "Keep", letterBody: ["Keep this"] },
      loveDrive: { collectLabels: { letter: "Keep", gift: "Gift", heart: "Heart" } },
      stickers: { version: 1 as const, scenes: {} },
    };
    const before = structuredClone(base);
    const next = applyConfigPatch(base, { changes: [
      { path: "heartTunnel.revealTitle", value: "A safe title" },
      { path: "loveDrive.collectLabels.letter", value: "New" },
    ] });
    expect(next.heartTunnel).toEqual({ startMain: "Keep", letterBody: ["Keep this"], revealTitle: "A safe title" });
    expect(next.loveDrive?.collectLabels?.letter).toBe("New");
    expect(next.audio).toEqual(base.audio);
    expect(next.stickers).toEqual(base.stickers);
    expect(next.name).toBe(base.name);
    expect(base).toEqual(before);
  });

  it("uses the same whitelist for guided generation", () => {
    expect(configToPatch({ heartTunnel: { startMain: "Birthday" } })).toEqual(change("heartTunnel.startMain", "Birthday"));
    expect(() => configToPatch({ loveDrive: { unknown: "no" } })).toThrow();
  });
});
