import { describe, expect, it } from "vitest";
import {
  butterflyIntro,
  butterflyWhispers,
  describeConfigChange,
  giftRevealLine,
  youAndMeCaption,
} from "../cinematicCopy";

describe("cinematic copy", () => {
  it("keeps gift wording occasion-aware", () => {
    expect(giftRevealLine("birthday")).toMatch(/surprise/i);
    expect(giftRevealLine("anniversary")).toBe("A little memory, wrapped just for you.");
    expect(giftRevealLine("friendship")).toMatch(/friend/i);
    expect(giftRevealLine("congratulations")).toMatch(/You did it/);
    expect(giftRevealLine("justbecause")).toBe("No occasion needed.");
    expect(giftRevealLine("custom", "A handmade note")).toBe("A handmade note");
  });

  it("does not hardcode romantic butterfly copy for friendship", () => {
    expect(butterflyIntro("friendship").cta).not.toMatch(/heart/i);
    expect(butterflyWhispers("friendship").join(" ")).not.toMatch(/I love you/i);
    expect(butterflyWhispers("romantic")).toContain("I love you");
  });

  it("describes AI patches in plain language", () => {
    expect(describeConfigChange("themePreset", "midnightRose")).toBe("Switch theme to midnightRose");
    expect(describeConfigChange("features.roseBloom", true)).toBe("Enable Rose Bloom");
    expect(describeConfigChange("features.notebook", false)).toBe("Disable Notebook");
    expect(describeConfigChange("butterfly.message", "Hi")).toBe("Change the butterfly message");
  });

  it("adapts you-and-me caption", () => {
    expect(youAndMeCaption("romantic")).toBe("WRITTEN IN THE STARS");
    expect(youAndMeCaption("friendship")).toBe("TWO SOULS, ONE STORY");
  });
});
