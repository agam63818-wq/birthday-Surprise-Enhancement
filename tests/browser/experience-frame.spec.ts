import { test, expect } from "@playwright/test";

/**
 * Part 1 infrastructure spike. Run against the Vite dev server; the fixture
 * route is deliberately excluded from production builds.
 */
test("Love Drive runs in ExperienceFrame and teardown stops frame rAF", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // This runs in both the host and the child document. Child ticks are sent
  // to the host so we can still measure them after the iframe is detached.
  await page.addInitScript(() => {
    if (window === window.top) {
      (window as any).__qaFrameTicks = 0;
      window.addEventListener("message", (event) => {
        if ((event.data as any)?.__qaFrameTick) (window as any).__qaFrameTicks += 1;
      });
      return;
    }
    const nativeRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => nativeRaf((time) => {
      window.parent.postMessage({ __qaFrameTick: true }, "*");
      callback(time);
    });
  });

  await page.goto("/__experience-frame-fixture");
  const iframeLocator = page.locator('iframe[title="Love Drive interactive experience"]');
  await expect(iframeLocator).toBeVisible();
  await expect(page.locator("[data-experience-loading]")).toHaveCount(0, { timeout: 15000 });

  const child = page.frames().find((frame) => frame !== page.mainFrame() && frame.url().includes("/experiences/love-drive/"));
  if (!child) throw new Error("Love Drive iframe was not created.");
  const canvas = child.locator("#ld-canvas-container canvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug?.activeInstances)).toBe(1);

  const webgl = await child.evaluate(() => (window as any).__loveDriveDebug.canvasSize);
  expect(webgl.width).toBeGreaterThan(0);
  expect(webgl.height).toBeGreaterThan(0);
  await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.renderCalls)).toBeGreaterThan(0);

  // Clicking the real canvas focuses the frame; a real keyboard event must
  // reach the game's existing key handler, not just a synthetic DOM dispatch.
  await canvas.click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("IFRAME");
  await page.keyboard.down("ArrowUp");
  await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.heldControls.up)).toBe(true);
  await page.keyboard.up("ArrowUp");

  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__qaFrameTicks)).toBeGreaterThan(0);
  await page.getByTestId("fixture-remove").click();
  await expect(page.locator('iframe[title="Love Drive interactive experience"]')).toHaveCount(0);
  await expect(page.getByTestId("fixture-removed")).toBeVisible();
  await page.waitForTimeout(200);
  const settledTicks = await page.evaluate(() => (window as any).__qaFrameTicks);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__qaFrameTicks)).toBe(settledTicks);
  expect(errors).toEqual([]);
});
