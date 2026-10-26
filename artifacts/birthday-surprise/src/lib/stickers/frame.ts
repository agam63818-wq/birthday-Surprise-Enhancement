import { useEffect, useState } from "react";
import { clampNumber, clampStickerToSceneBox, type StickerTransformValues } from "@/lib/stickers/editorMath";

/**
 * Canonical sticker coordinate frame (shared by Customize, Preview and public).
 *
 * - The frame is the FIRST VIEWPORT of a scene: full scene width × 100dvh,
 *   anchored to the top of the scene. It never stretches with long/scrolling
 *   scenes, so `y` means the same thing on every scene and device.
 * - `x`, `y` are fractions of the frame width / height (sticker centre).
 * - `w` is a fraction of the "sticker unit" = min(frameW, frameH × 0.75).
 *   On portrait phones that equals the frame width (identical to the legacy
 *   meaning), while on wide desktops stickers no longer balloon to 22% of a
 *   1400px-wide window.
 */
export const STICKER_UNIT_HEIGHT_RATIO = 0.75;
export const STICKER_W_MIN = 0.05;
export const STICKER_W_MAX = 0.9;

/** Ratio between the sticker unit and the frame width (always 0 < k <= 1). */
export function stickerUnitScale(frameW: number, frameH: number): number {
  if (!(frameW > 0) || !(frameH > 0)) return 1;
  return Math.min(frameW, frameH * STICKER_UNIT_HEIGHT_RATIO) / frameW;
}

/** Convert stored values → frame-width-relative values used by editorMath. */
export function toFrameSpace(v: StickerTransformValues, k: number): StickerTransformValues {
  return { ...v, w: v.w * k };
}

/** Convert frame-width-relative values back → stored values. */
export function fromFrameSpace(v: StickerTransformValues, k: number): StickerTransformValues {
  const w = Math.round(clampNumber(v.w / (k || 1), STICKER_W_MIN, STICKER_W_MAX) * 10000) / 10000;
  return { x: v.x, y: v.y, w, rotate: v.rotate };
}

/** Clamp stored values so the sticker stays mostly visible inside the frame. */
export function clampInFrame(
  values: StickerTransformValues,
  frameW: number,
  frameH: number,
  stickerAspect: number,
): StickerTransformValues {
  const k = stickerUnitScale(frameW, frameH);
  const w = Math.round(clampNumber(values.w, STICKER_W_MIN, STICKER_W_MAX) * 10000) / 10000;
  const aspect = frameW > 0 && frameH > 0 ? frameW / frameH : 9 / 16;
  const c = clampStickerToSceneBox({ ...values, w: w * k }, aspect, stickerAspect);
  return { x: c.x, y: c.y, w, rotate: c.rotate };
}

export interface ViewportSize {
  width: number;
  height: number;
}

function readViewport(): ViewportSize {
  if (typeof window === "undefined") return { width: 390, height: 844 };
  const width = document.documentElement?.clientWidth || window.innerWidth || 390;
  const height = window.innerHeight || 844;
  return { width: Math.max(280, width), height: Math.max(420, height) };
}

/** Live device viewport (CSS px, scrollbar excluded) — updates on resize/rotate. */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(readViewport);
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = readViewport();
        setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return size;
}
