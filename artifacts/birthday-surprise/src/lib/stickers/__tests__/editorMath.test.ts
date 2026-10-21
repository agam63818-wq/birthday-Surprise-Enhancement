import { describe, expect, it } from "vitest";
import { STICKER_MANIFEST } from "../manifest";
import { addStickerPlacement } from "../model";
import {
  applyCornerResize,
  applyDragDelta,
  applyHandleRotate,
  applyKeyboardShortcut,
  clampStickerToSceneBox,
  computeVisibleStickerFraction,
  DEFAULT_STICKER_PLACEMENT,
  duplicateStickerPlacement,
  hitTestStickerAtPoint,
  MIN_VISIBLE_RATIO,
  resetStickerPlacementToDefault,
  shiftStickerLayerOrder,
  wrapAngleDegrees,
} from "../editorMath";

describe("Sticker editor math — 40% minimum visible scene-box clamping", () => {
  it("guarantees >= 40% visible polygon area inside [0, 1] x [0, 1] across all manifest aspects, sizes, rotations & corners", () => {
    const stageW = 390;
    const stageH = 660;
    const sceneAspect = stageW / stageH;
    const widths = [0.05, 0.18, 0.45, 0.9];
    const rotations = [-180, -135, -90, -45, 0, 30, 45, 90, 135, 180];
    const extremeTargets = [
      { x: -3, y: -3 },
      { x: 3, y: -3 },
      { x: -3, y: 3 },
      { x: 3, y: 3 },
      { x: -2, y: 0.5 },
      { x: 0.5, y: 2.5 },
    ];

    for (const manifestItem of STICKER_MANIFEST.slice(0, 8)) {
      for (const w of widths) {
        for (const rotate of rotations) {
          for (const target of extremeTargets) {
            const clamped = clampStickerToSceneBox(
              { x: target.x, y: target.y, w, rotate },
              sceneAspect,
              manifestItem.aspect,
            );

            expect(clamped.x).toBeGreaterThanOrEqual(0);
            expect(clamped.x).toBeLessThanOrEqual(1);
            expect(clamped.y).toBeGreaterThanOrEqual(0);
            expect(clamped.y).toBeLessThanOrEqual(1);

            const visibleRatio = computeVisibleStickerFraction(
              clamped,
              stageW,
              stageH,
              manifestItem.aspect,
            );
            expect(visibleRatio).toBeGreaterThanOrEqual(MIN_VISIBLE_RATIO);
          }
        }
      }
    }
  });
});

describe("Sticker editor math — hit testing, pointer gestures & keyboard shortcuts", () => {
  it("hit-tests rotated overlapping stickers in top-down z order with 44px minimum touch box", () => {
    const items = [
      { uid: "back", stickerId: "kitty-01", x: 0.5, y: 0.5, w: 0.3, rotate: 0, z: 1 },
      { uid: "front", stickerId: "kitty-02", x: 0.5, y: 0.5, w: 0.2, rotate: 45, z: 5 },
      { uid: "tiny", stickerId: "kitty-11", x: 0.15, y: 0.85, w: 0.05, rotate: 0, z: 2 },
    ];

    // Overlapping center selects highest z ("front")
    expect(hitTestStickerAtPoint(items, 0.5, 0.5, 390, 660)?.uid).toBe("front");
    // Outer ring of "back" outside front's 45-degree diamond selects "back"
    expect(hitTestStickerAtPoint(items, 0.355, 0.5, 390, 660)?.uid).toBe("back");
    // Tiny sticker (19.5px visual width) is still hit within its 44px touch pad
    expect(hitTestStickerAtPoint(items, 0.15 + 18 / 390, 0.85, 390, 660)?.uid).toBe("tiny");
    // Empty corner returns null
    expect(hitTestStickerAtPoint(items, 0.92, 0.1, 390, 660)).toBeNull();
  });

  it("computes pointer drag, radial aspect-locked corner resize, and rotation handle angle cleanly", () => {
    const rect = { left: 100, top: 200, width: 390, height: 660 };
    const initial = { x: 0.5, y: 0.5, w: 0.2, rotate: 0 };

    const moved = applyDragDelta(initial, 39, -66, rect, 1.0);
    expect(moved.x).toBeCloseTo(0.6, 3);
    expect(moved.y).toBeCloseTo(0.4, 3);
    expect(moved.w).toBe(0.2);

    // Center is at (295, 530). Start handle 50px right -> drag to 100px right doubles width to 0.4
    const resized = applyCornerResize(initial, 345, 530, 395, 530, rect, 1.0);
    expect(resized.w).toBeCloseTo(0.4, 3);
    expect(resized.x).toBe(0.5);
    expect(resized.y).toBe(0.5);

    // Dragging handle directly to the right of center (395, 530) -> +90deg rotation
    const rotated = applyHandleRotate(initial, 395, 530, rect, 1.0);
    expect(rotated.rotate).toBe(90);
    expect(wrapAngleDegrees(195)).toBe(-165);
    expect(wrapAngleDegrees(-190)).toBe(170);
  });

  it("handles arrow keys (with Shift), +/- resize, [ ] rotate, Delete, and Escape", () => {
    const base = { x: 0.5, y: 0.5, w: 0.22, rotate: 0 };
    const sceneAspect = 390 / 660;

    const nudgeRight = applyKeyboardShortcut(base, "ArrowRight", false, sceneAspect, 1);
    expect(nudgeRight).toEqual({ action: "update", values: { ...base, x: 0.52 } });

    const fastUp = applyKeyboardShortcut(base, "ArrowUp", true, sceneAspect, 1);
    expect(fastUp).toEqual({ action: "update", values: { ...base, y: 0.44 } });

    const grow = applyKeyboardShortcut(base, "+", false, sceneAspect, 1);
    expect(grow).toEqual({ action: "update", values: { ...base, w: 0.24 } });

    const shrinkFast = applyKeyboardShortcut(base, "-", true, sceneAspect, 1);
    expect(shrinkFast).toEqual({ action: "update", values: { ...base, w: 0.17 } });

    const rotLeft = applyKeyboardShortcut(base, "[", false, sceneAspect, 1);
    expect(rotLeft).toEqual({ action: "update", values: { ...base, rotate: -5 } });

    const rotRightFast = applyKeyboardShortcut(base, "]", true, sceneAspect, 1);
    expect(rotRightFast).toEqual({ action: "update", values: { ...base, rotate: 15 } });

    expect(applyKeyboardShortcut(base, "Delete", false, sceneAspect, 1)).toEqual({ action: "remove" });
    expect(applyKeyboardShortcut(base, "Escape", false, sceneAspect, 1)).toEqual({ action: "deselect" });
    expect(applyKeyboardShortcut(base, "Tab", false, sceneAspect, 1)).toEqual({ action: "noop" });
  });

  it("duplicates up to max 8, resets to default placement, and shifts z-layer forward/backward", () => {
    let state = addStickerPlacement(undefined, "intro", {
      uid: "s1",
      stickerId: "kitty-02",
      x: 0.3,
      y: 0.35,
      w: 0.3,
      rotate: 22,
      flipX: true,
    });

    const dup = duplicateStickerPlacement(state, "intro", "s1");
    expect(dup.createdUid).toBeTruthy();
    state = dup.next;
    expect(state.scenes.intro?.items).toHaveLength(2);
    expect(state.scenes.intro?.items[1].flipX).toBe(true);

    const movedBack = shiftStickerLayerOrder(state, "intro", dup.createdUid!, "backward");
    expect(movedBack.scenes.intro?.items.map((i) => i.uid)).toEqual([dup.createdUid, "s1"]);

    const reset = resetStickerPlacementToDefault(movedBack, "intro", "s1");
    const s1 = reset.scenes.intro?.items.find((i) => i.uid === "s1");
    expect(s1).toMatchObject({
      x: DEFAULT_STICKER_PLACEMENT.x,
      y: DEFAULT_STICKER_PLACEMENT.y,
      w: DEFAULT_STICKER_PLACEMENT.w,
      rotate: DEFAULT_STICKER_PLACEMENT.rotate,
      flipX: false,
    });
  });
});
