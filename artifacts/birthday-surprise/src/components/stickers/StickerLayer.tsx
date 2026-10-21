import React, { memo, useEffect, useMemo, useState } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { getStickerById } from "@/lib/stickers/manifest";
import { getSceneStickers } from "@/lib/stickers/model";
import type { SceneKey, StickerPlacement, SurpriseConfig } from "@/lib/v2/schema";

export interface StickerLayerProps {
  sceneKey: SceneKey | string;
  /** Optional explicit config override (defaults to ConfigContext). */
  config?: SurpriseConfig;
  /** Optional reduced-motion override (defaults to prefers-reduced-motion media query). */
  reducedMotion?: boolean;
}

function usePrefersReducedMotion(override?: boolean): boolean {
  const [systemReduced, setSystemReduced] = useState<boolean>(() => {
    if (override !== undefined) return override;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (override !== undefined) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener?.(onChange);
    return () => mq.removeListener?.(onChange);
  }, [override]);

  return override ?? systemReduced;
}

export function arePlacementsEqual(a: StickerPlacement, b: StickerPlacement): boolean {
  return (
    a.uid === b.uid &&
    a.stickerId === b.stickerId &&
    a.x === b.x &&
    a.y === b.y &&
    a.w === b.w &&
    a.rotate === b.rotate &&
    a.z === b.z &&
    a.flipX === b.flipX &&
    a.entry === b.entry
  );
}

export function arePlacementListsEqual(
  a: readonly StickerPlacement[],
  b: readonly StickerPlacement[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!arePlacementsEqual(a[i], b[i])) return false;
  }
  return true;
}

interface StickerImgProps {
  item: StickerPlacement;
  reducedMotion: boolean;
}

const StickerImg = memo(
  function StickerImg({ item, reducedMotion }: StickerImgProps) {
    const meta = getStickerById(item.stickerId);
    if (!meta) return null;

    const src = reducedMotion ? meta.poster : meta.webp;
    const entryClass =
      !reducedMotion && item.entry !== "none" ? " sticker-layer-item--fade" : "";
    const transform = `translate(-50%, -50%) rotate(${item.rotate}deg)${
      item.flipX ? " scaleX(-1)" : ""
    }`;

    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
        width={meta.width}
        height={meta.height}
        data-sticker-uid={item.uid}
        data-sticker-id={meta.id}
        className={`sticker-layer-item${entryClass}`}
        style={{
          position: "absolute",
          left: `${item.x * 100}%`,
          top: `${item.y * 100}%`,
          width: `${item.w * 100}%`,
          height: "auto",
          aspectRatio: String(meta.aspect),
          transform,
          zIndex: item.z,
          pointerEvents: "none",
        }}
      />
    );
  },
  (prev, next) =>
    prev.reducedMotion === next.reducedMotion &&
    arePlacementsEqual(prev.item, next.item),
);

interface StickerLayerListProps {
  sceneKey: string;
  items: readonly StickerPlacement[];
  reducedMotion: boolean;
}

const StickerLayerList = memo(
  function StickerLayerList({ sceneKey, items, reducedMotion }: StickerLayerListProps) {
    if (items.length === 0) return null;

    return (
      <div
        className="sticker-layer"
        data-sticker-layer={sceneKey}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {items.map((item) => (
          <StickerImg
            key={item.uid}
            item={item}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    );
  },
  (prev, next) =>
    prev.sceneKey === next.sceneKey &&
    prev.reducedMotion === next.reducedMotion &&
    arePlacementListsEqual(prev.items, next.items),
);

function StickerLayerBase({ sceneKey, config: configProp, reducedMotion }: StickerLayerProps) {
  const ctxConfig = useConfig();
  const activeConfig = configProp ?? ctxConfig;
  const effectiveReduced = usePrefersReducedMotion(reducedMotion);

  const items = useMemo(
    () => getSceneStickers(activeConfig, sceneKey),
    [activeConfig.stickers, activeConfig.occasionId, activeConfig.occasionType, sceneKey],
  );

  return (
    <StickerLayerList
      sceneKey={sceneKey}
      items={items}
      reducedMotion={effectiveReduced}
    />
  );
}

const StickerLayer = memo(StickerLayerBase);
export default StickerLayer;
