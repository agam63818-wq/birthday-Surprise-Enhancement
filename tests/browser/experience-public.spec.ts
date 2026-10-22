import { test, expect, type Page } from "@playwright/test";
import defaultConfig from "../../artifacts/birthday-surprise/src/config";
import { promoteToCinematic } from "../../artifacts/birthday-surprise/src/lib/v2/migrate";
import type { SurpriseConfig } from "../../artifacts/birthday-surprise/src/lib/v2/schema";

const user = { id: "00000000-0000-4000-8000-000000000101", aud: "authenticated", role: "authenticated", email: "part5@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };

function fixture(): SurpriseConfig {
  const config = promoteToCinematic(structuredClone(defaultConfig));
  config.name = "Part 5 Recipient";
  config.giftReveal = { senderName: "Part 5 Sender", message: "A personal message", photoUrl: "" };
  config.scenes = ["heartTunnel", "loveConfession"];
  config.features = { ...config.features, heartTunnel: true, loveConfession: true, loveDrive: false };
  config.heartTunnel = { startMain: "Manual Heart Draft" };
  config.loveConfession = { question: "Manual Confession Draft?" };
  config.loveDrive = { objective: "Disabled Drive settings stay saved" };
  config.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
  return config;
}

async function setup(page: Page, initialConfig: SurpriseConfig = fixture()) {
  let row = { id: "00000000-0000-4000-8000-000000000102", user_id: user.id, slug: "part5-surprise", is_paid: true, config: initialConfig, photo_urls: [], audio_urls: [], updated_at: "2026-01-01T00:00:00Z" };
  const writes: unknown[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://qa.invalid/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname.includes("/auth/v1/user")) return reply(user);
    if (url.pathname.includes("/functions/v1/generate-surprise-structure")) {
      const body = request.postDataJSON();
      if (body.mode === "patch") return reply({ patch: { changes: [
        { path: "heartTunnel.startMain", value: "AI Heart Public Title" },
        { path: "loveConfession.question", value: "AI Confession Public Question?" },
        { path: "loveDrive.objective", value: "AI Drive Public Objective" },
        { path: "loveDrive.letterBody", value: "AI Drive public read-only letter" },
        { path: "scenes", value: ["loveConfession", "heartTunnel", "loveDrive"] },
        { path: "features.loveDrive", value: true },
      ] } });
      return reply({ config: {} });
    }
    if (url.pathname.includes("/rest/v1/rpc/get_surprise_by_slug")) return reply({ config: row.config });
    if (url.pathname.includes("/rest/v1/surprises")) {
      if (request.method() === "PATCH") {
        expect(url.searchParams.get("user_id")).toBe(`eq.${user.id}`);
        expect(url.searchParams.get("updated_at")).toBe(`eq.${row.updated_at}`);
        const payload = request.postDataJSON();
        writes.push(payload);
        row = { ...row, ...payload, updated_at: new Date(Date.parse(row.updated_at) + 1000).toISOString() };
      }
      return reply(row);
    }
    return reply({});
  });
  await page.addInitScript(({ user }) => {
    if (window !== window.top || sessionStorage.getItem("part5-qa-seeded")) return;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp }))}.qa`;
    localStorage.setItem("sb-qa-auth-token", JSON.stringify({ access_token: token, refresh_token: "part5-refresh", expires_at: exp, expires_in: 3600, token_type: "bearer", user }));
    sessionStorage.setItem("part5-qa-seeded", "true");
  }, { user });
  await page.emulateMedia({ reducedMotion: "reduce" });
  return { writes, errors, saved: () => row.config };
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

async function childFrame(page: Page, experience: "heart-tunnel" | "love-confession" | "love-drive") {
  const title = experience === "heart-tunnel" ? "Heart Tunnel interactive experience" : experience === "love-confession" ? "Love Confession interactive experience" : "Love Drive interactive experience";
  await expect(page.locator(`iframe[title="${title}"]`)).toBeVisible({ timeout: 15000 });
  await expect(page.locator("[data-experience-loading]")).toHaveCount(0, { timeout: 15000 });
  const child = page.frames().find(frame => frame !== page.mainFrame() && frame.url().includes(`/experiences/${experience}/`));
  expect(child).toBeDefined();
  await expect.poll(() => child!.evaluate(() => Boolean((window as any).__experience?.initialized))).toBe(true);
  return child!;
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const frame of page.frames().filter(item => item !== page.mainFrame() && item.url().includes("/experiences/"))) {
    expect(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
}

async function expectMusicDocked(page: Page, title: string) {
  const iframe = await page.locator(`iframe[title="${title}"]`).boundingBox();
  const music = await page.locator('button[title="Play music"], button[title="Mute music"]').boundingBox();
  expect(iframe).not.toBeNull(); expect(music).not.toBeNull();
  expect(iframe!.y + iframe!.height).toBeLessThanOrEqual(music!.y + 1);
}

test("Customize → reviewed AI enable/reorder → save/reload → public flow and responsive release captures", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const qa = await setup(page);
  await page.goto("/dashboard?intent=customize");
  await expect(page.getByRole("heading", { name: "Make it unmistakably yours." })).toBeVisible();
  await page.locator("details.v2-panel > summary").filter({ hasText: /^Heart Tunnel$/ }).click();
  await page.getByLabel("Heart Tunnel start title", { exact: true }).fill("Manual Heart Updated");
  await page.locator("details.v2-panel > summary").filter({ hasText: /^Love Confession$/ }).click();
  await page.getByLabel("Love Confession question", { exact: true }).fill("Manual Confession Updated?");
  await page.locator("details.v2-panel > summary").filter({ hasText: /^Love Drive$/ }).click();
  await page.getByLabel("Love Drive initial objective", { exact: true }).fill("Disabled Drive draft remains editable");
  await expect(page.getByLabel("Enable Love Drive", { exact: true }).last()).not.toBeChecked();
  await page.getByRole("button", { name: "Move Love Confession up", exact: true }).click();

  await tab(page, "AI Assistant");
  await page.getByLabel("AI change request").fill("Personalize all bundled experiences and explicitly enable Love Drive");
  await page.getByRole("button", { name: "Review AI changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review proposed changes" })).toBeVisible();
  for (const path of ["heartTunnel.startMain", "loveConfession.question", "loveDrive.objective", "loveDrive.letterBody", "scenes", "features.loveDrive"]) {
    await expect(page.locator("details summary").filter({ hasText: new RegExp(`^${path.replace(".", "\\.")}$`) })).toBeVisible();
  }
  expect(qa.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Apply changes", exact: true }).click();
  await tab(page, "Customize");
  await expect(page.getByLabel("Heart Tunnel start title", { exact: true })).toHaveValue("AI Heart Public Title");
  await expect(page.getByLabel("Love Confession question", { exact: true })).toHaveValue("AI Confession Public Question?");
  await expect(page.getByLabel("Love Drive initial objective", { exact: true })).toHaveValue("AI Drive Public Objective");
  await expect(page.getByLabel("Enable Love Drive", { exact: true }).last()).toBeChecked();
  expect(qa.writes).toHaveLength(0);
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Saved experience", { exact: true })).toBeVisible();
  expect(qa.writes).toHaveLength(1);
  expect(qa.saved().scenes).toEqual(["loveConfession", "heartTunnel", "loveDrive"]);
  expect(qa.saved().features?.loveDrive).toBe(true);
  expect(qa.saved().loveDrive?.letterBody).toBe("AI Drive public read-only letter");

  await tab(page, "Preview");
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "loveConfession");
  let child = await childFrame(page, "love-confession");
  expect(await child.evaluate(() => (window as any).__experience.config.question)).toBe("AI Confession Public Question?");
  await child.locator("#yesBtn").click();
  await child.locator("#continueBtn").click();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "heartTunnel");
  child = await childFrame(page, "heart-tunnel");
  await child.locator("#start-btn").click();
  await child.locator("#continue-btn").click();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "loveDrive");
  child = await childFrame(page, "love-drive");
  expect(await child.evaluate(() => (window as any).__experience.config.objective)).toBe("AI Drive Public Objective");
  expect(await child.evaluate(() => Object.keys((window as any).__experience.theme).length)).toBeGreaterThan(0);

  await page.reload();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "loveConfession");
  await page.goto("/s/part5-surprise");
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "loveConfession", { timeout: 15000 });
  child = await childFrame(page, "love-confession");
  await expect(child.locator("#question-text")).toHaveText("AI Confession Public Question?");
  await child.locator("#yesBtn").click();
  await expect(child.locator("#climax-screen")).toHaveAttribute("aria-hidden", "false");
  await page.screenshot({ path: "test-results/part5/love-confession-1280.png" });
  await child.locator("#continueBtn").click();

  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "heartTunnel");
  child = await childFrame(page, "heart-tunnel");
  await child.locator("#start-btn").click();
  await expect(child.locator("#reveal")).toHaveAttribute("aria-hidden", "false");
  await expect(child.locator("#display-title")).toContainText("Happy");
  await page.screenshot({ path: "test-results/part5/heart-tunnel-1280.png" });
  await child.locator("#continue-btn").click();

  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "loveDrive");
  child = await childFrame(page, "love-drive");
  expect(await child.evaluate(() => (window as any).__experience.config.objective)).toBe("AI Drive Public Objective");
  await expect(child.locator("#ld-objective-text")).toHaveText("Crash glowing gold blocks & find 3 Hidden Surprises");
  await expectMusicDocked(page, "Love Drive interactive experience");
  await page.screenshot({ path: "test-results/part5/love-drive-1280.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.canvasSize.width)).toBeLessThan(500);
  const nav = await page.locator(".scene-navigation").boundingBox();
  const iframe = await page.locator('iframe[title="Love Drive interactive experience"]').boundingBox();
  expect(nav).not.toBeNull(); expect(iframe).not.toBeNull();
  expect(iframe!.y).toBeGreaterThanOrEqual(nav!.y + nav!.height);
  await noOverflow(page);
  await expectMusicDocked(page, "Love Drive interactive experience");
  await page.screenshot({ path: "test-results/part5/love-drive-390.png" });

  await page.getByRole("button", { name: "Previous scene", exact: true }).click();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "heartTunnel");
  child = await childFrame(page, "heart-tunnel");
  await child.locator("#start-btn").click();
  await expect(child.locator("#reveal")).toHaveAttribute("aria-hidden", "false");
  await noOverflow(page);
  await expectMusicDocked(page, "Heart Tunnel interactive experience");
  await page.screenshot({ path: "test-results/part5/heart-tunnel-390.png" });
  await child.locator("#continue-btn").scrollIntoViewIfNeeded();
  await expect(child.locator("#continue-btn")).toBeVisible();
  await expect(child.locator("#replay-btn")).toBeVisible();
  await expectMusicDocked(page, "Heart Tunnel interactive experience");
  await page.screenshot({ path: "test-results/part5/heart-tunnel-actions-390.png" });
  await page.getByRole("button", { name: "Previous scene", exact: true }).click();
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "loveConfession");
  child = await childFrame(page, "love-confession");
  await expect(child.locator("#question-text")).toHaveText("AI Confession Public Question?");
  await noOverflow(page);
  await expectMusicDocked(page, "Love Confession interactive experience");
  await page.screenshot({ path: "test-results/part5/love-confession-390.png" });
  await child.locator("#yesBtn").click();
  await child.locator("#envelope-trigger").click();
  await expect(child.locator("#letter-overlay")).toHaveAttribute("aria-hidden", "false");
  await child.locator("#closeBtn").scrollIntoViewIfNeeded();
  await expect(child.locator("#closeBtn")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: "test-results/part5/love-confession-letter-390.png" });
  expect(qa.errors).toEqual([]);
});

test("Love Drive public controls stay reachable at 360px and landscape with nav/music docks", async ({ page }) => {
  const config = fixture();
  config.scenes = ["loveDrive"];
  config.features = { ...config.features, loveDrive: true };
  const qa = await setup(page, config);
  await page.goto("/s/part5-surprise");
  const child = await childFrame(page, "love-drive");
  await expect(child.locator("#ld-canvas-container canvas")).toBeVisible();
  for (const [width, height, name] of [[360, 640, "360"], [640, 360, "landscape"], [390, 844, "390-controls"]] as const) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.canvasSize.width)).toBeLessThanOrEqual(width);
    await noOverflow(page);
    await expectMusicDocked(page, "Love Drive interactive experience");
    const nav = await page.locator(".scene-navigation").boundingBox();
    const iframe = await page.locator('iframe[title="Love Drive interactive experience"]').boundingBox();
    expect(iframe!.y).toBeGreaterThanOrEqual(nav!.y + nav!.height);
    const controls = await child.evaluate(() => {
      const ids = ["ld-btn-pause", "ld-btn-left", "ld-btn-right", "ld-btn-brake", "ld-btn-gas"];
      return ids.map(id => {
        const rect = document.getElementById(id)!.getBoundingClientRect();
        return { id, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight };
      });
    });
    for (const control of controls) {
      expect(control.left, `${name} ${control.id} left`).toBeGreaterThanOrEqual(0);
      expect(control.top, `${name} ${control.id} top`).toBeGreaterThanOrEqual(0);
      expect(control.right, `${name} ${control.id} right`).toBeLessThanOrEqual(control.viewportWidth + 1);
      expect(control.bottom, `${name} ${control.id} bottom`).toBeLessThanOrEqual(control.viewportHeight + 1);
    }
    await page.screenshot({ path: `test-results/part5/love-drive-${name}.png` });
  }
  expect(qa.errors).toEqual([]);
});
