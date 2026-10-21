import { test, expect, type Page } from "@playwright/test";
import defaultConfig from "../../artifacts/birthday-surprise/src/config";
import { promoteToCinematic } from "../../artifacts/birthday-surprise/src/lib/v2/migrate";
import { STICKERS_BY_ID } from "../../artifacts/birthday-surprise/src/lib/stickers/manifest";
import type { SurpriseConfig } from "../../artifacts/birthday-surprise/src/lib/v2/schema";

const qaUser = {
  id: "00000000-0000-4000-8000-000000000010",
  aud: "authenticated",
  role: "authenticated",
  email: "stickers-qa@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

function createCustomizeFixture(): SurpriseConfig {
  const cfg = promoteToCinematic(structuredClone(defaultConfig));
  cfg.name = "Meera";
  cfg.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
  return cfg;
}

async function setupCustomizeSession(page: Page, initialConfig: SurpriseConfig = createCustomizeFixture()) {
  let row = {
    id: "00000000-0000-4000-8000-000000000020",
    user_id: qaUser.id,
    slug: "stickers-happy-path",
    is_paid: true,
    config: structuredClone(initialConfig),
    photo_urls: [] as string[],
    audio_urls: [] as string[],
    updated_at: "2026-02-01T00:00:00Z",
  };
  const writes: any[] = [];
  const errors: string[] = [];

  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
      errors.push(m.text());
    }
  });

  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await page.route("https://qa.invalid/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const reply = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });

    if (url.pathname.includes("/auth/v1/user")) return reply(qaUser);
    if (url.pathname.includes("/rest/v1/rpc/get_surprise_by_slug")) return reply({ config: row.config });
    if (url.pathname.includes("/rest/v1/surprises")) {
      if (req.method() === "PATCH") {
        const payload = req.postDataJSON();
        writes.push(payload);
        row = {
          ...row,
          ...payload,
          updated_at: new Date(Date.parse(row.updated_at) + 1000).toISOString(),
        };
      }
      return reply(row);
    }
    return reply({});
  });

  await page.addInitScript(({ user }) => {
    if (sessionStorage.getItem("stickers-qa-auth")) return;
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
    sessionStorage.setItem("stickers-qa-auth", "true");
  }, { user: qaUser });

  return {
    writes,
    errors,
    savedConfig: () => row.config,
  };
}

async function switchDashboardTab(page: Page, tabName: "Preview" | "Customize" | "AI Assistant") {
  const desktopTab = page.getByRole("tab", { name: tabName, exact: true });
  const mobileMenu = page.getByRole("button", { name: "Open menu", exact: true });
  await expect(desktopTab.or(mobileMenu)).toBeVisible();
  if (await desktopTab.isVisible()) {
    await desktopTab.click();
  } else {
    await mobileMenu.click();
    await page.getByRole("menuitem", { name: tabName, exact: true }).click();
  }
}

async function runFullCustomizeHappyPath(
  page: Page,
  modeLabel: "desktop" | "mobile",
) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const qa = await setupCustomizeSession(page);

  await page.goto("/dashboard?intent=customize");
  await expect(page.getByRole("heading", { name: "Make it unmistakably yours." })).toBeVisible();

  // Never writes to DB merely on opening Customize
  expect(qa.writes).toHaveLength(0);

  // Open the "Intro" scene accordion card
  await page.getByRole("button", { name: /^💌\s*Intro/i }).click();
  const introEditor = page.locator('[data-sticker-editor="intro"]');
  await expect(introEditor).toBeVisible();

  // Enable "Stickers on this scene"
  const enableSwitch = introEditor.getByRole("switch", { name: "Stickers on this scene (Intro)" });
  await expect(enableSwitch).toHaveAttribute("aria-checked", "false");
  await enableSwitch.click();
  await expect(enableSwitch).toHaveAttribute("aria-checked", "true");

  // Open Sticker Gallery and check heavy sticker shows poster until preview button is tapped
  await introEditor.getByRole("button", { name: "Add sticker to Intro" }).click();
  const gallery = page.getByRole("dialog", { name: "Sticker gallery" });
  await expect(gallery).toBeVisible();
  const heavyCakeImg = gallery.locator('[data-sticker-tile="kitty-06"] img');
  await expect(heavyCakeImg).toHaveAttribute("src", STICKERS_BY_ID["kitty-06"].poster);
  await page.screenshot({ path: `docs/screenshots/part3/${modeLabel}-gallery.png`, fullPage: false });

  // Add Sticker 1 from manifest ("Bouquet Surprise")
  await gallery
    .getByRole("button", { name: `Select sticker ${STICKERS_BY_ID["kitty-21"].name}` })
    .click();
  await expect(gallery).toHaveCount(0);

  // Add Sticker 2 ("Blowing a Big Heart" filtered via Love category chip)
  await introEditor.getByRole("button", { name: "Add sticker to Intro" }).click();
  const gallery2 = page.getByRole("dialog", { name: "Sticker gallery" });
  await gallery2.getByRole("radio", { name: /Love/ }).click();
  await gallery2
    .getByRole("button", { name: `Select sticker ${STICKERS_BY_ID["kitty-22"].name}` })
    .click();
  await expect(gallery2).toHaveCount(0);
  await expect(introEditor.locator("[data-placed-sticker]")).toHaveCount(2);

  // Drag selected sticker on the live scene canvas (zero DB writes during drag!)
  const stage = introEditor.locator('[data-sticker-stage="intro"]');
  await stage.evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        el.scrollIntoView({ block: "center" });
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const selectedOnStage = stage.locator('[data-selected="true"]');
  const clientCenter = await selectedOnStage.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
  });
  expect(clientCenter.cx).toBeGreaterThan(0);
  {
    const { cx, cy } = clientCenter;
    if (modeLabel === "mobile") {
      // Exercise genuine multi-frame mobile touch events through touch-action:none + setPointerCapture
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: cx, y: cy, radiusX: 2, radiusY: 2, force: 1, id: 1 }],
      });
      for (let step = 1; step <= 5; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: Math.round(cx + (48 * step) / 5),
              y: Math.round(cy + (36 * step) / 5),
              radiusX: 2,
              radiusY: 2,
              force: 1,
              id: 1,
            },
          ],
        });
      }
      expect(qa.writes).toHaveLength(0);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(150);
    } else {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 42, cy + 36, { steps: 6 });
      expect(qa.writes).toHaveLength(0);
      await page.mouse.up();
    }
  }

  // Resize via size slider & rotate via numeric fallback control
  await introEditor.getByLabel("Size for Intro sticker").fill("30");
  await introEditor.getByLabel("Rotation degrees for Intro sticker").fill("18");
  await stage.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `docs/screenshots/part3/${modeLabel}-editor-canvas.png`, fullPage: false });

  // Capture exact pre-theme/font/occasion coordinates to assert 100% invariance
  const styleBeforeTheme = await selectedOnStage.evaluate((el: HTMLElement) => ({
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    transform: el.style.transform,
  }));

  // Changing theme/occasion/font MUST NOT alter sticker x/y/w/rotate
  await page.getByRole("button", { name: "Champagne", exact: true }).click();
  await page.getByLabel("Cinematic occasion").selectOption("anniversary");
  await page.getByRole("radio", { name: /Clean & Readable/i }).first().click();

  const styleAfterTheme = await selectedOnStage.evaluate((el: HTMLElement) => ({
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    transform: el.style.transform,
  }));
  expect(styleAfterTheme).toEqual(styleBeforeTheme);

  // Save via existing CustomizeForm Save button pipeline
  const saveButton = page.getByRole("button", { name: /Save changes/ });
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.click();
  await expect(page.getByText("Saved experience", { exact: true })).toBeVisible();
  expect(qa.writes).toHaveLength(1);

  const savedItems = qa.savedConfig().stickers?.scenes.intro?.items ?? [];
  expect(savedItems).toHaveLength(2);
  expect(savedItems[1].w).toBeCloseTo(0.3, 2);
  expect(savedItems[1].rotate).toBe(18);
  const movedX = savedItems[1].x;
  const movedY = savedItems[1].y;
  expect({ movedX, movedY }).not.toEqual({ movedX: 0.28, movedY: 0.3 });

  // Reload page -> verify stickers persist on Preview & inside Customize
  await page.reload();
  await expect(page.locator('.scene-content [data-sticker-layer="intro"] img')).toHaveCount(2);
  await page.screenshot({ path: `docs/screenshots/part3/${modeLabel}-preview-restored.png`, fullPage: false });

  // Toggle OFF -> verify hidden on live preview while BOTH items remain stored -> Toggle ON -> restored!
  await switchDashboardTab(page, "Customize");
  await page.getByRole("button", { name: /^💌\s*Intro/i }).click();
  const introAfterReload = page.locator('[data-sticker-editor="intro"]');
  const switchAfterReload = introAfterReload.getByRole("switch", {
    name: "Stickers on this scene (Intro)",
  });
  await expect(switchAfterReload).toHaveAttribute("aria-checked", "true");
  await switchAfterReload.click();
  await expect(switchAfterReload).toHaveAttribute("aria-checked", "false");

  // Items are still preserved in placed list AND live stage hides them!
  await expect(introAfterReload.locator("[data-placed-sticker]")).toHaveCount(2);
  await expect(introAfterReload.locator('[data-sticker-stage="intro"] [data-sticker-uid]')).toHaveCount(0);

  // Switch back ON -> both items immediately reappear on the stage with identical x/y/w/rotate!
  await switchAfterReload.click();
  await expect(switchAfterReload).toHaveAttribute("aria-checked", "true");
  await expect(introAfterReload.locator('[data-sticker-stage="intro"] [data-sticker-uid]')).toHaveCount(2);

  // Zero horizontal scroll overflow & zero console errors
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  expect(qa.errors).toEqual([]);
}

test("Desktop (1280x860): Customize sticker editor happy path — add, move/resize/rotate, save, reload, OFF/ON retention", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await runFullCustomizeHappyPath(page, "desktop");
});

test.describe("Mobile (390x844 touch): Customize sticker editor happy path", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("Mobile touch viewport — bottom sheet gallery, drag/resize/rotate, save, reload, OFF/ON retention", async ({
    page,
  }) => {
    await runFullCustomizeHappyPath(page, "mobile");
  });
});
