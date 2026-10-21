import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  STICKER_CATEGORIES,
  STICKER_MANIFEST,
  type StickerCategory,
  type StickerManifestItem,
} from "@/lib/stickers/manifest";

const CATEGORY_META: Record<StickerCategory | "all", { label: string; emoji: string }> = {
  all: { label: "All", emoji: "✦" },
  love: { label: "Love", emoji: "♥" },
  cute: { label: "Cute", emoji: "✿" },
  celebrate: { label: "Celebrate", emoji: "★" },
  funny: { label: "Funny", emoji: "☺" },
};

const StickerGalleryTile = React.memo(function StickerGalleryTile({
  item,
  isVisible,
  isSelected,
  reducedMotion,
  previewHeavy,
  onToggleHeavyPreview,
  onPick,
  observeTile,
}: {
  item: StickerManifestItem;
  isVisible: boolean;
  isSelected: boolean;
  reducedMotion: boolean;
  previewHeavy: boolean;
  onToggleHeavyPreview: (id: string) => void;
  onPick: (id: string) => void;
  observeTile: (id: string, node: HTMLDivElement | null) => void;
}) {
  const shouldAnimate =
    !reducedMotion && isVisible && (!item.heavy || previewHeavy);
  const src = shouldAnimate ? item.webp : item.poster;

  return (
    <div
      ref={(el) => observeTile(item.id, el)}
      data-sticker-tile={item.id}
      data-animating={shouldAnimate ? "true" : "false"}
      style={{
        position: "relative",
        borderRadius: "14px",
        border: isSelected
          ? "1.5px solid rgba(236, 72, 153, 0.85)"
          : "1px solid rgba(167, 139, 250, 0.24)",
        background: isSelected
          ? "linear-gradient(145deg, rgba(236, 72, 153, 0.2), rgba(124, 58, 237, 0.18))"
          : "rgba(167, 139, 250, 0.06)",
        boxShadow: isSelected ? "0 6px 20px rgba(236, 72, 153, 0.25)" : "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => onPick(item.id)}
        aria-label={`Select sticker ${item.name}`}
        aria-pressed={isSelected}
        style={{
          appearance: "none",
          width: "100%",
          minHeight: "112px",
          padding: "10px 8px 8px",
          border: 0,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        </div>
        <span
          style={{
            fontSize: "0.74rem",
            fontWeight: isSelected ? 600 : 500,
            lineHeight: 1.25,
            color: isSelected ? "#fde68a" : "#f3ecff",
          }}
        >
          {item.name}
        </span>
      </button>

      {isSelected && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "6px",
            left: "6px",
            padding: "2px 6px",
            borderRadius: "999px",
            fontSize: "0.65rem",
            fontWeight: 700,
            background: "rgba(236, 72, 153, 0.88)",
            color: "#fff",
            pointerEvents: "none",
          }}
        >
          ✓ Active
        </span>
      )}

      {item.heavy && !reducedMotion && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleHeavyPreview(item.id);
          }}
          aria-label={`Preview animation for ${item.name}`}
          aria-pressed={previewHeavy}
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "6px 8px",
            border: 0,
            borderTop: "1px solid rgba(167, 139, 250, 0.2)",
            background: previewHeavy ? "rgba(236, 72, 153, 0.22)" : "rgba(15, 6, 32, 0.65)",
            color: "#e9d5ff",
            fontSize: "0.68rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {previewHeavy ? "⏸ Pause HD preview" : "▶ Tap to preview HD"}
        </button>
      )}
    </div>
  );
});

export interface StickerGalleryPickerProps {
  open: boolean;
  mode: "add" | "replace";
  activeStickerIds: ReadonlySet<string>;
  onSelectSticker: (stickerId: string) => void;
  onClose: () => void;
}

export default function StickerGalleryPicker({
  open,
  mode,
  activeStickerIds,
  onSelectSticker,
  onClose,
}: StickerGalleryPickerProps) {
  const [category, setCategory] = useState<StickerCategory | "all">("all");
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  const [heavyPreviewIds, setHeavyPreviewIds] = useState<Set<string>>(() => new Set());
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tileNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReducedMotion(Boolean(mq?.matches));
    mq?.addEventListener?.("change", onMotion);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", onResize);
      mq?.removeEventListener?.("change", onMotion);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || isMobile || typeof document === "undefined") return;
    const onPointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, isMobile, onClose]);

  const filtered = useMemo(
    () =>
      category === "all"
        ? STICKER_MANIFEST
        : STICKER_MANIFEST.filter((item) => item.category === category),
    [category],
  );

  // Lazy animation via IntersectionObserver — only visible tiles animate
  useEffect(() => {
    if (!open) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisibleIds(new Set(filtered.map((item) => item.id)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.stickerTile;
            if (!id) continue;
            if (entry.isIntersecting && !next.has(id)) {
              next.add(id);
              changed = true;
            } else if (!entry.isIntersecting && next.has(id)) {
              next.delete(id);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { root: scrollBoxRef.current, threshold: 0.1 },
    );

    observerRef.current = observer;
    for (const node of tileNodesRef.current.values()) {
      observer.observe(node);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [open, filtered, isMobile]);

  const observeTile = React.useCallback((id: string, node: HTMLDivElement | null) => {
    const prev = tileNodesRef.current.get(id);
    if (prev && observerRef.current) observerRef.current.unobserve(prev);
    if (node) {
      tileNodesRef.current.set(id, node);
      observerRef.current?.observe(node);
    } else {
      tileNodesRef.current.delete(id);
    }
  }, []);

  const toggleHeavyPreview = React.useCallback((id: string) => {
    setHeavyPreviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!open) return null;

  const content = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#fdf2f8" }}>
            {mode === "replace" ? "Replace sticker" : "Choose an animated sticker"}
          </h4>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "rgba(226, 199, 255, 0.72)" }}>
            {mode === "replace"
              ? "Tap any sticker to swap it while keeping exact position, size & angle."
              : "Tap any kitty sticker to add it straight onto this scene."}
          </p>
        </div>
        <button
          type="button"
          className="sticker-editor-btn"
          aria-label="Close sticker gallery"
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>

      {/* Category filter chips */}
      <div
        role="radiogroup"
        aria-label="Sticker categories"
        style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
      >
        {(["all", ...STICKER_CATEGORIES] as const).map((cat) => {
          const active = category === cat;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(cat)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                minHeight: "44px",
                padding: "6px 12px",
                borderRadius: "999px",
                fontSize: "0.76rem",
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                border: active
                  ? "1px solid rgba(236, 72, 153, 0.72)"
                  : "1px solid rgba(167, 139, 250, 0.26)",
                background: active
                  ? "linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(124, 58, 237, 0.25))"
                  : "rgba(167, 139, 250, 0.08)",
                color: active ? "#fde68a" : "#f3ecff",
              }}
            >
              <span aria-hidden="true">{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable 2-3 column sticker grid */}
      <div
        ref={scrollBoxRef}
        style={{
          overflowY: "auto",
          overscrollBehavior: "contain",
          paddingRight: "2px",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div className="sticker-gallery-grid">
          {filtered.map((item) => (
            <StickerGalleryTile
              key={item.id}
              item={item}
              isVisible={visibleIds.has(item.id)}
              isSelected={activeStickerIds.has(item.id)}
              reducedMotion={reducedMotion}
              previewHeavy={heavyPreviewIds.has(item.id)}
              onToggleHeavyPreview={toggleHeavyPreview}
              onPick={onSelectSticker}
              observeTile={observeTile}
            />
          ))}
        </div>
      </div>
    </>
  );

  if (isMobile && typeof document !== "undefined") {
    return createPortal(
      <div
        className="sticker-gallery-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sticker gallery"
          className="sticker-gallery-sheet"
        >
          <div
            aria-hidden="true"
            style={{
              width: "42px",
              height: "4px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.28)",
              alignSelf: "center",
            }}
          />
          {content}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-label="Sticker gallery"
      className="sticker-gallery-popover"
    >
      {content}
    </div>
  );
}
