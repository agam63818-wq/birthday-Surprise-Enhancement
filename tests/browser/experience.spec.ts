import { test, expect, type Page } from "@playwright/test";
import defaultConfig from "../../artifacts/birthday-surprise/src/config";
import { promoteToCinematic, DEFAULT_V2_SCENE_SEQUENCE } from "../../artifacts/birthday-surprise/src/lib/v2/migrate";
import { SCENE_REGISTRY } from "../../artifacts/birthday-surprise/src/lib/v2/registry";
import type { SurpriseConfig, SceneId } from "../../artifacts/birthday-surprise/src/lib/v2/schema";

// Network fixtures only. No real Supabase credentials, payment calls or live user data.
const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "qa@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
function fixture(): SurpriseConfig {
  const config = promoteToCinematic(structuredClone(defaultConfig));
  config.name = "QA Recipient";
  config.intro.heading = "A surprise for you";
  config.intro.message = "A few little moments to make your day.";
  config.giftReveal = { senderName: "QA Sender", message: "A special message", photoUrl: "" };
  config.butterfly = { message: "A little magic", subMessage: "Just for you" };
  config.roseBloom = { text: "Always remembered", speed: "fast", intensity: "subtle", fallingPetals: false, soundEnabled: false };
  config.memoryWall.photos = [];
  config.lastNote.lines = ["Our first memory", "Thank you for being here"];
  config.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
  return config;
}
async function setup(page: Page, initial: SurpriseConfig = fixture(), signedIn = true) {
  let row = { id: "00000000-0000-4000-8000-000000000002", user_id: user.id, slug: "qa-surprise", is_paid: true, config: initial, photo_urls: [], audio_urls: [], updated_at: "2026-01-01T00:00:00Z" };
  const writes: any[] = [];
  const errors: string[] = [];
  const loaded: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text()); });
  page.on("request", req => loaded.push(req.url()));
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://qa.invalid/**", async route => {
    const req = route.request(); const url = new URL(req.url());
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname.includes("/auth/v1/user")) return reply(user);
    if (url.pathname.includes("/functions/v1/generate-surprise-structure")) {
      const body = req.postDataJSON();
      if (body.request?.includes("unsupported")) return reply({ patch: { changes: [] } });
      if (body.request?.includes("malformed")) return reply({ patch: { changes: [{ path: "features.arbitrary", value: true }] } });
      if (body.mode === "patch") return reply({ patch: { changes: [{ path: "themePreset", value: "oceanNight" }, { path: "butterfly.message", value: "An AI-reviewed message" }] } });
      return reply({ config: { name: "Guided recipient", intro: { message: "Guided memory" } } });
    }
    if (url.pathname.includes("/rest/v1/rpc/get_surprise_by_slug")) return reply({ config: row.config });
    if (url.pathname.includes("/rest/v1/surprises")) {
      if (req.method() === "PATCH") {
        expect(url.searchParams.get("user_id")).toBe(`eq.${user.id}`);
        expect(url.searchParams.get("updated_at")).toBe(`eq.${row.updated_at}`);
        const payload = req.postDataJSON(); writes.push(payload);
        row = { ...row, ...payload, updated_at: new Date(Date.parse(row.updated_at) + 1000).toISOString() };
      }
      return reply(row);
    }
    return reply({});
  });
  if (signedIn) await page.addInitScript(({ user }) => {
    if (sessionStorage.getItem("qa-seeded")) return;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp }))}.qa`;
    localStorage.setItem("sb-qa-auth-token", JSON.stringify({ access_token: token, refresh_token: "qa-refresh", expires_at: exp, expires_in: 3600, token_type: "bearer", user }));
    sessionStorage.setItem("qa-seeded", "true");
  }, { user });
  await page.emulateMedia({ reducedMotion: "reduce" });
  return { writes, errors, loaded, saved: () => row.config };
}
async function tab(page: Page, name: string) {
  const desktop = page.getByRole("tab", { name, exact: true });
  if (await desktop.isVisible()) await desktop.click();
  else { await page.getByRole("button", { name: "Open menu", exact: true }).click(); await page.getByRole("menuitem", { name, exact: true }).click(); }
}
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }

test("canonical editor, notebook, reorder, AI review/cancel/apply/undo, save and public reload", async ({ page }) => {
  const qa = await setup(page);
  await page.goto("/dashboard?intent=customize");
  await expect(page.getByRole("heading", { name: "Make it unmistakably yours." })).toBeVisible();
  await page.getByLabel("Recipient name", { exact: true }).fill("Asha QA");
  await page.getByLabel("Cinematic occasion").selectOption("anniversary");
  await page.getByRole("button", { name: "Champagne", exact: true }).click();
  await page.getByLabel("Enable Butterfly", { exact: true }).first().uncheck();
  await page.getByRole("button", { name: "Move Rose Bloom up", exact: true }).click();
  await page.getByText("Interactive notebook", { exact: true }).click();
  await page.getByRole("button", { name: "Add notebook page", exact: true }).click();
  await page.getByLabel("Page title", { exact: true }).fill("A personal letter");
  await page.getByLabel("Letter content", { exact: true }).fill("Remember our long walk?");
  await page.getByLabel("New page type", { exact: true }).selectOption("memory");
  await page.getByRole("button", { name: "Add notebook page", exact: true }).click();
  await page.getByLabel("Page title", { exact: true }).nth(1).fill("A memory");
  await page.getByLabel("Memory image URL", { exact: true }).fill("/missing-photo.png");
  await page.getByLabel("Memory caption", { exact: true }).fill("Still a lovely memory");
  await page.getByRole("button", { name: "Move page 2 up" }).click();
  await page.getByLabel("Enable page 2", { exact: true }).uncheck();
  await tab(page, "Preview");
  await expect(page.locator("[data-theme=champagne]")).toBeVisible();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "intro");
  await page.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "giftReveal");
  await expect(page.getByText("Asha QA", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Happy Anniversary", { exact: false }).first()).toBeVisible();
  await tab(page, "AI Assistant");
  await page.getByLabel("AI change request").fill("Use Ocean Night and personalize the butterfly");
  await page.getByRole("button", { name: "Review AI changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review proposed changes" })).toBeVisible();
  expect(qa.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Cancel changes" }).click();
  await page.getByRole("button", { name: "Review AI changes", exact: true }).click();
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.getByRole("button", { name: "Undo last AI change" })).toBeEnabled();
  await tab(page, "Customize");
  await expect(page.getByRole("button", { name: "Ocean Night", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Undo last AI change" }).click();
  await expect(page.getByRole("button", { name: "Champagne", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Saved experience", { exact: true })).toBeVisible();
  expect(qa.writes).toHaveLength(1);
  expect(qa.saved().name).toBe("Asha QA");
  expect(qa.saved().notebook?.pages[0].type).toBe("memory");
  expect(qa.saved().notebook?.pages[1].enabled).toBe(false);
  await page.reload();
  await expect(page.locator("[data-theme=champagne]")).toBeVisible();
  await page.goto("/s/qa-surprise");
  await expect(page.locator("[data-theme=champagne]")).toBeVisible();
  const expected = qa.saved().scenes!.filter(id => id !== "butterfly");
  for (let i = 0; i < expected.length; i++) {
    await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", expected[i]);
    if (expected[i] === "notebook") await expect(page.getByText("Still a lovely memory", { exact: true })).toBeVisible();
    if (i < expected.length - 1) await page.getByRole("button", { name: "Next scene", exact: true }).click();
  }
  expect(qa.loaded.some(url => /ButterflyScene/.test(url))).toBe(false);
  expect(qa.errors).toEqual([]);
  await noOverflow(page);
});

test("AI rejects malformed/unsupported proposals and blocks undo after newer user changes", async ({ page }) => {
  const qa = await setup(page);
  await page.goto("/dashboard"); await tab(page, "AI Assistant");
  await page.getByLabel("AI change request").fill("malformed request");
  await page.getByRole("button", { name: "Review AI changes", exact: true }).click();
  await expect(page.getByText("The AI returned an unexpected response.", { exact: false })).toBeVisible();
  await page.getByLabel("AI change request").fill("unsupported request");
  await page.getByRole("button", { name: "Review AI changes", exact: true }).click();
  await expect(page.getByText("That request has no supported changes.", { exact: false })).toBeVisible();
  await page.getByLabel("AI change request").fill("Use Ocean Night");
  await page.getByRole("button", { name: "Review AI changes", exact: true }).click();
  await page.getByRole("button", { name: "Apply changes" }).click();
  await tab(page, "Customize");
  await page.getByLabel("Recipient name", { exact: true }).fill("Newer manual change");
  await expect(page.getByRole("button", { name: "Undo last AI change" })).toBeDisabled();
  expect(qa.writes).toHaveLength(0); expect(qa.errors).toEqual([]);
});

for (const width of [360, 390, 412, 768, 1280]) test(`mobile/tablet/desktop V2 flow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  const qa = await setup(page);
  await page.goto("/dashboard?intent=customize");
  await expect(page.getByRole("heading", { name: "Make it unmistakably yours." })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/editor-${width}.png`, fullPage: false });
  await tab(page, "Preview");
  for (let i = 0; i < DEFAULT_V2_SCENE_SEQUENCE.length; i++) {
    await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", DEFAULT_V2_SCENE_SEQUENCE[i]);
    await noOverflow(page);
    if (i < DEFAULT_V2_SCENE_SEQUENCE.length - 1) await page.getByRole("button", { name: "Next scene", exact: true }).click();
  }
  expect(qa.errors).toEqual([]);
});

for (const occasionType of ["birthday", "rakshabandhan", "mothersday", "fathersday", "loveday", "custom"] as const) test(`legacy public ${occasionType} stays V1 and can explicitly upgrade`, async ({ page }) => {
  const qa = await setup(page, { ...structuredClone(defaultConfig), occasionType });
  await page.goto("/s/qa-surprise");
  await expect(page.locator(".experience-root")).toBeVisible();
  await expect(page.locator("[data-scene]")).toHaveCount(0);
  await page.goto("/dashboard?intent=customize");
  await page.getByRole("button", { name: "Upgrade to Cinematic Experience" }).click();
  await tab(page, "Preview");
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "intro");
  expect(qa.writes).toHaveLength(0); expect(qa.errors).toEqual([]);
});

test("every scene can be independently disabled without loading it", async ({ page }) => {
  const config = fixture(); config.scenes = Object.keys(SCENE_REGISTRY) as SceneId[];
  config.features = Object.fromEntries(Object.values(SCENE_REGISTRY).map(meta => [meta.featureKey, false]));
  const qa = await setup(page, config);
  await page.goto("/dashboard");
  await expect(page.getByText("No scenes configured.", { exact: false })).toBeVisible();
  expect(qa.loaded.filter(url => /(?:Butterfly|GiftReveal|RoseBloom|Notebook|YouAndMe|Letters)Scene/.test(url))).toHaveLength(0);
  await tab(page, "Customize");
  await page.getByLabel("Enable Rose Bloom", { exact: true }).first().check();
  await tab(page, "Preview");
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "roseBloom");
  expect(qa.errors).toEqual([]);
});
