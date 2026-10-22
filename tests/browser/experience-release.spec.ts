import { test, expect, type Frame, type Page } from "@playwright/test";

const base = "/__experience-frame-fixture";

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });
  return errors;
}

async function openFixture(page: Page, experience: "heart-tunnel" | "love-confession" | "love-drive", reduced = true, muted = true) {
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.goto(`${base}?experience=${experience}&reduced=${reduced ? 1 : 0}&muted=${muted ? 1 : 0}`);
  await expect(page.locator("[data-experience-loading]")).toHaveCount(0, { timeout: 15000 });
  const child = page.frames().find(frame => frame !== page.mainFrame() && frame.url().includes(`/experiences/${experience}/`));
  expect(child).toBeDefined();
  await expect.poll(() => child!.evaluate(() => Boolean((window as any).__experience?.initialized))).toBe(true);
  return child!;
}

async function outputCount(page: Page, id: string) {
  const text = await page.getByTestId(id).textContent();
  return Number(text?.match(/(\d+)/)?.[1] ?? -1);
}

async function dispatchPagehide(child: Frame) {
  await child.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false })));
}

test("Heart Tunnel: real reduced-motion flow, letter focus, audio updates, replay 3x and one-shot Continue", async ({ page }) => {
  const errors = watchErrors(page);
  const child = await openFixture(page, "heart-tunnel", true, false);
  await expect(child.locator("#start-btn")).toBeVisible();
  expect(await child.evaluate(() => (window as any).__heartTunnelDebug.audioState)).toBe("none");
  await child.locator("#start-btn").click();
  await expect(child.locator("#reveal")).toHaveAttribute("aria-hidden", "false");
  await expect.poll(() => outputCount(page, "fixture-complete-count")).toBe(1);
  expect(await outputCount(page, "fixture-next-count")).toBe(0);
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.audioState)).toBe("running");

  await child.locator("#open-letter-btn").click();
  await expect(child.locator("#letter-modal")).toHaveAttribute("aria-hidden", "false");
  await expect(child.locator("#letter-body")).toContainText("Happy Birthday to someone");
  await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("letter-close-btn");
  await page.keyboard.press("Tab");
  await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("letter-close-btn");
  await page.keyboard.press("Escape");
  await expect(child.locator("#letter-modal")).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("open-letter-btn");

  await page.getByTestId("fixture-toggle-active").click();
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.audioState)).toBe("suspended");
  await page.getByTestId("fixture-toggle-active").click();
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.audioState)).toBe("running");
  await page.getByTestId("fixture-toggle-muted").click();
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.audioState)).toBe("suspended");
  await page.getByTestId("fixture-toggle-muted").click();
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.audioState)).toBe("running");

  for (let replay = 1; replay <= 3; replay++) {
    await child.locator("#replay-btn").click();
    await expect(child.locator("#reveal")).toHaveAttribute("aria-hidden", "false");
    await expect.poll(() => outputCount(page, "fixture-replayed-count")).toBe(replay);
    await expect.poll(() => outputCount(page, "fixture-complete-count")).toBe(replay + 1);
    expect(await child.evaluate(() => (window as any).__heartTunnelDebug.activeLoops)).toBe(0);
  }
  await child.locator("#continue-btn").click();
  await expect.poll(() => outputCount(page, "fixture-next-count")).toBe(1);
  await child.locator("#continue-btn").evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  expect(await outputCount(page, "fixture-next-count")).toBe(1);
  expect(errors).toEqual([]);
});

test("Heart Tunnel: full-motion rAF stops for host pause/reduced motion and pagehide disposal", async ({ page }) => {
  const errors = watchErrors(page);
  const child = await openFixture(page, "heart-tunnel", false, true);
  await child.locator("#start-btn").click();
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.activeLoops)).toBe(1);
  await page.getByTestId("fixture-toggle-active").click();
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.activeLoops)).toBe(0);
  await page.getByTestId("fixture-toggle-active").click();
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.activeLoops)).toBe(1);
  await page.getByTestId("fixture-toggle-motion").click();
  await expect(child.locator("#reveal")).toHaveAttribute("aria-hidden", "false");
  await expect.poll(() => child.evaluate(() => (window as any).__heartTunnelDebug.activeLoops)).toBe(0);
  await dispatchPagehide(child);
  expect(await child.evaluate(() => (window as any).__heartTunnelDebug)).toMatchObject({ activeLoops: 0, activeTimers: 0, audioContexts: 0, disposals: 1 });
  expect(errors).toEqual([]);
});

test("Love Confession: keyboard No, reduced climax/letter, replay 3x and one-shot Continue", async ({ page }) => {
  const errors = watchErrors(page);
  const child = await openFixture(page, "love-confession", true, true);
  await child.locator("#noBtn").focus();
  await page.keyboard.press("Enter");
  await expect(child.locator("#no-reaction")).toBeVisible();
  expect(await child.locator("#noBtn").evaluate(button => button.style.position)).toBe("");
  await child.locator("#yesBtn").click();
  await expect(child.locator("#climax-screen")).toHaveAttribute("aria-hidden", "false");
  await expect.poll(() => outputCount(page, "fixture-complete-count")).toBe(1);
  await child.locator("#envelope-trigger").click();
  await expect(child.locator("#letter-overlay")).toHaveAttribute("aria-hidden", "false");
  await expect(child.locator("#letter-text")).toContainText("You make my world brighter");
  await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("closeBtn");
  await page.keyboard.press("Tab");
  await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("closeBtn");
  await page.keyboard.press("Escape");
  await expect(child.locator("#letter-overlay")).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("envelope-trigger");

  for (let replay = 1; replay <= 3; replay++) {
    await child.locator("#replayBtn").click();
    await expect(child.locator("#question-screen")).toHaveAttribute("aria-hidden", "false");
    await expect(child.locator("#no-reaction")).toBeHidden();
    await expect(child.locator("#letter-text")).toHaveText("");
    await expect.poll(() => outputCount(page, "fixture-replayed-count")).toBe(replay);
    await child.locator("#yesBtn").click();
    await expect(child.locator("#climax-screen")).toHaveAttribute("aria-hidden", "false");
    await expect.poll(() => outputCount(page, "fixture-complete-count")).toBe(replay + 1);
    expect(await child.evaluate(() => (window as any).__loveConfessionDebug.activeLoops)).toBe(0);
  }
  await child.locator("#continueBtn").click();
  await expect.poll(() => outputCount(page, "fixture-next-count")).toBe(1);
  await child.locator("#continueBtn").evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  expect(await outputCount(page, "fixture-next-count")).toBe(1);
  expect(errors).toEqual([]);
});

test("Love Confession: full-motion loop/confetti pause and complete pagehide cleanup", async ({ page }) => {
  const errors = watchErrors(page);
  const child = await openFixture(page, "love-confession", false, true);
  await child.locator("#yesBtn").click();
  await expect(child.locator("#climax-screen")).toHaveAttribute("aria-hidden", "false");
  await expect.poll(() => child.evaluate(() => (window as any).__loveConfessionDebug.activeLoops)).toBeGreaterThan(0);
  await page.getByTestId("fixture-toggle-active").click();
  await expect.poll(() => child.evaluate(() => (window as any).__loveConfessionDebug.activeLoops)).toBe(0);
  await page.getByTestId("fixture-toggle-active").click();
  await expect.poll(() => child.evaluate(() => (window as any).__loveConfessionDebug.activeLoops)).toBeGreaterThan(0);
  await child.locator("#envelope-trigger").click();
  await expect(child.locator("#letter-overlay")).toHaveAttribute("aria-hidden", "false");
  await page.getByTestId("fixture-toggle-active").click();
  await expect.poll(() => child.evaluate(() => (window as any).__loveConfessionDebug.activeLoops)).toBe(0);
  await dispatchPagehide(child);
  expect(await child.evaluate(() => (window as any).__loveConfessionDebug)).toMatchObject({ activeLoops: 0, activeTimers: 0, activeTweens: 0, audioContexts: 0, disposals: 1 });
  expect(errors).toEqual([]);
});

interface DriveDebug {
  state: string;
  carPosition: { x: number; y: number; z: number };
  collectedCount: number;
}
async function driveDebug(child: Frame): Promise<DriveDebug> {
  return child.evaluate(() => {
    const debug = (window as any).__loveDriveDebug;
    return { state: debug.state, carPosition: debug.carPosition, collectedCount: debug.collectedCount };
  });
}

/** Real keyboard control only; read-only position telemetry is used for steering. */
async function driveTo(page: Page, child: Frame, targetX: number, targetZ: number, targetCount: number, awaitCompletion = false) {
  let steer: "ArrowLeft" | "ArrowRight" | null = null;
  let direction: "ArrowUp" | "ArrowDown" = "ArrowUp";
  await page.keyboard.down(direction);
  const deadline = Date.now() + 30_000;
  try {
    while (Date.now() < deadline) {
      const debug = await driveDebug(child);
      if (awaitCompletion ? debug.state === "COMPLETED" : debug.collectedCount >= targetCount) return;
      if (!debug.carPosition) throw new Error("Love Drive car disappeared during the route.");
      if (direction === "ArrowUp" && debug.carPosition.z < targetZ - 14) {
        await page.keyboard.up(direction); direction = "ArrowDown"; await page.keyboard.down(direction);
      } else if (direction === "ArrowDown" && debug.carPosition.z > targetZ + 9) {
        await page.keyboard.up(direction); direction = "ArrowUp"; await page.keyboard.down(direction);
      }
      const delta = targetX - debug.carPosition.x;
      const nextSteer = delta > 0.22 ? "ArrowRight" as const : delta < -0.22 ? "ArrowLeft" as const : null;
      if (steer !== nextSteer) {
        if (steer) await page.keyboard.up(steer);
        steer = nextSteer;
        if (steer) await page.keyboard.down(steer);
      }
      await page.waitForTimeout(40);
    }
    throw new Error(`Drive route timed out: ${JSON.stringify(await driveDebug(child))}`);
  } finally {
    await page.keyboard.up(direction);
    if (steer) await page.keyboard.up(steer);
  }
}

test("Love Drive: 4x CPU real route, read-only letter, Continue once, replay 3x, audio/pause and WebGL disposal", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  try {
    const child = await openFixture(page, "love-drive", true, false);
    const canvas = child.locator("#ld-canvas-container canvas");
    await expect(canvas).toBeVisible();
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.state)).toBe("DRIVING");
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.audioState)).toBe("none");
    await canvas.click();
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.audioState)).toBe("running");

    await driveTo(page, child, -2.4, -65, 1);
    await expect(child.locator("#ld-counter-text")).toHaveText("1/3");
    await driveTo(page, child, 2.6, -145, 2);
    await expect(child.locator("#ld-counter-text")).toHaveText("2/3");
    await driveTo(page, child, -2, -225, 3);
    await expect(child.locator("#ld-counter-text")).toHaveText("3/3");
    await driveTo(page, child, 0, -290, 3, true);
    await expect(child.locator("#ld-final-modal")).toHaveAttribute("aria-hidden", "false", { timeout: 10000 });
    await expect.poll(() => outputCount(page, "fixture-complete-count")).toBe(1);
    expect(await outputCount(page, "fixture-next-count")).toBe(0);
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.particleCount)).toBeLessThanOrEqual(36);

    await child.locator("#ld-btn-read-letter").click();
    await expect(child.locator("#love-modal")).toHaveAttribute("aria-hidden", "false");
    await expect(child.locator("#love-message")).toContainText("every road is better with you");
    await expect(child.locator("textarea")).toHaveCount(0);
    await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("close-modal");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("save-modal-btn");
    await page.keyboard.press("Tab");
    await expect.poll(() => child.evaluate(() => document.activeElement?.id)).toBe("close-modal");
    await page.keyboard.press("Escape");
    await expect(child.locator("#ld-final-modal")).toHaveAttribute("aria-hidden", "false");

    await child.locator("#ld-btn-open-letter").click();
    await expect.poll(() => outputCount(page, "fixture-next-count")).toBe(1);
    await child.locator("#ld-btn-open-letter").evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    expect(await outputCount(page, "fixture-next-count")).toBe(1);

    await child.locator("#ld-btn-replay").click();
    await expect.poll(() => outputCount(page, "fixture-replayed-count")).toBe(1);
    for (let replay = 2; replay <= 3; replay++) {
      await page.keyboard.press("p");
      await expect(child.locator("#ld-pause-modal")).toHaveAttribute("aria-hidden", "false");
      await child.locator("#ld-btn-restart-pause").click();
      await expect.poll(() => outputCount(page, "fixture-replayed-count")).toBe(replay);
    }
    expect(await driveDebug(child)).toMatchObject({ state: "DRIVING", collectedCount: 0 });
    expect((await driveDebug(child)).carPosition).toMatchObject({ x: 0, z: 10 });
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.instances)).toBe(1);
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.activeLoops)).toBe(1);

    await page.keyboard.down("ArrowUp"); await page.keyboard.down("ArrowLeft");
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.heldControls.up)).toBe(true);
    await page.keyboard.press("p");
    await page.keyboard.up("ArrowUp"); await page.keyboard.up("ArrowLeft");
    await expect(child.locator("#ld-pause-modal")).toHaveAttribute("aria-hidden", "false");
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.heldControls)).toEqual({ left: false, right: false, up: false, down: false });
    await child.locator("#ld-btn-resume").click();

    await page.getByTestId("fixture-toggle-muted").click();
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.audioState)).toBe("suspended");
    await page.getByTestId("fixture-toggle-muted").click();
    await canvas.click();
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.audioState)).toBe("running");
    await page.getByTestId("fixture-toggle-active").click();
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.activeLoops)).toBe(0);
    await page.getByTestId("fixture-toggle-active").click();
    await canvas.click();
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.activeLoops)).toBe(1);

    await dispatchPagehide(child);
    const disposed = await child.evaluate(() => ({ ...(window as any).__loveDriveDebug }));
    expect(disposed).toMatchObject({ activeInstances: 0, activeLoops: 0, activeTimers: 0, activeListeners: 0, disposals: 1, canvasesRemoved: 1, audioClosed: 1 });
    expect(disposed.geometriesDisposed).toBeGreaterThan(0);
    expect(disposed.materialsDisposed).toBeGreaterThan(0);
    await expect(child.locator("#ld-canvas-container canvas")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
});

test.describe("Love Drive mobile touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test("simultaneous gas+steer, independent release, cancel, DPR cap and orientation resize", async ({ page }) => {
    const errors = watchErrors(page);
    const child = await openFixture(page, "love-drive", true, true);
    const cdp = await page.context().newCDPSession(page);
    const iframe = await page.locator('iframe[title="Love Drive interactive experience"]').boundingBox();
    if (!iframe) throw new Error("Missing Love Drive iframe bounds.");
    const point = async (selector: string) => {
      const rect = await child.locator(selector).evaluate(element => {
        const box = element.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      return { x: iframe.x + rect.x, y: iframe.y + rect.y };
    };
    const gas = await point("#ld-btn-gas"), right = await point("#ld-btn-right");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...gas, id: 1 }, { ...right, id: 2 }] });
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.activePointers)).toBe(2);
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.heldControls)).toMatchObject({ up: true, right: true });
    await expect.poll(() => driveDebug(child).then(debug => debug.carPosition.x)).toBeGreaterThan(0);
    expect((await driveDebug(child)).carPosition.z).toBeLessThan(10);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ ...right, id: 2 }] });
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.activePointers)).toBe(1);
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.heldControls)).toMatchObject({ up: true, right: false });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.activePointers)).toBe(0);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...gas, id: 3 }] });
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.activePointers)).toBe(1);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.activePointers)).toBe(0);
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.heldControls)).toEqual({ left: false, right: false, up: false, down: false });
    expect(await child.evaluate(() => (window as any).__loveDriveDebug.pixelRatio)).toBeLessThanOrEqual(1.75);

    const before = await child.evaluate(() => (window as any).__loveDriveDebug.canvasSize);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(() => child.evaluate(() => (window as any).__loveDriveDebug.canvasSize.width)).not.toBe(before.width);
    expect(await child.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
});
