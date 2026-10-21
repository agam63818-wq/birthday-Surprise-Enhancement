import defaultConfig from "@/config";
import { promoteToCinematic } from "@/lib/v2/migrate";
import type { SurpriseConfig } from "@/lib/v2/schema";

/**
 * Tiny non-production test seed for previewing/verifying StickerLayer across
 * both legacy V1 and cinematic V2 flows without shipping fake stickers in `defaultConfig`.
 */
export function createSeededStickerFixture(mode: "v1" | "v2" = "v2"): SurpriseConfig {
  const base: SurpriseConfig =
    mode === "v2"
      ? promoteToCinematic(structuredClone(defaultConfig) as SurpriseConfig)
      : (structuredClone(defaultConfig) as SurpriseConfig);

  base.name = "Aarav";
  base.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };

  if (mode === "v2") {
    base.scenes = ["intro", "butterfly", "celebration", "lastNote"];
    base.stickers = {
      version: 1,
      scenes: {
        intro: {
          enabled: true,
          items: [
            { uid: "fix-intro-1", stickerId: "kitty-02", x: 0.18, y: 0.25, w: 0.18, rotate: -8, z: 1 },
            { uid: "fix-intro-2", stickerId: "kitty-22", x: 0.82, y: 0.72, w: 0.16, rotate: 10, z: 2, flipX: true },
          ],
        },
        celebration: {
          enabled: true,
          items: [
            { uid: "fix-cel-1", stickerId: "kitty-18", x: 0.84, y: 0.24, w: 0.2, rotate: 6, z: 1 },
          ],
        },
      },
    };
  } else {
    base.stickers = {
      version: 1,
      scenes: {
        landing: {
          enabled: true,
          items: [
            { uid: "fix-v1-landing-1", stickerId: "kitty-14", x: 0.2, y: 0.28, w: 0.17, rotate: -6, z: 1 },
          ],
        },
        intro: {
          enabled: true,
          items: [
            { uid: "fix-v1-intro-1", stickerId: "kitty-03", x: 0.8, y: 0.26, w: 0.19, rotate: 9, z: 1 },
          ],
        },
      },
    };
  }

  return base;
}
