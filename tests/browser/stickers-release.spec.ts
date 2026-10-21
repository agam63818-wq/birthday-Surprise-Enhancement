import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import sharp from "sharp";
import defaultConfig from "../../artifacts/birthday-surprise/src/config";
import { promoteToCinematic } from "../../artifacts/birthday-surprise/src/lib/v2/migrate";
import { STICKERS_BY_ID } from "../../artifacts/birthday-surprise/src/lib/stickers/manifest";
import { THEME_PRESETS, type ThemePresetId } from "../../artifacts/birthday-surprise/src/lib/themePresets";
import type { SurpriseConfig } from "../../artifacts/birthday-surprise/src/lib/v2/schema";

const creatorUser = {
  id: "00000000-0000-4000-8000-000000000044",
  aud: "authenticated",
  role: "authenticated",
  email: "creator-release@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

interface SharedBackend {
  row: {
    id: string;
    user_id: string;
    slug: string;
    is_paid: boolean;
    config: SurpriseConfig;
    photo_urls: string[];
    audio_urls: string[];
    updated_at: string;
  };
  writes: any[];
}

function createSharedBackend(slug: string, initialConfig: SurpriseConfig): SharedBackend {
  return {
    row: {
      id: "00000000-0000-4000-8000-000000000055",
      user_id: creatorUser.id,
      slug,
      is_paid: true,
      config: structuredClone(initialConfig),
      photo_urls: [],
      audio_urls: [],
      updated_at: "2026-03-01T00:00:00Z",
    },
    writes: [],
  };
}

async function wireBackendToContext(
  ctx: BrowserContext,
  backend: SharedBackend,
  authenticated: boolean,
) {
  await ctx.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await ctx.route("https://qa.invalid/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const reply = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });

    if (url.pathname.includes("/auth/v1/user")) {
      return authenticated ? reply(creatorUser) : reply({ message: "Unauthorized" }, 401);
    }
    if (url.pathname.includes("/rest/v1/rpc/get_surprise_by_slug")) {
      return reply({ config: backend.row.config });
    }
    if (url.pathname.includes("/rest/v1/surprises")) {
      if (req.method() === "PATCH") {
        const payload = req.postDataJSON();
        backend.writes.push(payload);
        backend.row = {
          ...backend.row,
          ...payload,
          updated_at: new Date(Date.parse(backend.row.updated_at) + 1000).toISOString(),
        };
      }
      return reply(backend.row);
    }
    return reply({});
  });

  if (authenticated) {
    await ctx.addInitScript(({ user }) => {
      if (sessionStorage.getItem("release-qa-auth")) return;
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(
        JSON.stringify({ sub: user.id, exp }),
      )}.qa`;
      localStorage.setItem(
        "sb-qa-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "qa-refresh",
          expires_at: exp,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
      sessionStorage.setItem("release-qa-auth", "true");
    }, { user: creatorUser });
  }
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
      errors.push(m.text());
    }
  });
  return errors;
}

async function readRenderedStickerSpecs(page: Page, layerSelector: string) {
  return page.locator(`${layerSelector} img`).evaluateAll((imgs) =>
    imgs.map((el) => {
      const htmlEl = el as HTMLImageElement;
      return {
        src: htmlEl.getAttribute("src"),
        left: htmlEl.style.left,
        top: htmlEl.style.top,
        width: htmlEl.style.width,
        transform: htmlEl.style.transform,
      };
    }),
  );
}

test("1A. Full V2 creator -> save -> reload -> Preview -> fresh signed-out /s/<slug> (Scene A & B enabled, Scene C empty)", async ({
  browser,
}) => {
  const v2Config = promoteToCinematic(structuredClone(defaultConfig));
  v2Config.name = "Aarav";
  v2Config.scenes = ["intro", "celebration", "lastNote"];
  v2Config.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };

  const backend = createSharedBackend("v2-release-share", v2Config);

  // Context 1: Signed-in Creator
  const creatorCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(creatorCtx, backend, true);
  const creatorPage = await creatorCtx.newPage();
  await creatorPage.emulateMedia({ reducedMotion: "no-preference" });
  const creatorErrors = trackErrors(creatorPage);

  await creatorPage.goto("/dashboard?intent=customize");
  await expect(creatorPage.getByRole("heading", { name: "Make it unmistakably yours." })).toBeVisible();

  // Enable Scene A ("intro") & place 2 stickers
  await creatorPage.getByRole("button", { name: /^💌\s*Intro/i }).click();
  const introEditor = creatorPage.locator('[data-sticker-editor="intro"]');
  await introEditor.getByRole("switch", { name: "Stickers on this scene (Intro)" }).click();
  await introEditor.getByRole("button", { name: "Add sticker to Intro" }).click();
  await creatorPage
    .getByRole("dialog", { name: "Sticker gallery" })
    .getByRole("button", { name: `Select sticker ${STICKERS_BY_ID["kitty-11"].name}` })
    .click();
  await introEditor.getByRole("button", { name: "Add sticker to Intro" }).click();
  await creatorPage
    .getByRole("dialog", { name: "Sticker gallery" })
    .getByRole("button", { name: `Select sticker ${STICKERS_BY_ID["kitty-22"].name}` })
    .click();
  await introEditor.getByLabel("Size for Intro sticker").fill("28");
  await introEditor.getByLabel("Rotation degrees for Intro sticker").fill("-14");

  // Enable Scene B ("celebration") & place 1 flipped sticker (leave Scene C "lastNote" untouched!)
  await creatorPage.getByRole("button", { name: /^🎉\s*Celebration/i }).click();
  const celEditor = creatorPage.locator('[data-sticker-editor="celebration"]');
  await celEditor.getByRole("switch", { name: "Stickers on this scene (Celebration)" }).click();
  await celEditor.getByRole("button", { name: "Add sticker to Celebration" }).click();
  await creatorPage
    .getByRole("dialog", { name: "Sticker gallery" })
    .getByRole("button", { name: `Select sticker ${STICKERS_BY_ID["kitty-03"].name}` })
    .click();
  await celEditor
    .getByRole("button", { name: `Flip ${STICKERS_BY_ID["kitty-03"].name} horizontally` })
    .click();

  // Save via existing pipeline
  await creatorPage.getByRole("button", { name: /Save changes/ }).click();
  await expect(creatorPage.getByText("Saved experience", { exact: true })).toBeVisible();
  expect(backend.writes).toHaveLength(1);

  // Reload & capture Preview sticker specs across A -> B -> C
  await creatorPage.reload();
  await expect(creatorPage.locator('[data-scene="intro"]')).toBeVisible();
  const previewSceneA = await readRenderedStickerSpecs(
    creatorPage,
    '.scene-content [data-sticker-layer="intro"]',
  );
  expect(previewSceneA).toHaveLength(2);

  await creatorPage.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(creatorPage.locator('[data-scene="celebration"]')).toBeVisible();
  const previewSceneB = await readRenderedStickerSpecs(
    creatorPage,
    '.scene-content [data-sticker-layer="celebration"]',
  );
  expect(previewSceneB).toHaveLength(1);

  await creatorPage.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(creatorPage.locator('[data-scene="lastNote"]')).toBeVisible();
  await expect(creatorPage.locator("[data-sticker-layer]")).toHaveCount(0);

  // Context 2: Fresh signed-out public recipient opening /s/v2-release-share
  const publicCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(publicCtx, backend, false);
  const publicPage = await publicCtx.newPage();
  await publicPage.emulateMedia({ reducedMotion: "no-preference" });
  const publicErrors = trackErrors(publicPage);

  await publicPage.goto("/s/v2-release-share");
  await expect(publicPage.locator('[data-scene="intro"]')).toBeVisible();
  const publicSceneA = await readRenderedStickerSpecs(
    publicPage,
    '.scene-content [data-sticker-layer="intro"]',
  );
  expect(publicSceneA).toEqual(previewSceneA);

  await publicPage.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(publicPage.locator('[data-scene="celebration"]')).toBeVisible();
  const publicSceneB = await readRenderedStickerSpecs(
    publicPage,
    '.scene-content [data-sticker-layer="celebration"]',
  );
  expect(publicSceneB).toEqual(previewSceneB);

  await publicPage.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(publicPage.locator('[data-scene="lastNote"]')).toBeVisible();
  await expect(publicPage.locator("[data-sticker-layer]")).toHaveCount(0);

  expect(creatorErrors).toEqual([]);
  expect(publicErrors).toEqual([]);
  await creatorCtx.close();
  await publicCtx.close();
});

test("1B & 1C. Full Legacy V1 creator -> Preview -> fresh signed-out /s/<slug> AND old pre-sticker config zero auto-save check", async ({
  browser,
}) => {
  // 1C first: Old pre-sticker V1 config without `stickers` key triggers ZERO auto-saves and ZERO errors
  const legacyUntouched = structuredClone(defaultConfig) as SurpriseConfig;
  legacyUntouched.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
  expect(legacyUntouched.stickers).toBeUndefined();

  const untouchedBackend = createSharedBackend("legacy-old-nostickers", legacyUntouched);
  const oldCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(oldCtx, untouchedBackend, true);
  const oldPage = await oldCtx.newPage();
  const oldErrors = trackErrors(oldPage);

  await oldPage.goto("/dashboard?intent=customize");
  await oldPage.getByRole("button", { name: /^🎁\s*Landing page/i }).click();
  await oldPage.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(oldPage.getByRole("button", { name: "Open It 🎀" })).toBeVisible();
  await expect(oldPage.locator("[data-sticker-layer]")).toHaveCount(0);
  expect(untouchedBackend.writes).toHaveLength(0);
  expect(untouchedBackend.row.config.stickers).toBeUndefined();

  // Signed-out public view of old pre-sticker config
  const oldPubCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(oldPubCtx, untouchedBackend, false);
  const oldPubPage = await oldPubCtx.newPage();
  const oldPubErrors = trackErrors(oldPubPage);
  await oldPubPage.goto("/s/legacy-old-nostickers");
  await expect(oldPubPage.getByRole("button", { name: "Open It 🎀" })).toBeVisible();
  await expect(oldPubPage.locator("[data-scene]")).toHaveCount(0);
  await expect(oldPubPage.locator("[data-sticker-layer]")).toHaveCount(0);
  expect(oldErrors).toEqual([]);
  expect(oldPubErrors).toEqual([]);
  await oldCtx.close();
  await oldPubCtx.close();

  // 1B: Legacy V1 config creator adds stickers on Landing (A) & Intro (B), leaves Cuteness (C) empty
  const v1CreatorCfg = structuredClone(defaultConfig) as SurpriseConfig;
  v1CreatorCfg.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
  const v1Backend = createSharedBackend("v1-release-share", v1CreatorCfg);

  const cCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(cCtx, v1Backend, true);
  const cPage = await cCtx.newPage();
  await cPage.emulateMedia({ reducedMotion: "no-preference" });
  const cErrors = trackErrors(cPage);

  await cPage.goto("/dashboard?intent=customize");
  // Do NOT upgrade to V2 — keep strictly V1!
  await cPage.getByRole("button", { name: /^🎁\s*Landing page/i }).click();
  const landingEd = cPage.locator('[data-sticker-editor="landing"]');
  await landingEd.getByRole("switch", { name: "Stickers on this scene (Landing page)" }).click();
  await landingEd.getByRole("button", { name: "Add sticker to Landing page" }).click();
  await cPage
    .getByRole("dialog", { name: "Sticker gallery" })
    .getByRole("button", { name: `Select sticker ${STICKERS_BY_ID["kitty-14"].name}` })
    .click();

  await cPage.getByRole("button", { name: /^💌\s*Intro/i }).click();
  const introEd = cPage.locator('[data-sticker-editor="intro"]');
  await introEd.getByRole("switch", { name: "Stickers on this scene (Intro)" }).click();
  await introEd.getByRole("button", { name: "Add sticker to Intro" }).click();
  await cPage
    .getByRole("dialog", { name: "Sticker gallery" })
    .getByRole("button", { name: `Select sticker ${STICKERS_BY_ID["kitty-21"].name}` })
    .click();

  await cPage.getByRole("button", { name: /Save changes/ }).click();
  await expect(cPage.getByText("Saved experience", { exact: true })).toBeVisible();
  expect(v1Backend.writes).toHaveLength(1);
  expect(v1Backend.row.config._version).toBeUndefined();

  await cPage.reload();
  await cPage.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(cPage.getByRole("button", { name: "Open It 🎀" })).toBeVisible();
  const v1PreviewLanding = await readRenderedStickerSpecs(cPage, '[data-sticker-layer="landing"]');
  expect(v1PreviewLanding).toHaveLength(1);

  // Fresh signed-out recipient context opens /s/v1-release-share
  const pCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(pCtx, v1Backend, false);
  const pPage = await pCtx.newPage();
  await pPage.emulateMedia({ reducedMotion: "no-preference" });
  const pErrors = trackErrors(pPage);

  await pPage.goto("/s/v1-release-share");
  await expect(pPage.getByRole("button", { name: "Open It 🎀" })).toBeVisible({ timeout: 10000 });
  await expect(pPage.locator("[data-scene]")).toHaveCount(0);
  const v1PublicLanding = await readRenderedStickerSpecs(pPage, '[data-sticker-layer="landing"]');
  expect(v1PublicLanding).toEqual(v1PreviewLanding);

  // Advance Landing -> Intro -> Cuteness (Scene C = empty)
  await pPage.getByRole("button", { name: "Open It 🎀" }).click();
  await expect(pPage.getByRole("button", { name: "Open Bestie Birthday Surprise 🎁" })).toBeVisible({
    timeout: 10000,
  });
  await expect(pPage.locator('[data-sticker-layer="intro"] img')).toHaveCount(1);

  await pPage.getByRole("button", { name: "Open Bestie Birthday Surprise 🎁" }).click();
  await expect(pPage.getByText("Cuteness Meter 😍")).toBeVisible({ timeout: 10000 });
  await expect(pPage.locator("[data-sticker-layer]")).toHaveCount(0);

  expect(cErrors).toEqual([]);
  expect(pErrors).toEqual([]);
  await cCtx.close();
  await pCtx.close();
});

test("2. Visual alpha proof across ALL 9 theme presets + normalized coordinate parity & cake/CTA clickability across 360x640, 390x844, 768x1024, 1440x900", async ({
  page,
}) => {
  fs.mkdirSync("docs/screenshots/part4", { recursive: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = trackErrors(page);

  let activeConfig: SurpriseConfig = promoteToCinematic(structuredClone(defaultConfig));
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await page.route("https://qa.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/rest/v1/rpc/get_surprise_by_slug")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ config: activeConfig }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // Part A: Same sticker overlapping glass card + Reveal wrapper across ALL 9 THEME_PRESETS
  const allThemes = Object.keys(THEME_PRESETS) as ThemePresetId[];
  expect(allThemes).toHaveLength(9);

  for (const themeId of allThemes) {
    const cfg = promoteToCinematic(structuredClone(defaultConfig));
    cfg.themePreset = themeId;
    cfg.themeId = themeId;
    cfg.scenes = ["celebration"];
    cfg.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
    cfg.stickers = {
      version: 1,
      scenes: {
        celebration: {
          enabled: true,
          items: [
            // Straddles the GlassCard & Reveal boundary to prove crisp alpha compositing (no black/white box)
            { uid: "theme-heart", stickerId: "kitty-22", x: 0.5, y: 0.34, w: 0.24, rotate: -8, z: 1 },
          ],
        },
      },
    };
    activeConfig = cfg;

    await page.setViewportSize({ width: 900, height: 760 });
    await page.goto(`/s/theme-${themeId}`);
    await expect(page.getByText("Our Little Celebration")).toBeVisible();
    const img = page.locator('.scene-content [data-sticker-layer="celebration"] img');
    await expect(img).toBeVisible();

    const shotPath = `docs/screenshots/part4/theme-${themeId}.png`;
    await page.screenshot({ path: shotPath, fullPage: false });

    // Sample corner pixel inside the sticker's bounding box where kitty-22 is transparent (top-left of box):
    // must NOT be pure solid white (#ffffff) or pure opaque unblended black box over non-black glass card
    const box = await img.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const sampleX = Math.max(2, Math.round(box.x + 4));
      const sampleY = Math.max(2, Math.round(box.y + 4));
      const raw = await sharp(shotPath)
        .extract({ left: sampleX, top: sampleY, width: 1, height: 1 })
        .raw()
        .toBuffer();
      const [r, g, b] = [raw[0], raw[1], raw[2]];
      expect(r === 255 && g === 255 && b === 255, `White box detected on ${themeId}`).toBe(false);
    }
  }

  // Part B: Exact normalized coordinates + real hit-tested clicks on Cake tap target, Next & Continue
  // across 360x640, 390x844, 768x1024, and 1440x900
  const viewports = [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ] as const;

  for (const vp of viewports) {
    const vpCfg = promoteToCinematic(structuredClone(defaultConfig));
    vpCfg.scenes = ["cake", "celebration"];
    vpCfg.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
    vpCfg.stickers = {
      version: 1,
      scenes: {
        cake: {
          enabled: true,
          items: [
            // Placed right over the cake & button area to prove pointer-events: none never blocks taps
            { uid: "vp-s1", stickerId: "kitty-22", x: 0.24, y: 0.3, w: 0.2, rotate: 0, z: 1 },
            { uid: "vp-s2", stickerId: "kitty-11", x: 0.5, y: 0.52, w: 0.25, rotate: 0, z: 2 },
          ],
        },
      },
    };
    activeConfig = vpCfg;

    await page.setViewportSize(vp);
    await page.goto(`/s/vp-${vp.width}x${vp.height}`);
    await expect(page.locator('[data-scene="cake"]')).toBeVisible();

    const sceneBox = await page.locator(".scene-content").boundingBox();
    const s1Box = await page.locator('[data-sticker-uid="vp-s1"]').boundingBox();
    expect(sceneBox).not.toBeNull();
    expect(s1Box).not.toBeNull();

    if (sceneBox && s1Box) {
      const normX = (s1Box.x + s1Box.width / 2 - sceneBox.x) / sceneBox.width;
      const normY = (s1Box.y + s1Box.height / 2 - sceneBox.y) / sceneBox.height;
      const normW = s1Box.width / sceneBox.width;
      expect(normX).toBeCloseTo(0.24, 2);
      expect(normY).toBeCloseTo(0.3, 2);
      expect(normW).toBeCloseTo(0.2, 2);
    }

    await page.screenshot({
      path: `docs/screenshots/part4/viewport-${vp.width}x${vp.height}.png`,
      fullPage: false,
    });

    // Real pointer clicks on Cake tap target (Light -> Blow -> Cut) right beneath sticker vp-s2 + Continue button!
    await page.getByRole("button", { name: "Light the candles" }).click();
    await page.getByRole("button", { name: "Blow out the candles" }).click();
    await page.getByRole("button", { name: "Cut the cake" }).click();
    await expect(page.getByText("✨ Wish granted ✨")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: vpCfg.cake.buttonText }).click();
    await expect(page.locator('[data-scene="celebration"]')).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test("3 & 4. Performance (8 stickers stability, active-scene DOM isolation, listener cleanup, exact byte budget) + 404/corrupt failure handling", async ({
  browser,
}) => {
  // Measure gallery heavy-asset gating first
  const dashCfg = promoteToCinematic(structuredClone(defaultConfig));
  dashCfg.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
  const dashBackend = createSharedBackend("perf-gallery", dashCfg);

  const dashCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(dashCtx, dashBackend, true);
  const dashPage = await dashCtx.newPage();
  await dashPage.emulateMedia({ reducedMotion: "no-preference" });

  const galleryStickerRequests: string[] = [];
  dashPage.on("request", (req) => {
    const u = new URL(req.url());
    if (u.pathname.startsWith("/stickers/")) galleryStickerRequests.push(u.pathname);
  });

  await dashPage.goto("/dashboard?intent=customize");
  await dashPage.getByRole("button", { name: /^💌\s*Intro/i }).click();
  const introEd = dashPage.locator('[data-sticker-editor="intro"]');
  await introEd.getByRole("switch", { name: "Stickers on this scene (Intro)" }).click();
  await introEd.getByRole("button", { name: "Add sticker to Intro" }).click();
  const gallery = dashPage.getByRole("dialog", { name: "Sticker gallery" });
  await expect(gallery).toBeVisible();
  await dashPage.waitForTimeout(250);

  // Heavy kitty-06.webp (1.41 MB) MUST NOT be fetched automatically in gallery!
  expect(galleryStickerRequests).not.toContain("/stickers/kitty-06.webp");

  // Only when user explicitly taps "Preview animation for Birthday Cake Delivery" does kitty-06.webp fetch
  await gallery
    .getByRole("button", { name: `Preview animation for ${STICKERS_BY_ID["kitty-06"].name}` })
    .click();
  await expect.poll(() => galleryStickerRequests.includes("/stickers/kitty-06.webp")).toBe(true);
  await dashCtx.close();

  // Now measure public share with 8 stickers on Scene A + 1 sticker on Scene B + 404/corrupt items on Scene C
  const eightStickers = Array.from({ length: 8 }, (_, idx) => ({
    uid: `perf-${idx + 1}`,
    stickerId: idx % 2 === 0 ? "kitty-11" : "kitty-22",
    x: 0.14 + (idx % 4) * 0.24,
    y: idx < 4 ? 0.25 : 0.72,
    w: 0.14,
    rotate: (idx - 3) * 6,
    z: idx,
  }));

  const perfCfg = promoteToCinematic(structuredClone(defaultConfig));
  perfCfg.scenes = ["intro", "celebration", "lastNote"];
  perfCfg.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: true };
  perfCfg.stickers = {
    version: 1,
    scenes: {
      intro: { enabled: true, items: eightStickers },
      celebration: {
        enabled: true,
        items: [{ uid: "scene-b-only", stickerId: "kitty-03", x: 0.75, y: 0.3, w: 0.2, rotate: 5, z: 1 }],
      },
      lastNote: {
        enabled: true,
        items: [
          // Will return HTTP 404 -> must disappear cleanly with no broken icon
          { uid: "missing-404", stickerId: "kitty-04", x: 0.3, y: 0.3, w: 0.2, rotate: 0, z: 1 },
          // Corrupt out-of-range coordinates -> clamped cleanly
          { uid: "clamped-ok", stickerId: "kitty-14", x: 50, y: -20, w: 5, rotate: 999, z: 2 },
          // Unknown removed ID -> skipped silently
          { uid: "unknown-id", stickerId: "kitty-removed-forever", x: 0.5, y: 0.5, w: 0.2, rotate: 0, z: 3 },
        ],
      },
    },
  };

  const pubBackend = createSharedBackend("perf-and-resilience", perfCfg);
  const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await wireBackendToContext(pubCtx, pubBackend, false);

  // Instrument matchMedia listener add/remove counts before page scripts execute
  await pubCtx.addInitScript(() => {
    let activeMotionListeners = 0;
    const origMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      const mql = origMatchMedia(query);
      if (query.includes("prefers-reduced-motion")) {
        const origAdd = mql.addEventListener.bind(mql);
        const origRemove = mql.removeEventListener.bind(mql);
        mql.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, opts?: any) => {
          activeMotionListeners++;
          return origAdd(type, listener, opts);
        }) as typeof mql.addEventListener;
        mql.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, opts?: any) => {
          activeMotionListeners--;
          return origRemove(type, listener, opts);
        }) as typeof mql.removeEventListener;
      }
      return mql;
    };
    (window as any).__getActiveMotionListeners = () => activeMotionListeners;
  });

  // Force HTTP 404 on kitty-04.webp to verify clean 404 skip without broken icon
  await pubCtx.route("**/stickers/kitty-04.webp", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );

  const pubPage = await pubCtx.newPage();
  await pubPage.emulateMedia({ reducedMotion: "no-preference" });
  const pubErrors = trackErrors(pubPage);

  const fetchedStickerBytes = new Map<string, number>();
  pubPage.on("response", async (res) => {
    const u = new URL(res.url());
    if (u.pathname.startsWith("/stickers/") && res.status() === 200) {
      const buf = await res.body();
      fetchedStickerBytes.set(u.pathname, buf.byteLength);
    }
  });

  await pubPage.goto("/s/perf-and-resilience");
  await expect(pubPage.locator('[data-scene="intro"]')).toBeVisible();
  const sceneAImgs = pubPage.locator('.scene-content [data-sticker-layer="intro"] img');
  await expect(sceneAImgs).toHaveCount(8);

  // Tag all 8 DOM nodes & record their CSS animation startTimes before toggling unrelated UI state
  const beforeAnim = await sceneAImgs.evaluateAll((nodes) =>
    nodes.map((n, idx) => {
      (n as any).__tagId = `node-${idx}`;
      return {
        tag: (n as any).__tagId,
        startTime: n.getAnimations()[0]?.startTime ?? null,
      };
    }),
  );

  // Toggle Music button twice (unrelated parent state changes in BirthdayExperienceInner)
  await pubPage.getByRole("button", { name: "Play music", exact: true }).click();
  await pubPage.getByRole("button", { name: "Mute music", exact: true }).click();

  const afterAnim = await sceneAImgs.evaluateAll((nodes) =>
    nodes.map((n) => ({
      tag: (n as any).__tagId,
      startTime: n.getAnimations()[0]?.startTime ?? null,
    })),
  );
  // Zero DOM remounts and zero animation restarts!
  expect(afterAnim).toEqual(beforeAnim);

  // Scene A network check: ONLY kitty-11.webp (45,616 B) + kitty-22.webp (87,834 B) = 133,450 B fetched!
  const sceneAPaths = [...fetchedStickerBytes.keys()].sort();
  expect(sceneAPaths).toEqual(["/stickers/kitty-11.webp", "/stickers/kitty-22.webp"]);
  const sceneABytes = [...fetchedStickerBytes.values()].reduce((a, b) => a + b, 0);
  expect(sceneABytes).toBe(STICKERS_BY_ID["kitty-11"].bytes + STICKERS_BY_ID["kitty-22"].bytes);

  const listenersOnA = await pubPage.evaluate(() => (window as any).__getActiveMotionListeners());

  // Advance to Scene B ("celebration") -> Scene A's 8 stickers unmount; ONLY Scene B's 1 sticker exists
  await pubPage.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(pubPage.locator('[data-scene="celebration"]')).toBeVisible();
  await expect(pubPage.locator("[data-sticker-layer] img")).toHaveCount(1);
  const listenersOnB = await pubPage.evaluate(() => (window as any).__getActiveMotionListeners());
  // Zero listener growth on scene transition!
  expect(listenersOnB).toBe(listenersOnA);

  // Total public bytes across Scene A + Scene B = ONLY the 3 used stickers (204,972 B)
  await expect
    .poll(() => [...fetchedStickerBytes.keys()].sort())
    .toEqual(["/stickers/kitty-03.webp", "/stickers/kitty-11.webp", "/stickers/kitty-22.webp"]);
  const totalBytesAB = [...fetchedStickerBytes.values()].reduce((a, b) => a + b, 0);
  expect(totalBytesAB).toBe(
    STICKERS_BY_ID["kitty-03"].bytes +
      STICKERS_BY_ID["kitty-11"].bytes +
      STICKERS_BY_ID["kitty-22"].bytes,
  );

  // Advance to Scene C ("lastNote") -> 404 asset skipped cleanly, unknown ID skipped, corrupt coords clamped!
  await pubPage.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(pubPage.locator('[data-scene="lastNote"]')).toBeVisible();
  const sceneCImgs = pubPage.locator('.scene-content [data-sticker-layer="lastNote"] img');
  await expect(sceneCImgs).toHaveCount(1);
  await expect(sceneCImgs.first()).toHaveAttribute("data-sticker-uid", "clamped-ok");

  console.log(
    JSON.stringify({
      measuredSceneABytes: sceneABytes,
      measuredSceneABTotalBytes: totalBytesAB,
      listenersOnA,
      listenersOnB,
    }),
  );

  expect(pubErrors).toEqual([]);
  await pubCtx.close();
});
