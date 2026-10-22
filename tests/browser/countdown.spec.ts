import { test, expect, type Page } from "@playwright/test";
import defaultConfig from "../../artifacts/birthday-surprise/src/config";
import { promoteToCinematic } from "../../artifacts/birthday-surprise/src/lib/v2/migrate";
import type { SurpriseConfig, CountdownConfig } from "../../artifacts/birthday-surprise/src/lib/v2/schema";
import { THEME_PRESETS } from "../../artifacts/birthday-surprise/src/lib/themePresets";

// Network fixtures only (qa.invalid). No real Supabase, Vercel or payments.
const user = { id: "00000000-0000-4000-8000-000000000301", aud: "authenticated", role: "authenticated", email: "countdown@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const SECRET = "TOP SECRET LETTER CONTENT";

function fixture(countdown?: CountdownConfig, v2 = true): SurpriseConfig {
  const config = v2 ? promoteToCinematic(structuredClone(defaultConfig)) : structuredClone(defaultConfig) as SurpriseConfig;
  config.name = "Countdown Recipient";
  config.intro.heading = "A surprise for you";
  config.celebration.message = SECRET;
  config.memoryWall.photos = [];
  config.audio = { backgroundMusic: "", birthdaySong: "", useFallbackTones: false };
  if (countdown) config.countdown = countdown;
  return config;
}
const at = (ms: number): CountdownConfig => ({ enabled: true, unlockAtUtc: new Date(Math.floor(ms / 1000) * 1000).toISOString(), timezone: "Asia/Kolkata", heading: "Something special is on its way", message: "Wait for it", waitingLine: "Almost…" });

interface Opts { signedIn?: boolean; motion?: "reduce" | "no-preference"; v2Rpc?: "missing" | "hard"; serverSkewMs?: number }
async function setup(page: Page, initial: SurpriseConfig, opts: Opts = {}) {
  const { signedIn = false, motion = "reduce", v2Rpc = "missing", serverSkewMs = 0 } = opts;
  const state = { row: { id: "00000000-0000-4000-8000-000000000302", user_id: user.id, slug: "cd-surprise", is_paid: true, config: initial, photo_urls: [], audio_urls: [], updated_at: "2026-01-01T00:00:00Z" }, rpcCalls: 0, v1Calls: 0, v2Calls: 0, writes: [] as unknown[] };
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text()); });
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("**/api/server-time**", r => r.fulfill({ status: 200, contentType: "application/json", headers: { "cache-control": "no-store" }, body: JSON.stringify({ now: Date.now() + serverSkewMs }) }));
  await page.route("https://qa.invalid/**", async route => {
    const req = route.request(); const url = new URL(req.url());
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname.includes("/auth/v1/user")) return reply(user);
    if (url.pathname.endsWith("/rpc/get_surprise_by_slug_v2")) {
      state.rpcCalls++; state.v2Calls++;
      if (v2Rpc === "missing") return reply({ code: "PGRST202", message: "not found" }, 404);
      const cfg = state.row.config; const cd = cfg.countdown;
      const now = Date.now() + serverSkewMs;
      const locked = !!cd?.enabled && !!cd.unlockAtUtc && now < Date.parse(cd.unlockAtUtc);
      return reply({ locked, server_now: new Date(now).toISOString(), config: locked ? { name: cfg.name, _version: cfg._version, themePreset: cfg.themePreset, countdown: cd } : cfg });
    }
    if (url.pathname.endsWith("/rpc/get_surprise_by_slug")) { state.rpcCalls++; state.v1Calls++; return reply({ config: state.row.config }); }
    if (url.pathname.includes("/rest/v1/surprises")) {
      if (req.method() === "PATCH") { const p = req.postDataJSON(); state.writes.push(p); state.row = { ...state.row, ...p, updated_at: new Date(Date.parse(state.row.updated_at) + 1000).toISOString() }; }
      return reply(state.row);
    }
    return reply({});
  });
  if (signedIn) {
    await page.addInitScript(({ user }) => {
      if (window !== window.top || sessionStorage.getItem("cd-qa-seeded")) return;
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp }))}.qa`;
      localStorage.setItem("sb-qa-auth-token", JSON.stringify({ access_token: token, refresh_token: "r", expires_at: exp, expires_in: 3600, token_type: "bearer", user }));
      sessionStorage.setItem("cd-qa-seeded", "true");
    }, { user });
  }
  await page.emulateMedia({ reducedMotion: motion });
  return { state, errors, setConfig: (c: SurpriseConfig) => { state.row = { ...state.row, config: c }; } };
}
const gate = (page: Page) => page.locator("[data-countdown-gate]");
const ownerBar = (page: Page) => page.locator("[data-countdown-owner-controls]");
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test("countdown OFF: public link behaves exactly as before (no gate, no gate chunk)", async ({ page }) => {
  const qa = await setup(page, fixture());
  const chunks: string[] = []; page.on("request", r => { if (/CountdownGate|CountdownScreen/.test(r.url())) chunks.push(r.url()); });
  await page.goto("/s/cd-surprise");
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 15000 });
  await expect(gate(page)).toHaveCount(0);
  expect(chunks).toEqual([]);
  expect(qa.state.v1Calls).toBeGreaterThan(0); // v2 missing -> fallback to v1
  expect(qa.errors).toEqual([]);
});

test("unlock already passed: goes straight in, no 3-2-1", async ({ page }) => {
  await setup(page, fixture(at(Date.now() - 60_000)));
  await page.goto("/s/cd-surprise");
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 15000 });
  await expect(gate(page)).toHaveCount(0);
});

test("locked page renders, timer role, owner controls absent (incl. ?owner=1 and tampered storage), no overflow at 320/390/landscape", async ({ page }) => {
  await setup(page, fixture(at(Date.now() + 2 * 86_400_000 + 3 * 3_600_000)));
  await page.addInitScript(() => { localStorage.setItem("owner", "1"); localStorage.setItem("viewerMode", "owner-preview"); sessionStorage.setItem("countdown-owner", "true"); });
  for (const q of ["", "?owner=1", "?preview=1&viewerMode=owner-preview"]) {
    await page.goto(`/s/cd-surprise${q}`);
    await expect(gate(page)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(ownerBar(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Open surprise now/ })).toHaveCount(0);
    await expect(page.locator("[data-unit=days] .cd-sr")).toContainText("2 Days");
  }
  for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(150);
    expect(await noOverflow(page)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/screenshots/countdown/public-locked-390.png" });
});

test("3 -> 2 -> 1 -> reveal appear once at the right instants, experience mounts once; refresh does not replay", async ({ page }) => {
  await setup(page, fixture({ ...at(Date.now() + 9000), showTeaserButton: true }), { motion: "no-preference" });
  const seen: string[] = [];
  await page.exposeFunction("__cdSeen", (n: string) => { if (seen.at(-1) !== n) seen.push(n); });
  await page.addInitScript(() => { new MutationObserver(() => { const el = document.querySelector("[data-countdown-finale]"); if (el) (window as any).__cdSeen(el.getAttribute("data-countdown-finale")); }).observe(document, { subtree: true, childList: true, attributes: true }); });
  await page.goto("/s/cd-surprise");
  await expect(gate(page)).toBeVisible({ timeout: 15000 });
  // Teaser is purely cosmetic.
  await page.locator("[data-countdown-teaser]").click();
  await expect(page.locator(".cd-teaser-reaction")).toContainText("Patience");
  await expect(gate(page)).toBeVisible();
  await page.locator("[data-countdown-finale]").first().waitFor({ timeout: 12000 });
  await page.screenshot({ path: "docs/screenshots/countdown/finale.png" });
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 8000 });
  expect(seen).toEqual(["3", "2", "1"]);
  const diag = await page.evaluate(() => window.__countdownDiag);
  expect(diag?.reveals).toBe(1);
  expect(diag?.experienceMounts).toBe(1);
  expect(diag?.trustedClock).toBe(true);
  await page.reload();
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("[data-countdown-finale]")).toHaveCount(0);
});

test("opened with ~2s left shows only the remaining stages", async ({ page }) => {
  // The public prelude takes ~1.6s, so an unlock 3.8s out is reached with ~2s left.
  await setup(page, fixture({ enabled: true, unlockAtUtc: new Date(Date.now() + 3800).toISOString(), timezone: "UTC" }));
  await page.addInitScript(() => {
    (window as any).__seen = [];
    new MutationObserver(() => { const el = document.querySelector("[data-countdown-finale]"); const n = el?.getAttribute("data-countdown-finale"); const seen = (window as any).__seen; if (n && seen.at(-1) !== n) seen.push(n); })
      .observe(document, { subtree: true, childList: true, attributes: true });
  });
  await page.goto("/s/cd-surprise");
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 15000 });
  const seen: string[] = await page.evaluate(() => (window as any).__seen);
  expect(seen).not.toContain("3");
  expect(seen.at(-1) ?? "1").toBe("1");
});

test("changing the device clock does NOT unlock (trusted server offset)", async ({ page }) => {
  await setup(page, fixture(at(Date.now() + 60 * 60_000)));
  // Device clock is wrong by +2 days from the start.
  await page.addInitScript(() => { const real = Date.now; const skew = 2 * 86_400_000; Date.now = () => real() + skew; const R = Date; (window as any).Date = class extends R { constructor(...a: any[]) { super(...(a.length ? a : [real() + skew]) as []); } static now() { return real() + skew; } }; });
  await page.goto("/s/cd-surprise");
  await expect(gate(page)).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await expect(gate(page)).toBeVisible();
  await expect(page.locator("[data-scene]")).toHaveCount(0);
  const d = await page.evaluate(() => window.__countdownDiag);
  expect(d?.clockSource).toBe("server-time");
  await expect(page.locator("[data-unit=minutes] .cd-sr")).toContainText(/59 Minutes|0 Minutes/);
});

test("creator extends the schedule while visitor waits -> countdown extends; switches OFF -> unlocks smoothly", async ({ page }) => {
  const qa = await setup(page, fixture(at(Date.now() + 120_000)));
  await page.goto("/s/cd-surprise");
  await expect(gate(page)).toBeVisible({ timeout: 15000 });
  qa.setConfig(fixture(at(Date.now() + 3 * 86_400_000)));
  await page.evaluate(() => { document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.locator("[data-unit=days] .cd-sr")).toContainText(/^[23] Days/, { timeout: 5000 });
  qa.setConfig(fixture({ ...at(Date.now() + 3 * 86_400_000), enabled: false }));
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 8000 });
  await expect(page.locator("[data-countdown-finale]")).toHaveCount(0);
});

test("different browser timezones show the same instant", async ({ browser }) => {
  const unlock = Date.now() + 5 * 3_600_000;
  const secs: number[] = [];
  for (const timezoneId of ["Asia/Kolkata", "America/New_York", "Pacific/Auckland"]) {
    const ctx = await browser.newContext({ timezoneId });
    const page = await ctx.newPage();
    await setup(page, fixture(at(unlock)));
    await page.goto("/s/cd-surprise");
    await expect(gate(page)).toBeVisible({ timeout: 15000 });
    secs.push(Number(await page.locator("[data-countdown-seconds]").getAttribute("data-countdown-seconds")));
    await expect(page.locator(".cd-when strong")).toContainText("IST");
    await ctx.close();
  }
  expect(Math.max(...secs) - Math.min(...secs)).toBeLessThanOrEqual(30);
});

test("Tier 2: locked:true payload never contains content; at zero the full config is fetched", async ({ page }) => {
  const qa = await setup(page, fixture(at(Date.now() + 5000)), { v2Rpc: "hard" });
  const bodies: string[] = [];
  page.on("response", async r => { if (r.url().includes("get_surprise_by_slug_v2")) bodies.push(await r.text().catch(() => "")); });
  await page.goto("/s/cd-surprise");
  await expect(gate(page)).toBeVisible({ timeout: 15000 });
  expect(bodies[0]).toContain('"locked":true');
  expect(bodies[0]).not.toContain(SECRET);
  expect(await page.content()).not.toContain(SECRET);
  expect((await page.evaluate(() => window.__countdownDiag))?.tier).toBe("hard");
  expect((await page.evaluate(() => window.__countdownDiag))?.clockSource).toBe("rpc");
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 15000 });
  expect(qa.state.v1Calls).toBe(0);
});

test("sound: off by default; when enabled requires a gesture; one AudioContext; cues once; none after leaving", async ({ page }) => {
  await setup(page, fixture(at(Date.now() + 2 * 86_400_000)));
  await page.goto("/s/cd-surprise");
  await expect(gate(page)).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".cd-sound")).toHaveCount(0);

  await setup(page, fixture({ ...at(Date.now() + 9000), soundEnabled: true }));
  await page.goto("/s/cd-surprise");
  await expect(page.locator(".cd-sound")).toHaveText(/Enable sound/, { timeout: 15000 });
  expect((await page.evaluate(() => window.__countdownDiag))?.soundContexts).toBe(0);
  // on -> off -> on (gesture) well before the finale: still exactly one AudioContext.
  await page.locator(".cd-sound").click();
  await page.locator(".cd-sound").click();
  await page.locator(".cd-sound").click();
  await expect(page.locator(".cd-sound")).toHaveText(/Sound on/);
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 12000 });
  const d = await page.evaluate(() => window.__countdownDiag);
  expect(d?.soundContexts).toBe(1);
  expect(d?.soundLog).toEqual(["final3", "final2", "final1", "reveal"]);
});

test("owner Preview shows creator controls; preview actions never change the saved schedule; public uses saved config, not draft", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const saved = at(Date.now() + 2 * 86_400_000);
  const qa = await setup(page, fixture(saved), { signedIn: true });
  await page.goto("/dashboard");
  await expect(ownerBar(page)).toBeVisible({ timeout: 15000 });
  await expect(ownerBar(page)).toContainText("recipients never see this");
  await page.screenshot({ path: "docs/screenshots/countdown/owner-preview-locked.png" });
  await page.getByRole("button", { name: "Preview 3-2-1 finale" }).click();
  await expect(page.locator("[data-countdown-finale]")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "Preview locked state" }).click();
  await expect(gate(page)).toBeVisible();
  await page.getByRole("button", { name: "Open surprise now" }).click();
  await expect(page.locator("[data-scene]")).toBeVisible({ timeout: 8000 });
  expect(qa.state.writes).toHaveLength(0);
  expect(qa.state.row.config.countdown).toEqual(saved);

  // Unlock-for-recipients edits the DRAFT only.
  page.once("dialog", d => d.accept());
  await page.getByRole("button", { name: /Unlock for recipients now/ }).click();
  await expect(page.locator("[data-countdown-editor]")).toBeVisible();
  expect(qa.state.writes).toHaveLength(0);
  // Public link (new signed-out context state) still uses the SAVED schedule.
  const pub = await page.context().browser()!.newPage();
  await setup(pub, qa.state.row.config);
  await pub.goto("/s/cd-surprise");
  await expect(gate(pub)).toBeVisible({ timeout: 15000 });
  await pub.close();
});

test("Customize card: toggle, schedule, validation, save flows through draft/Save", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const qa = await setup(page, fixture(), { signedIn: true });
  await page.goto("/dashboard?intent=customize");
  const card = page.locator("[data-countdown-editor]");
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.getByRole("switch", { name: "Enable scheduled countdown" }).check({ force: true });
  await expect(card.locator(".cdx-summary")).toContainText("Opens");
  await card.getByLabel("Countdown date", { exact: true }).fill("2026-03-08");
  await card.getByLabel("Countdown timezone").selectOption("America/New_York");
  await card.getByLabel("Countdown time", { exact: true }).fill("02:30");
  await expect(card.getByRole("alert")).toContainText("daylight-saving");
  await card.getByLabel("Countdown timezone").selectOption("Asia/Kolkata");
  await card.getByLabel("Countdown date", { exact: true }).fill("2030-10-25");
  await card.getByLabel("Countdown time", { exact: true }).fill("19:00");
  await card.getByLabel("Countdown heading").fill("Midnight magic");
  await expect(card.locator(".cdx-summary")).toContainText("19:00 IST");
  expect(await noOverflow(page)).toBe(true);
  await card.screenshot({ path: "docs/screenshots/countdown/customize-card-390.png" });
  expect(qa.state.writes).toHaveLength(0);
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect.poll(() => qa.state.writes.length).toBe(1);
  expect(qa.state.row.config.countdown).toMatchObject({ enabled: true, localDate: "2030-10-25", localTime: "19:00", timezone: "Asia/Kolkata", unlockAtUtc: "2030-10-25T13:30:00.000Z", heading: "Midnight magic" });
});

test("every theme preset renders the locked page legibly (screenshots)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of Object.keys(THEME_PRESETS)) {
    const cfg = fixture(at(Date.now() + 86_400_000 * 4 + 7_200_000));
    cfg.themePreset = id as SurpriseConfig["themePreset"]; cfg.themeId = id as SurpriseConfig["themeId"];
    await setup(page, cfg);
    await page.goto("/s/cd-surprise");
    await expect(gate(page)).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(300);
    expect(await noOverflow(page)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/countdown/theme-${id}.png` });
  }
});

test("keyboard-only: teaser reachable with visible focus; legacy v1 config works with the gate", async ({ page }) => {
  await setup(page, fixture({ ...at(Date.now() + 86_400_000), showTeaserButton: true, soundEnabled: true }, false));
  await page.goto("/s/cd-surprise");
  await expect(gate(page)).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Tab");
  await expect(page.locator(".cd-sound")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("[data-countdown-teaser]")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".cd-teaser-reaction")).toBeVisible();
});
