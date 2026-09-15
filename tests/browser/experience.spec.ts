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
async function setup(page: Page, initial: SurpriseConfig = fixture(), signedIn = true, motion: "reduce" | "no-preference" = "reduce") {
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
  await page.emulateMedia({ reducedMotion: motion });
  return { writes, errors, loaded, saved: () => row.config };
}
async function tab(page: Page, name: string) {
  const desktop = page.getByRole("tab", { name, exact: true });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await expect(desktop.or(menu)).toBeVisible();
  if (await desktop.isVisible()) await desktop.click();
  else {
    await menu.click();
    await page.getByRole("menuitem", { name, exact: true }).click();
  }
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
  await expect(page.getByText("A little memory, wrapped just for you.", { exact: true })).toBeVisible();
  await tab(page, "AI Assistant");
  await page.getByLabel("AI change request").fill("Use Ocean Night and personalize the butterfly");
  await page.getByRole("button", { name: "Review AI changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review proposed changes" })).toBeVisible();
  await expect(page.getByText("AI wants to change:")).toBeVisible();
  await expect(page.getByText("✓ Switch theme to oceanNight")).toBeVisible();
  await expect(page.getByText("✓ Change the butterfly message")).toBeVisible();
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

test("cinematic rose, letters, and recipient navigation", async ({ page }) => {
  const qa = await setup(page);
  await page.goto("/s/qa-surprise");
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "intro");
  await expect(page.getByText("Interactive Letters", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/\b\d+\s*\/\s*17\b/)).toHaveCount(0);
  const order = DEFAULT_V2_SCENE_SEQUENCE;
  for (let i = 0; i < order.length; i++) {
    await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", order[i]);
    if (order[i] === "letters") {
      await expect(page.getByRole("button", { name: /Open letter/i }).first()).toBeVisible();
      await expect(page.getByText("Letter 01 · Open")).toHaveCount(0);
      await page.getByRole("button", { name: /Open letter 01/i }).click();
      await expect(page.getByText("Our first memory", { exact: true })).toBeVisible();
    }
    if (order[i] === "roseBloom") {
      await expect(page.locator("[data-rose-stem]")).toBeVisible();
      await expect(page.locator("[data-rose-head]")).toBeVisible();
      await expect(page.getByText("Always remembered", { exact: true })).toBeVisible();
    }
    if (i < order.length - 1) await page.getByRole("button", { name: "Next scene", exact: true }).click();
  }
  expect(qa.errors).toEqual([]);
  await noOverflow(page);
});

test("butterfly canvas is sized as soon as the scene mounts", async ({ page }) => {
  const qa = await setup(page, fixture(), true, "no-preference");
  await page.goto("/s/qa-surprise");
  await page.getByRole("button", { name: "Next scene", exact: true }).click();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "butterfly");
  const canvas = page.locator("[data-butterfly-canvas]");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(80);
  expect(box?.height ?? 0).toBeGreaterThan(80);
  expect(qa.errors).toEqual([]);
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

function audioFixture(seconds = 12) {
  const rate = 8000; const size = seconds * rate * 2; const data = Buffer.alloc(44 + size);
  data.write("RIFF", 0); data.writeUInt32LE(36 + size, 4); data.write("WAVEfmt ", 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(size, 40);
  return data;
}
async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    const Native = window.Audio; const observed: HTMLAudioElement[] = [];
    (window as any).__qaAudio = observed;
    (window as any).Audio = function(...args: any[]) {
      const audio = new Native(...args); observed.push(audio);
      const pause = audio.pause.bind(audio);
      audio.pause = () => { (audio as any).__pausedAt = audio.currentTime; pause(); };
      return audio;
    };
    (window as any).Audio.prototype = Native.prototype;
  });
}

test("music controls autosave isolated settings and enforce the same custom segment in Preview and public playback", async ({ page }) => {
  const config = fixture(); config.audio.backgroundMusic = "/qa-track.wav";
  const qa = await setup(page, config);
  await page.route("**/qa-track.wav", route => route.fulfill({ status: 200, contentType: "audio/wav", body: audioFixture() }));
  await observeAudio(page);
  await page.goto("/dashboard?intent=customize");
  await page.getByLabel("Recipient name", { exact: true }).fill("Unpublished music test name");
  expect(qa.loaded.filter(url => url.includes("qa-track.wav"))).toHaveLength(0);
  await page.getByRole("button", { name: /Music.*1 of 2 songs set/ }).click();
  const card = page.getByRole("region", { name: "Background music controls", exact: true });
  await expect(card.getByText("0:12", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Replace", exact: true })).toBeVisible();
  const mode = page.getByLabel("Background music Playback Mode", { exact: true });
  await mode.selectOption("custom");
  await expect(card.getByText("Playback saved", { exact: true })).toBeVisible();
  expect(qa.saved().name).toBe("QA Recipient");
  const start = page.getByLabel("Background music Start Time (seconds)", { exact: true });
  const duration = page.getByLabel("Background music Play Duration (seconds)", { exact: true });
  await start.fill("2"); await start.press("Tab");
  await expect(card.getByText("Playback saved", { exact: true })).toBeVisible();
  await duration.fill("1"); await duration.press("Tab");
  await expect(card.getByText("Playback saved", { exact: true })).toBeVisible();
  await expect(card.getByText("0:03", { exact: true })).toBeVisible();
  expect(qa.saved().audio.playback?.backgroundMusic).toMatchObject({ mode: "custom", startTime: 2, duration: 1 });
  const writes = qa.writes.length;
  await duration.fill("99"); await duration.press("Tab");
  await expect(card.getByRole("alert")).toContainText("available audio length"); expect(qa.writes).toHaveLength(writes);
  await duration.fill("1"); await duration.press("Tab");
  await page.setViewportSize({ width: 360, height: 850 }); await noOverflow(page);
  await card.screenshot({ path: "test-results/music-controls-360.png" });
  await page.setViewportSize({ width: 1280, height: 850 });
  await tab(page, "Preview");
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__qaAudio.some((a: any) => !a.paused && a.currentTime >= 2))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__qaAudio.some((a: any) => a.paused && a.__pausedAt >= 3 && a.__pausedAt < 3.2))).toBe(true);
  await page.goto("/s/qa-surprise");
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__qaAudio.some((a: any) => !a.paused && a.currentTime >= 2))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__qaAudio.some((a: any) => a.paused && a.__pausedAt >= 3 && a.__pausedAt < 3.2))).toBe(true);
  expect(qa.errors).toEqual([]);
});

test("music reset, missing metadata, autosave failure and retry retain the canonical draft", async ({ page }) => {
  const config = fixture(); config.audio.backgroundMusic = "/qa-track.wav"; config.audio.birthdaySong = "/bad-audio.wav";
  const qa = await setup(page, config);
  await page.route("**/qa-track.wav", route => route.fulfill({ status: 200, contentType: "audio/wav", body: audioFixture() }));
  await page.route("**/bad-audio.wav", route => route.fulfill({ status: 404, body: "Missing" }));
  let fail = true;
  await page.route("https://qa.invalid/rest/v1/surprises**", async route => {
    if (route.request().method() === "PATCH" && fail) { fail = false; return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Conflict" }) }); }
    return route.fallback();
  });
  await page.goto("/dashboard?intent=customize");
  await page.getByRole("button", { name: /Music.*2 of 2 songs set/ }).click();
  const card = page.getByRole("region", { name: "Background music controls", exact: true });
  await page.getByLabel("Background music Playback Mode", { exact: true }).selectOption("loop");
  await expect(card.getByRole("alert")).toContainText("not saved");
  expect(qa.writes).toHaveLength(0);
  await card.getByRole("button", { name: "Retry playback save" }).click();
  await expect(card.getByText("Playback saved", { exact: true })).toBeVisible();
  expect(qa.saved().audio.playback?.backgroundMusic?.mode).toBe("loop");
  await card.getByRole("button", { name: "Reset to Full Song" }).click();
  await expect(card.getByText("Playback saved", { exact: true })).toBeVisible();
  expect(qa.saved().audio.playback?.backgroundMusic?.mode).toBe("full");
  await expect(page.getByLabel("Background music Start Time (seconds)", { exact: true })).toHaveCount(0);
  const bad = page.getByRole("region", { name: "Birthday song (plays after cutting the cake) controls", exact: true });
  await expect(bad.getByText("Metadata could not be read.", { exact: false })).toBeVisible();
  await expect(bad.locator('option[value="custom"]')).toBeDisabled();
  await bad.getByRole("button", { name: "Reset to Full Song" }).click();
  await expect(bad.getByText("Playback saved", { exact: true })).toBeVisible();
  expect(qa.saved().audio.birthdaySong).toBe("/bad-audio.wav"); expect(qa.errors).toEqual([]);
});
