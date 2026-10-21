import { test, expect, type Page } from "@playwright/test";
import { createSeededStickerFixture } from "../../artifacts/birthday-surprise/src/lib/stickers/__tests__/fixtures";
import { STICKERS_BY_ID } from "../../artifacts/birthday-surprise/src/lib/stickers/manifest";
import type { SurpriseConfig } from "../../artifacts/birthday-surprise/src/lib/v2/schema";

async function mockPublicSurprise(
  page: Page,
  config: SurpriseConfig,
  motion: "reduce" | "no-preference" = "no-preference",
) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: motion });
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await page.route("https://qa.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/rest/v1/rpc/get_surprise_by_slug")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ config }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  return errors;
}

test("v2 SceneEngine renders stickers only on configured scenes and never blocks Continue buttons", async ({
  page,
}) => {
  const v2Fixture = createSeededStickerFixture("v2");
  // Sequence: intro (2 stickers) -> butterfly (0 stickers) -> celebration (1 sticker) -> lastNote (0 stickers)
  const errors = await mockPublicSurprise(page, v2Fixture, "no-preference");

  await page.goto("/s/qa-v2-stickers");

  // Scene 1: intro — should render exactly 2 stickers inside .scene-content
  await expect(page.getByText("Zoya, My Birthday Bestie")).toBeVisible({ timeout: 10000 });
  const introLayer = page.locator('.scene-content [data-sticker-layer="intro"]');
  await expect(introLayer).toBeVisible();
  await expect(introLayer.locator("img")).toHaveCount(2);
  await expect(introLayer.locator("img").nth(0)).toHaveAttribute("src", STICKERS_BY_ID["kitty-02"].webp);
  await expect(introLayer.locator("img").nth(1)).toHaveAttribute("src", STICKERS_BY_ID["kitty-22"].webp);

  // Clicking the scene's primary Continue button must work cleanly without pointer interception
  await page.getByRole("button", { name: "Open Bestie Birthday Surprise 🎁" }).click();

  // Scene 2: butterfly — has NO stickers configured; StickerLayer must not render
  await expect(page.locator('[data-scene="butterfly"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator("[data-sticker-layer]")).toHaveCount(0);

  // Advance to Scene 3: celebration via scene navigation button
  await page.getByRole("button", { name: "Next scene" }).click();

  // Scene 3: celebration — should render only its 1 configured sticker
  await expect(page.getByText("Our Little Celebration")).toBeVisible({ timeout: 10000 });
  const celebrationLayer = page.locator('.scene-content [data-sticker-layer="celebration"]');
  await expect(celebrationLayer).toBeVisible();
  await expect(celebrationLayer.locator("img")).toHaveCount(1);
  await expect(celebrationLayer.locator("img").first()).toHaveAttribute("src", STICKERS_BY_ID["kitty-18"].webp);

  // Continue button on celebration advances cleanly to Scene 4 (lastNote) which has 0 stickers
  await page.getByRole("button", { name: "Continue With Love 💕" }).click();
  await expect(page.locator('[data-scene="lastNote"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator("[data-sticker-layer]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("v1 legacy flow renders stickers only on configured pages, honors reduced motion posters, and keeps Continue clickable", async ({
  page,
}) => {
  const v1Fixture = createSeededStickerFixture("v1");
  // Legacy flow: landing (1 sticker) -> intro (1 sticker) -> cuteness (0 stickers)
  const errors = await mockPublicSurprise(page, v1Fixture, "reduce");

  await page.goto("/s/qa-v1-stickers");

  // Page 1: landing — 1 static poster sticker
  await expect(page.getByRole("button", { name: "Open It 🎀" })).toBeVisible({ timeout: 10000 });
  const landingLayer = page.locator('[data-sticker-layer="landing"]');
  await expect(landingLayer).toBeVisible();
  await expect(landingLayer.locator("img")).toHaveCount(1);
  await expect(landingLayer.locator("img").first()).toHaveAttribute("src", STICKERS_BY_ID["kitty-14"].poster);

  // Continue to Page 2: intro — 1 static poster sticker
  await page.getByRole("button", { name: "Open It 🎀" }).click();
  await expect(page.getByRole("button", { name: "Open Bestie Birthday Surprise 🎁" })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator('[data-sticker-layer="landing"]')).toHaveCount(0);
  const introLayer = page.locator('[data-sticker-layer="intro"]');
  await expect(introLayer).toBeVisible();
  await expect(introLayer.locator("img")).toHaveCount(1);
  await expect(introLayer.locator("img").first()).toHaveAttribute("src", STICKERS_BY_ID["kitty-03"].poster);

  // Continue to Page 3: cuteness — 0 stickers
  await page.getByRole("button", { name: "Open Bestie Birthday Surprise 🎁" }).click();
  await expect(page.getByText("Cuteness Meter 😍")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("[data-sticker-layer]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
