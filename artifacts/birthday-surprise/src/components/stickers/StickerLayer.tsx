import React, { useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import {
  applyCornerResize,
  applyDragDelta,
  applyHandleRotate,
  applyKeyboardShortcut,
  type StageRectLike,
  type StickerTransformValues,
} from "@/lib/stickers/editorMath";
import { getStickerById } from "@/lib/stickers/manifest";
import { areStickersSupported, getSceneStickers } from "@/lib/stickers/model";
import type { SceneKey, StickerPlacement } from "@/lib/v2/schema";

export interface StickerLayerProps {
  sceneKey: SceneKey;
  /** Optional explicit reduced-motion override; defaults to media query. */
  reducedMotion?: boolean;
  /** Editor-only interactive mode — NEVER set in public or preview views. */
  editable?: boolean;
  selectedUid?: string | null;
  onSelectUid?: (uid: string | null) => void;
  onCommitPlacement?: (uid: string, patch: StickerTransformValues) => void;
  onRemoveUid?: (uid: string) => void;
}

function usePrefersReducedMotion(override?: boolean): boolean {
  const [systemReduced, setSystemReduced] = useState<boolean>(() => {
    if (override !== undefined) return override;
    return (
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
  });

  useEffect(() => {
    if (override !== undefined || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setSystemReduced(mq.matches);
    setSystemReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [override]);

  return override ?? systemReduced;
}

function arePlacementsEqual(a: StickerPlacement, b: StickerPlacement): boolean {
  return (
    a.uid === b.uid &&
    a.stickerId === b.stickerId &&
    a.x === b.x &&
    a.y === b.y &&
    a.w === b.w &&
    a.rotate === b.rotate &&
    a.z === b.z &&
    Boolean(a.flipX) === Boolean(b.flipX) &&
    (a.entry ?? "fade") === (b.entry ?? "fade")
  );
}

function arePlacementListsEqual(
  prev: readonly StickerPlacement[],
  next: readonly StickerPlacement[],
): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (!arePlacementsEqual(prev[i], next[i])) return false;
  }
  return true;
}

const StickerImg = React.memo(
  function StickerImg({
    item,
    reducedMotion,
  }: {
    item: StickerPlacement;
    reducedMotion: boolean;
  }) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const manifestItem = getStickerById(item.stickerId);
    if (!manifestItem) return null;

    const src = reducedMotion ? manifestItem.poster : manifestItem.webp;
    if (failedSrc === src) return null;
    const flip = item.flipX ? " scaleX(-1)" : "";
    const shouldFade = !reducedMotion && (item.entry ?? "fade") !== "none";

    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
        onError={() => setFailedSrc(src)}
        data-sticker-uid={item.uid}
        className={`sticker-layer-item${shouldFade ? " sticker-layer-item--fade" : ""}`}
        style={{
          position: "absolute",
          left: `${item.x * 100}%`,
          top: `${item.y * 100}%`,
          width: `${item.w * 100}%`,
          aspectRatio: String(manifestItem.aspect),
          transform: `translate(-50%, -50%) rotate(${item.rotate}deg)${flip}`,
          zIndex: item.z,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    );
  },
  (prev, next) =>
    prev.reducedMotion === next.reducedMotion && arePlacementsEqual(prev.item, next.item),
);

interface ActiveGesture {
  mode: "move" | "resize" | "rotate";
  uid: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  initial: StickerTransformValues;
  draft: StickerTransformValues;
  stageRect: StageRectLike;
  stickerAspect: number;
  moved: boolean;
}

function EditableStickerOverlay({
  sceneKey,
  items,
  reducedMotion,
  selectedUid,
  onSelectUid,
  onCommitPlacement,
  onRemoveUid,
}: {
  sceneKey: SceneKey;
  items: readonly StickerPlacement[];
  reducedMotion: boolean;
  selectedUid: string | null;
  onSelectUid?: (uid: string | null) => void;
  onCommitPlacement?: (uid: string, patch: StickerTransformValues) => void;
  onRemoveUid?: (uid: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const itemElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const gestureRef = useRef<ActiveGesture | null>(null);
  const rafRef = useRef<number | null>(null);
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const ordered = useMemo(() => [...items].sort((a, b) => a.z - b.z), [items]);

  const flushDomDraft = (uid: string, draft: StickerTransformValues) => {
    const el = itemElsRef.current.get(uid);
    if (!el) return;
    el.style.left = `${draft.x * 100}%`;
    el.style.top = `${draft.y * 100}%`;
    el.style.width = `${draft.w * 100}%`;
    el.style.transform = `translate(-50%, -50%) rotate(${draft.rotate}deg)`;
  };

  const beginGesture = (
    e: React.PointerEvent<HTMLElement>,
    item: StickerPlacement,
    mode: "move" | "resize" | "rotate",
    stickerAspect: number,
  ) => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    e.stopPropagation();
    const rect = stageEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Synthetic test events may omit native capture slot */
    }

    const initial: StickerTransformValues = {
      x: item.x,
      y: item.y,
      w: item.w,
      rotate: item.rotate,
    };

    gestureRef.current = {
      mode,
      uid: item.uid,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initial,
      draft: { ...initial },
      stageRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      stickerAspect,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    e.stopPropagation();

    let next: StickerTransformValues;
    if (g.mode === "move") {
      next = applyDragDelta(
        g.initial,
        e.clientX - g.startClientX,
        e.clientY - g.startClientY,
        g.stageRect,
        g.stickerAspect,
      );
    } else if (g.mode === "resize") {
      next = applyCornerResize(
        g.initial,
        g.startClientX,
        g.startClientY,
        e.clientX,
        e.clientY,
        g.stageRect,
        g.stickerAspect,
      );
    } else {
      next = applyHandleRotate(g.initial, e.clientX, e.clientY, g.stageRect, g.stickerAspect);
    }

    g.draft = next;
    g.moved = true;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const uid = g.uid;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      flushDomDraft(uid, next);
    });
  };

  const endGesture = (e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    e.stopPropagation();

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* Ignore already released pointers */
    }

    gestureRef.current = null;
    if (g.moved) {
      flushDomDraft(g.uid, g.draft);
      const changed =
        g.draft.x !== g.initial.x ||
        g.draft.y !== g.initial.y ||
        g.draft.w !== g.initial.w ||
        g.draft.rotate !== g.initial.rotate;
      if (changed) {
        onCommitPlacement?.(g.uid, g.draft);
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    item: StickerPlacement,
    stickerAspect: number,
  ) => {
    const rect = stageRef.current?.getBoundingClientRect();
    const sceneAspect = rect && rect.height > 0 ? rect.width / rect.height : 9 / 16;
    const outcome = applyKeyboardShortcut(
      { x: item.x, y: item.y, w: item.w, rotate: item.rotate },
      e.key,
      e.shiftKey,
      sceneAspect,
      stickerAspect,
    );

    if (outcome.action === "noop") return;
    e.preventDefault();
    e.stopPropagation();

    if (outcome.action === "update") {
      onCommitPlacement?.(item.uid, outcome.values);
    } else if (outcome.action === "remove") {
      onRemoveUid?.(item.uid);
    } else if (outcome.action === "deselect") {
      onSelectUid?.(null);
    }
  };

  return (
    <div
      ref={stageRef}
      className="sticker-layer sticker-layer--editable"
      data-sticker-layer={sceneKey}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectUid?.(null);
      }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        pointerEvents: "auto",
        touchAction: "pan-y",
        overflow: "hidden",
      }}
    >
      {ordered.map((item) => {
        const manifestItem = getStickerById(item.stickerId);
        if (!manifestItem) return null;

        const isSelected = item.uid === selectedUid;
        const src = reducedMotion ? manifestItem.poster : manifestItem.webp;
        const assetKey = `${item.uid}:${src}`;
        if (failedKeys.has(assetKey)) return null;

        return (
          <div
            key={item.uid}
            ref={(el) => {
              if (el) itemElsRef.current.set(item.uid, el);
              else itemElsRef.current.delete(item.uid);
            }}
            role="button"
            tabIndex={0}
            aria-label={`${manifestItem.name} sticker on canvas`}
            aria-pressed={isSelected}
            data-sticker-uid={item.uid}
            data-selected={isSelected ? "true" : "false"}
            className={`sticker-editor-item${isSelected ? " is-selected" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) onSelectUid?.(item.uid);
            }}
            onKeyDown={(e) => handleKeyDown(e, item, manifestItem.aspect)}
            onPointerDown={
              isSelected
                ? (e) => beginGesture(e, item, "move", manifestItem.aspect)
                : undefined
            }
            onPointerMove={isSelected ? handlePointerMove : undefined}
            onPointerUp={isSelected ? endGesture : undefined}
            onPointerCancel={isSelected ? endGesture : undefined}
            style={{
              position: "absolute",
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              width: `${item.w * 100}%`,
              minWidth: "44px",
              minHeight: "44px",
              aspectRatio: String(manifestItem.aspect),
              transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
              zIndex: isSelected ? 100 + item.z : item.z,
              cursor: isSelected ? "grab" : "pointer",
              touchAction: isSelected ? "none" : "pan-y",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={src}
              alt=""
              aria-hidden="true"
              decoding="async"
              draggable={false}
              onError={() =>
                setFailedKeys((prev) => {
                  const next = new Set(prev);
                  next.add(assetKey);
                  return next;
                })
              }
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
                userSelect: "none",
                transform: item.flipX ? "scaleX(-1)" : undefined,
              }}
            />

            {isSelected && (
              <>
                <span className="sticker-editor-outline" aria-hidden="true" />
                <button
                  type="button"
                  className="sticker-handle sticker-handle--rotate"
                  aria-label={`Rotate ${manifestItem.name}`}
                  onPointerDown={(e) => beginGesture(e, item, "rotate", manifestItem.aspect)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endGesture}
                  onPointerCancel={endGesture}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sticker-handle-knob" aria-hidden="true">↻</span>
                </button>
                <button
                  type="button"
                  className="sticker-handle sticker-handle--resize"
                  aria-label={`Resize ${manifestItem.name}`}
                  onPointerDown={(e) => beginGesture(e, item, "resize", manifestItem.aspect)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endGesture}
                  onPointerCancel={endGesture}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sticker-handle-knob" aria-hidden="true">↘</span>
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

const StickerLayerBody = React.memo(
  function StickerLayerBody({
    sceneKey,
    items,
    reducedMotion,
  }: {
    sceneKey: SceneKey;
    items: readonly StickerPlacement[];
    reducedMotion: boolean;
  }) {
    const ordered = useMemo(() => [...items].sort((a, b) => a.z - b.z), [items]);
    if (ordered.length === 0) return null;

    return (
      <div
        className="sticker-layer"
        data-sticker-layer={sceneKey}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {ordered.map((item) => (
          <StickerImg key={item.uid} item={item} reducedMotion={reducedMotion} />
        ))}
      </div>
    );
  },
  (prev, next) =>
    prev.sceneKey === next.sceneKey &&
    prev.reducedMotion === next.reducedMotion &&
    arePlacementListsEqual(prev.items, next.items),
);

function StickerLayerInner({
  sceneKey,
  reducedMotion: reducedMotionProp,
  editable = false,
  selectedUid = null,
  onSelectUid,
  onCommitPlacement,
  onRemoveUid,
}: StickerLayerProps) {
  const config = useConfig();
  const reducedMotion = usePrefersReducedMotion(reducedMotionProp);
  const items = useMemo(() => getSceneStickers(config, sceneKey), [config, sceneKey]);

  if (!areStickersSupported(sceneKey)) return null;

  if (editable) {
    return (
      <EditableStickerOverlay
        sceneKey={sceneKey}
        items={items}
        reducedMotion={reducedMotion}
        selectedUid={selectedUid}
        onSelectUid={onSelectUid}
        onCommitPlacement={onCommitPlacement}
        onRemoveUid={onRemoveUid}
      />
    );
  }

  if (items.length === 0) return null;

  return <StickerLayerBody sceneKey={sceneKey} items={items} reducedMotion={reducedMotion} />;
}

const StickerLayer = React.memo(StickerLayerInner);
export default StickerLayer;
