import type { SceneKey, StickerPlacement, StickersConfig } from "@/lib/v2/schema";
import { nanoid } from "@/lib/v2/nanoid";
import { getStickerById } from "./manifest";
import {
  addStickerPlacement,
  MAX_STICKERS_PER_SCENE,
  reorderStickerPlacements,
  updateStickerPlacement,
} from "./model";

export const DEFAULT_STICKER_PLACEMENT = {
  x: 0.5,
  y: 0.5,
  w: 0.22,
  rotate: 0,
  flipX: false,
} as const;

export const MIN_STICKER_WIDTH = 0.05;
export const MAX_STICKER_WIDTH = 0.9;
export const MIN_VISIBLE_RATIO = 0.4;

export const KEYBOARD_MOVE_STEP = 0.02;
export const KEYBOARD_MOVE_FAST_STEP = 0.06;
export const KEYBOARD_SCALE_STEP = 0.02;
export const KEYBOARD_SCALE_FAST_STEP = 0.05;
export const KEYBOARD_ROTATE_STEP = 5;
export const KEYBOARD_ROTATE_FAST_STEP = 15;

export interface StageRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StickerTransformValues {
  x: number;
  y: number;
  w: number;
  rotate: number;
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const clamped = Math.min(max, Math.max(min, value));
  return Object.is(clamped, -0) ? 0 : clamped;
}

/** Wraps arbitrary degrees cleanly into [-180, 180]. */
export function wrapAngleDegrees(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
  if (Object.is(wrapped, -0)) wrapped = 0;
  return Math.round(wrapped * 2) / 2;
}

/**
 * Clamps `{ x, y, w, rotate }` so that:
 * 1. `w` stays within `[0.05, 0.9]` and `rotate` stays within `[-180, 180]`.
 * 2. Even in the extreme corners and at any rotation angle, AT LEAST 40%
 *    (>= 43.5%) of the sticker's 2D area stays inside `[0, 1] x [0, 1]`.
 * 3. `x` and `y` remain strictly inside `[0, 1]` so saved configs round-trip
 *    through `model.ts` without any shift.
 */
export function clampStickerToSceneBox(
  values: StickerTransformValues,
  sceneAspect: number,
  stickerAspect: number,
): StickerTransformValues {
  const safeSceneAspect = Number.isFinite(sceneAspect) && sceneAspect > 0 ? sceneAspect : 9 / 16;
  const safeStickerAspect = Number.isFinite(stickerAspect) && stickerAspect > 0 ? stickerAspect : 1;

  const w = Math.round(clampNumber(values.w, MIN_STICKER_WIDTH, MAX_STICKER_WIDTH) * 10000) / 10000;
  const rotate = clampNumber(values.rotate, -180, 180);

  // Normalized unrotated height fraction of scene height
  const h = (w * safeSceneAspect) / safeStickerAspect;
  const rad = (rotate * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));

  // Rotated axis-aligned bounding-box spans in normalized scene units:
  // In pixel space: W_px = w * W, H_px = h * H => W_eff/W = w*|cos| + (h*H/W)*|sin| = w*|cos| + (w/stickerAspect)*|sin|
  const wEff = w * absCos + (w / safeStickerAspect) * absSin;
  const hEff = w * safeSceneAspect * absSin + h * absCos;

  // Keeping center at least 0.16 * effective span from each scene edge guarantees >= 66% span inside along each axis:
  // Worst-case corner visibility = 0.66 * 0.66 = 43.56% > 40% minimum visibility across ALL angles and aspects!
  const minX = Math.min(0.5, Math.max(0.02, 0.16 * wEff));
  const maxX = Math.max(0.5, 1 - minX);
  const minY = Math.min(0.5, Math.max(0.02, 0.16 * hEff));
  const maxY = Math.max(0.5, 1 - minY);

  const x = Math.round(clampNumber(values.x, minX, maxX) * 10000) / 10000;
  const y = Math.round(clampNumber(values.y, minY, maxY) * 10000) / 10000;

  return { x, y, w, rotate };
}

interface Point2D {
  x: number;
  y: number;
}

function clipPolygonAxis(
  poly: Point2D[],
  inside: (p: Point2D) => boolean,
  intersect: (a: Point2D, b: Point2D) => Point2D,
): Point2D[] {
  if (poly.length === 0) return [];
  const out: Point2D[] = [];
  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const currIn = inside(curr);
    const prevIn = inside(prev);
    if (currIn) {
      if (!prevIn) out.push(intersect(prev, curr));
      out.push(curr);
    } else if (prevIn) {
      out.push(intersect(prev, curr));
    }
  }
  return out;
}

function polygonArea(poly: Point2D[]): number {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) * 0.5;
}

/**
 * Exact 2D visible fraction (0..1) of a rotated sticker rectangle inside a
 * `sceneWidth x sceneHeight` viewport box via Sutherland-Hodgman polygon clipping.
 */
export function computeVisibleStickerFraction(
  values: StickerTransformValues,
  sceneWidth: number,
  sceneHeight: number,
  stickerAspect: number,
): number {
  if (sceneWidth <= 0 || sceneHeight <= 0 || stickerAspect <= 0) return 0;
  const pw = values.w * sceneWidth;
  const ph = pw / stickerAspect;
  const totalArea = pw * ph;
  if (totalArea <= 0) return 0;

  const cx = values.x * sceneWidth;
  const cy = values.y * sceneHeight;
  const rad = (values.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const halfW = pw / 2;
  const halfH = ph / 2;
  const localCorners: Point2D[] = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];

  let poly = localCorners.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));

  // Clip against x >= 0, x <= sceneWidth, y >= 0, y <= sceneHeight
  poly = clipPolygonAxis(poly, (p) => p.x >= 0, (a, b) => {
    const t = (0 - a.x) / (b.x - a.x);
    return { x: 0, y: a.y + t * (b.y - a.y) };
  });
  poly = clipPolygonAxis(poly, (p) => p.x <= sceneWidth, (a, b) => {
    const t = (sceneWidth - a.x) / (b.x - a.x);
    return { x: sceneWidth, y: a.y + t * (b.y - a.y) };
  });
  poly = clipPolygonAxis(poly, (p) => p.y >= 0, (a, b) => {
    const t = (0 - a.y) / (b.y - a.y);
    return { x: a.x + t * (b.x - a.x), y: 0 };
  });
  poly = clipPolygonAxis(poly, (p) => p.y <= sceneHeight, (a, b) => {
    const t = (sceneHeight - a.y) / (b.y - a.y);
    return { x: a.x + t * (b.x - a.x), y: sceneHeight };
  });

  return polygonArea(poly) / totalArea;
}

/**
 * Hit-tests normalized stage coordinates `(normX, normY)` in `[0, 1]` against
 * placed stickers from highest `z` to lowest `z`, accounting for rotation.
 */
export function hitTestStickerAtPoint(
  items: readonly StickerPlacement[],
  normX: number,
  normY: number,
  sceneWidth: number,
  sceneHeight: number,
): StickerPlacement | null {
  if (sceneWidth <= 0 || sceneHeight <= 0) return null;
  const px = normX * sceneWidth;
  const py = normY * sceneHeight;

  const sortedTopDown = [...items].sort((a, b) => b.z - a.z);
  for (const item of sortedTopDown) {
    const aspect = getStickerById(item.stickerId)?.aspect ?? 1;
    // Enforce minimum 44x44px hit box matching WCAG / mobile touch rules
    const rawW = item.w * sceneWidth;
    const rawH = rawW / aspect;
    const halfW = Math.max(22, rawW / 2);
    const halfH = Math.max(22, rawH / 2);

    const dx = px - item.x * sceneWidth;
    const dy = py - item.y * sceneHeight;
    const rad = (-item.rotate * Math.PI) / 180;
    const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
      return item;
    }
  }
  return null;
}

export function applyDragDelta(
  initial: StickerTransformValues,
  deltaPxX: number,
  deltaPxY: number,
  stageRect: StageRectLike,
  stickerAspect: number,
): StickerTransformValues {
  if (stageRect.width <= 0 || stageRect.height <= 0) return initial;
  const sceneAspect = stageRect.width / stageRect.height;
  return clampStickerToSceneBox(
    {
      x: initial.x + deltaPxX / stageRect.width,
      y: initial.y + deltaPxY / stageRect.height,
      w: initial.w,
      rotate: initial.rotate,
    },
    sceneAspect,
    stickerAspect,
  );
}

export function applyCornerResize(
  initial: StickerTransformValues,
  startClientX: number,
  startClientY: number,
  currentClientX: number,
  currentClientY: number,
  stageRect: StageRectLike,
  stickerAspect: number,
): StickerTransformValues {
  if (stageRect.width <= 0 || stageRect.height <= 0) return initial;
  const centerX = stageRect.left + initial.x * stageRect.width;
  const centerY = stageRect.top + initial.y * stageRect.height;
  const startDist = Math.hypot(startClientX - centerX, startClientY - centerY);
  const currentDist = Math.hypot(currentClientX - centerX, currentClientY - centerY);
  const scaleRatio = startDist > 4 ? currentDist / startDist : 1;
  const sceneAspect = stageRect.width / stageRect.height;

  return clampStickerToSceneBox(
    {
      x: initial.x,
      y: initial.y,
      w: initial.w * scaleRatio,
      rotate: initial.rotate,
    },
    sceneAspect,
    stickerAspect,
  );
}

export function applyHandleRotate(
  initial: StickerTransformValues,
  currentClientX: number,
  currentClientY: number,
  stageRect: StageRectLike,
  stickerAspect: number,
): StickerTransformValues {
  if (stageRect.width <= 0 || stageRect.height <= 0) return initial;
  const centerX = stageRect.left + initial.x * stageRect.width;
  const centerY = stageRect.top + initial.y * stageRect.height;
  const angleFromCenterDeg = (Math.atan2(currentClientY - centerY, currentClientX - centerX) * 180) / Math.PI;
  // Top handle sits at -90deg in screen space -> +90deg offset yields 0deg upright
  const nextRotate = wrapAngleDegrees(angleFromCenterDeg + 90);
  const sceneAspect = stageRect.width / stageRect.height;

  return clampStickerToSceneBox(
    {
      x: initial.x,
      y: initial.y,
      w: initial.w,
      rotate: nextRotate,
    },
    sceneAspect,
    stickerAspect,
  );
}

export type KeyboardStickerResult =
  | { action: "update"; values: StickerTransformValues }
  | { action: "remove" }
  | { action: "deselect" }
  | { action: "noop" };

export function applyKeyboardShortcut(
  current: StickerTransformValues,
  key: string,
  shiftKey: boolean,
  sceneAspect: number,
  stickerAspect: number,
): KeyboardStickerResult {
  const moveStep = shiftKey ? KEYBOARD_MOVE_FAST_STEP : KEYBOARD_MOVE_STEP;
  const scaleStep = shiftKey ? KEYBOARD_SCALE_FAST_STEP : KEYBOARD_SCALE_STEP;
  const rotateStep = shiftKey ? KEYBOARD_ROTATE_FAST_STEP : KEYBOARD_ROTATE_STEP;

  switch (key) {
    case "ArrowLeft":
      return {
        action: "update",
        values: clampStickerToSceneBox({ ...current, x: current.x - moveStep }, sceneAspect, stickerAspect),
      };
    case "ArrowRight":
      return {
        action: "update",
        values: clampStickerToSceneBox({ ...current, x: current.x + moveStep }, sceneAspect, stickerAspect),
      };
    case "ArrowUp":
      return {
        action: "update",
        values: clampStickerToSceneBox({ ...current, y: current.y - moveStep }, sceneAspect, stickerAspect),
      };
    case "ArrowDown":
      return {
        action: "update",
        values: clampStickerToSceneBox({ ...current, y: current.y + moveStep }, sceneAspect, stickerAspect),
      };
    case "+":
    case "=":
      return {
        action: "update",
        values: clampStickerToSceneBox({ ...current, w: current.w + scaleStep }, sceneAspect, stickerAspect),
      };
    case "-":
    case "_":
      return {
        action: "update",
        values: clampStickerToSceneBox({ ...current, w: current.w - scaleStep }, sceneAspect, stickerAspect),
      };
    case "[":
      return {
        action: "update",
        values: clampStickerToSceneBox(
          { ...current, rotate: wrapAngleDegrees(current.rotate - rotateStep) },
          sceneAspect,
          stickerAspect,
        ),
      };
    case "]":
      return {
        action: "update",
        values: clampStickerToSceneBox(
          { ...current, rotate: wrapAngleDegrees(current.rotate + rotateStep) },
          sceneAspect,
          stickerAspect,
        ),
      };
    case "Delete":
    case "Backspace":
      return { action: "remove" };
    case "Escape":
      return { action: "deselect" };
    default:
      return { action: "noop" };
  }
}

export function duplicateStickerPlacement(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  uid: string,
  sceneAspect = 9 / 16,
): { next: StickersConfig; createdUid: string | null } {
  const existing = stickers?.scenes[sceneKey]?.items ?? [];
  if (existing.length >= MAX_STICKERS_PER_SCENE) {
    return { next: stickers ?? { version: 1, scenes: {} }, createdUid: null };
  }
  const source = existing.find((item) => item.uid === uid);
  if (!source) {
    return { next: stickers ?? { version: 1, scenes: {} }, createdUid: null };
  }
  const aspect = getStickerById(source.stickerId)?.aspect ?? 1;
  const nudged = clampStickerToSceneBox(
    { x: source.x + 0.06, y: source.y + 0.05, w: source.w, rotate: source.rotate },
    sceneAspect,
    aspect,
  );
  const createdUid = nanoid();
  const next = addStickerPlacement(stickers, sceneKey, {
    uid: createdUid,
    stickerId: source.stickerId,
    ...nudged,
    flipX: source.flipX,
    entry: source.entry,
  });
  return { next, createdUid };
}

export function resetStickerPlacementToDefault(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  uid: string,
): StickersConfig {
  return updateStickerPlacement(stickers, sceneKey, uid, {
    x: DEFAULT_STICKER_PLACEMENT.x,
    y: DEFAULT_STICKER_PLACEMENT.y,
    w: DEFAULT_STICKER_PLACEMENT.w,
    rotate: DEFAULT_STICKER_PLACEMENT.rotate,
    flipX: false,
  });
}

export function shiftStickerLayerOrder(
  stickers: StickersConfig | undefined,
  sceneKey: SceneKey,
  uid: string,
  direction: "forward" | "backward",
): StickersConfig {
  const items = stickers?.scenes[sceneKey]?.items ?? [];
  const fromIndex = items.findIndex((item) => item.uid === uid);
  if (fromIndex === -1) return stickers ?? { version: 1, scenes: {} };
  const toIndex = direction === "forward" ? fromIndex + 1 : fromIndex - 1;
  if (toIndex < 0 || toIndex >= items.length) return stickers ?? { version: 1, scenes: {} };
  return reorderStickerPlacements(stickers, sceneKey, fromIndex, toIndex);
}
