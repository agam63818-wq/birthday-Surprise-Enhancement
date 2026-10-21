import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import StickerLayer from "@/components/stickers/StickerLayer";
import StickerGalleryPicker from "@/components/stickers/StickerGalleryPicker";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { FONT_PRESETS, DEFAULT_FONT_PRESET } from "@/lib/fontPresets";
import {
  clampStickerToSceneBox,
  DEFAULT_STICKER_PLACEMENT,
  duplicateStickerPlacement,
  resetStickerPlacementToDefault,
  shiftStickerLayerOrder,
  type StickerTransformValues,
} from "@/lib/stickers/editorMath";
import { getStickerById } from "@/lib/stickers/manifest";
import {
  addStickerPlacement,
  MAX_STICKERS_PER_SCENE,
  removeStickerPlacement,
  resolveActiveSceneKey,
  setSceneStickersEnabled,
  updateStickerPlacement,
} from "@/lib/stickers/model";
import {
  DEFAULT_THEME_PRESET,
  THEME_PRESETS,
  type ThemePresetId,
} from "@/lib/themePresets";
import { nanoid } from "@/lib/v2/nanoid";
import { renderLegacySceneById } from "@/BirthdayExperience";
import { getLazyScene } from "@/scenes/SceneEngine";
import type { SceneKey, StickerPlacement, SurpriseConfig } from "@/lib/v2/schema";

const VIRTUAL_STAGE_W = 390;
const VIRTUAL_STAGE_H = 660;
const NOOP = () => {};

function SceneLivePreviewStage({
  sceneKey,
  config,
}: {
  sceneKey: SceneKey;
  config: SurpriseConfig;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(308);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 40) setContainerWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const occasion = config.occasionId ?? config.occasionType;
  const resolvedPreviewKey = resolveActiveSceneKey(sceneKey, occasion) ?? sceneKey;
  const SceneComponent = getLazyScene(resolvedPreviewKey);

  const candidateTheme = config.themePreset ?? config.themeId;
  const themeId: ThemePresetId =
    candidateTheme && candidateTheme in THEME_PRESETS
      ? (candidateTheme as ThemePresetId)
      : DEFAULT_THEME_PRESET;
  const globalFontId = config.textStyles?.global;
  const resolvedFont =
    globalFontId && globalFontId in FONT_PRESETS
      ? FONT_PRESETS[globalFontId]
      : FONT_PRESETS[DEFAULT_FONT_PRESET];
  const fontFamily = resolvedFont.fontFamily;

  const scale = containerWidth / VIRTUAL_STAGE_W;
  const scaledHeight = Math.round(VIRTUAL_STAGE_H * scale);

  const stageVars = useMemo(
    () =>
      ({
        ...THEME_PRESETS[themeId].vars,
        "--v2-body-font": fontFamily,
        fontFamily,
      }) as React.CSSProperties,
    [themeId, fontFamily],
  );

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        height: `${scaledHeight}px`,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        className="experience-root cinematic-experience sticker-stage-live-bg"
        data-theme={themeId}
        style={{
          ...stageVars,
          transform: `scale(${scale})`,
        }}
      >
        <ConfigProvider config={config}>
          <Suspense fallback={<div style={{ width: "100%", height: "100%" }} />}>
            {SceneComponent ? (
              <SceneComponent
                onNext={NOOP}
                isActive
                reducedMotion={false}
                globalMuted
              />
            ) : (
              renderLegacySceneById(resolvedPreviewKey, occasion, NOOP)
            )}
          </Suspense>
        </ConfigProvider>
      </div>
    </div>
  );
}

export interface SceneStickersEditorProps {
  sceneKey: SceneKey;
  sceneLabel: string;
  config: SurpriseConfig;
  onChange: (next: SurpriseConfig | ((prev: SurpriseConfig) => SurpriseConfig)) => void;
  /** True only when the parent accordion / details card is expanded. */
  panelOpen?: boolean;
}

export default function SceneStickersEditor({
  sceneKey,
  sceneLabel,
  config,
  onChange,
  panelOpen = true,
}: SceneStickersEditorProps) {
  const sceneState = config.stickers?.scenes[sceneKey];
  const isEnabled = Boolean(sceneState?.enabled);
  const items: StickerPlacement[] = sceneState?.items ?? [];

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [galleryMode, setGalleryMode] = useState<"add" | "replace" | null>(null);

  // Keep selection valid if items change or if user switches scenes
  useEffect(() => {
    if (selectedUid && !items.some((item) => item.uid === selectedUid)) {
      setSelectedUid(items.length > 0 ? items[items.length - 1].uid : null);
    }
  }, [items, selectedUid]);

  const selectedItem = useMemo(
    () => items.find((item) => item.uid === selectedUid) ?? null,
    [items, selectedUid],
  );
  const selectedMeta = selectedItem ? getStickerById(selectedItem.stickerId) : undefined;

  const activeStickerIds = useMemo(() => {
    if (galleryMode === "replace" && selectedItem) {
      return new Set<string>([selectedItem.stickerId]);
    }
    return new Set<string>(items.map((item) => item.stickerId));
  }, [galleryMode, items, selectedItem]);

  const applyStickersChange = useCallback(
    (updater: (current: SurpriseConfig) => SurpriseConfig["stickers"]) => {
      onChange((prev) => ({
        ...prev,
        stickers: updater(prev),
      }));
    },
    [onChange],
  );

  const handleToggleEnabled = () => {
    const nextEnabled = !isEnabled;
    applyStickersChange((prev) =>
      setSceneStickersEnabled(prev.stickers, sceneKey, nextEnabled),
    );
    if (nextEnabled && items.length > 0 && !selectedUid) {
      setSelectedUid(items[0].uid);
    }
  };

  const handleGalleryPick = (stickerId: string) => {
    if (galleryMode === "replace" && selectedItem) {
      applyStickersChange((prev) =>
        updateStickerPlacement(prev.stickers, sceneKey, selectedItem.uid, { stickerId }),
      );
      setGalleryMode(null);
      return;
    }

    const uid = nanoid();
    // Stagger default drop position gently when adding multiple stickers so they don't stack identically
    const offsetIndex = items.length % 4;
    const offsets = [
      { x: 0.5, y: 0.46 },
      { x: 0.28, y: 0.3 },
      { x: 0.72, y: 0.32 },
      { x: 0.7, y: 0.72 },
    ];
    const pos = offsets[offsetIndex];

    applyStickersChange((prev) =>
      addStickerPlacement(prev.stickers, sceneKey, {
        uid,
        stickerId,
        x: pos.x,
        y: pos.y,
        w: DEFAULT_STICKER_PLACEMENT.w,
        rotate: DEFAULT_STICKER_PLACEMENT.rotate,
      }),
    );
    setSelectedUid(uid);
    setGalleryMode(null);
  };

  const handleCommitPlacement = useCallback(
    (uid: string, patch: StickerTransformValues) => {
      applyStickersChange((prev) =>
        updateStickerPlacement(prev.stickers, sceneKey, uid, patch),
      );
    },
    [applyStickersChange, sceneKey],
  );

  const handleRemove = useCallback(
    (uid: string) => {
      applyStickersChange((prev) => removeStickerPlacement(prev.stickers, sceneKey, uid));
      if (selectedUid === uid) setSelectedUid(null);
    },
    [applyStickersChange, sceneKey, selectedUid],
  );

  const handleDuplicate = (uid: string) => {
    let created: string | null = null;
    applyStickersChange((prev) => {
      const res = duplicateStickerPlacement(
        prev.stickers,
        sceneKey,
        uid,
        VIRTUAL_STAGE_W / VIRTUAL_STAGE_H,
      );
      created = res.createdUid;
      return res.next;
    });
    if (created) setSelectedUid(created);
  };

  const handleReset = (uid: string) => {
    applyStickersChange((prev) => resetStickerPlacementToDefault(prev.stickers, sceneKey, uid));
    setSelectedUid(uid);
  };

  const handleUpdateSelected = (patch: Partial<StickerPlacement>) => {
    if (!selectedUid) return;
    const targetUid = selectedUid;
    applyStickersChange((prev) => {
      const currentItem = prev.stickers?.scenes[sceneKey]?.items.find(
        (i) => i.uid === targetUid,
      );
      if (!currentItem) return prev.stickers;
      const meta = getStickerById(currentItem.stickerId);
      if (!meta) return prev.stickers;

      if (
        patch.x !== undefined ||
        patch.y !== undefined ||
        patch.w !== undefined ||
        patch.rotate !== undefined
      ) {
        const clamped = clampStickerToSceneBox(
          {
            x: patch.x ?? currentItem.x,
            y: patch.y ?? currentItem.y,
            w: patch.w ?? currentItem.w,
            rotate: patch.rotate ?? currentItem.rotate,
          },
          VIRTUAL_STAGE_W / VIRTUAL_STAGE_H,
          meta.aspect,
        );
        return updateStickerPlacement(prev.stickers, sceneKey, targetUid, {
          ...patch,
          ...clamped,
        });
      }

      return updateStickerPlacement(prev.stickers, sceneKey, targetUid, patch);
    });
  };

  const atMaxLimit = items.length >= MAX_STICKERS_PER_SCENE;
  const showLiveCanvas = panelOpen && (isEnabled || items.length > 0);
  const selectedIndex = selectedItem ? items.findIndex((i) => i.uid === selectedItem.uid) : -1;

  return (
    <section
      className="sticker-editor-card"
      data-sticker-editor={sceneKey}
      aria-label={`Animated Stickers for ${sceneLabel}`}
    >
      {/* Header row with ON/OFF toggle */}
      <div className="sticker-editor-header">
        <div style={{ display: "grid", gap: "2px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fdf2f8" }}>
              ✨ Animated Stickers
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "0.7rem",
                fontWeight: 600,
                background: "rgba(167, 139, 250, 0.16)",
                color: "rgba(226, 199, 255, 0.88)",
              }}
            >
              {items.length} / {MAX_STICKERS_PER_SCENE}
            </span>
          </div>
          <span style={{ fontSize: "0.74rem", color: "rgba(226, 199, 255, 0.65)" }}>
            Float cute transparent kitties anywhere over {sceneLabel}.
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-label={`Stickers on this scene (${sceneLabel})`}
          className="sticker-editor-switch"
          onClick={handleToggleEnabled}
        >
          <span>Stickers on this scene</span>
          <span className="sticker-switch-track" aria-hidden="true">
            <span className="sticker-switch-thumb" />
          </span>
        </button>
      </div>

      {/* Retention notice when toggled OFF while items remain saved */}
      {!isEnabled && items.length > 0 && (
        <div
          role="status"
          style={{
            padding: "10px 12px",
            borderRadius: "12px",
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.32)",
            fontSize: "0.77rem",
            color: "#fde68a",
            lineHeight: 1.45,
          }}
        >
          Stickers are currently <strong>OFF</strong> on this scene — your{" "}
          <strong>{items.length}</strong> placed {items.length === 1 ? "sticker is" : "stickers are"}{" "}
          kept safe and will reappear as soon as you switch back <strong>ON</strong>.
        </div>
      )}

      {/* Scaled live scene preview + interactive StickerLayer on top */}
      {showLiveCanvas && (
        <div style={{ display: "grid", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
              fontSize: "0.73rem",
              color: "rgba(226, 199, 255, 0.72)",
            }}
          >
            <span>Live scene placement preview</span>
            {isEnabled && items.length > 0 && (
              <span>Tap a sticker to select, then drag, resize ↘ or rotate ↻</span>
            )}
          </div>

          <div className="sticker-stage-wrap" data-sticker-stage={sceneKey}>
            <SceneLivePreviewStage sceneKey={sceneKey} config={config} />
            <ConfigProvider config={config}>
              <StickerLayer
                sceneKey={sceneKey}
                editable={isEnabled}
                selectedUid={isEnabled ? selectedUid : null}
                onSelectUid={setSelectedUid}
                onCommitPlacement={handleCommitPlacement}
                onRemoveUid={handleRemove}
              />
            </ConfigProvider>
          </div>
        </div>
      )}

      {/* Selected sticker precision controls (sliders, numeric angle, flip, z-order) */}
      {isEnabled && selectedItem && selectedMeta && (
        <div
          role="group"
          aria-label={`Selected sticker controls (${selectedMeta.name})`}
          style={{
            padding: "12px",
            borderRadius: "13px",
            border: "1px solid rgba(236, 72, 153, 0.34)",
            background: "rgba(18, 7, 36, 0.72)",
            display: "grid",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <strong style={{ fontSize: "0.8rem", color: "#fde68a" }}>
              Editing: {selectedMeta.name}
            </strong>
            <span style={{ fontSize: "0.72rem", color: "rgba(226, 199, 255, 0.72)" }}>
              {Math.round(selectedItem.w * 100)}% size · {Math.round(selectedItem.rotate)}°
            </span>
          </div>

          {/* Size slider */}
          <label style={{ display: "grid", gap: "6px", fontSize: "0.76rem", color: "#e9d5ff" }}>
            <span>Size ({Math.round(selectedItem.w * 100)}%)</span>
            <input
              type="range"
              aria-label={`Size for ${sceneLabel} sticker`}
              min={5}
              max={90}
              step={1}
              value={Math.round(selectedItem.w * 100)}
              onChange={(e) => handleUpdateSelected({ w: Number(e.target.value) / 100 })}
              style={{ width: "100%", minHeight: "32px", accentColor: "#ec4899" }}
            />
          </label>

          {/* Rotation slider + numeric input fallback */}
          <div style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "0.76rem", color: "#e9d5ff" }}>
              Rotation ({Math.round(selectedItem.rotate)}°)
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 82px",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <input
                type="range"
                aria-label={`Rotation slider for ${sceneLabel} sticker`}
                min={-180}
                max={180}
                step={1}
                value={Math.round(selectedItem.rotate)}
                onChange={(e) => handleUpdateSelected({ rotate: Number(e.target.value) })}
                style={{ width: "100%", minHeight: "32px", accentColor: "#a78bfa" }}
              />
              <input
                type="number"
                aria-label={`Rotation degrees for ${sceneLabel} sticker`}
                min={-180}
                max={180}
                step={1}
                value={Math.round(selectedItem.rotate)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) handleUpdateSelected({ rotate: val });
                }}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  borderRadius: "9px",
                  border: "1px solid rgba(167, 139, 250, 0.35)",
                  background: "#120822",
                  color: "#f8f1fc",
                  fontSize: "0.8rem",
                  textAlign: "center",
                }}
              />
            </div>
          </div>

          {/* Flip & layer order buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              className="sticker-editor-btn"
              aria-label={`Flip ${selectedMeta.name} horizontally`}
              aria-pressed={Boolean(selectedItem.flipX)}
              onClick={() => handleUpdateSelected({ flipX: !selectedItem.flipX })}
            >
              ⇄ Flip
            </button>
            <button
              type="button"
              className="sticker-editor-btn"
              aria-label="Send sticker back"
              disabled={selectedIndex <= 0}
              onClick={() =>
                applyStickersChange((prev) =>
                  shiftStickerLayerOrder(prev.stickers, sceneKey, selectedItem.uid, "backward"),
                )
              }
            >
              ↓ Send back
            </button>
            <button
              type="button"
              className="sticker-editor-btn"
              aria-label="Bring sticker forward"
              disabled={selectedIndex === -1 || selectedIndex >= items.length - 1}
              onClick={() =>
                applyStickersChange((prev) =>
                  shiftStickerLayerOrder(prev.stickers, sceneKey, selectedItem.uid, "forward"),
                )
              }
            >
              ↑ Bring forward
            </button>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "0.7rem",
              color: "rgba(226, 199, 255, 0.58)",
              lineHeight: 1.4,
            }}
          >
            Keyboard shortcuts on canvas: Arrow keys move (Shift = faster) · +/- resize · [ ] rotate · Delete removes · Esc deselects.
          </p>
        </div>
      )}

      {/* Placed stickers list OR empty state CTA */}
      {items.length === 0 ? (
        <div
          style={{
            padding: "16px",
            borderRadius: "13px",
            border: "1px dashed rgba(167, 139, 250, 0.3)",
            background: "rgba(167, 139, 250, 0.05)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(226, 199, 255, 0.78)" }}>
            No animated stickers placed on {sceneLabel} yet. Add up to {MAX_STICKERS_PER_SCENE} cute kitties!
          </p>
          <button
            type="button"
            className="sticker-editor-btn sticker-editor-btn--primary"
            aria-label={`Add sticker to ${sceneLabel}`}
            onClick={() => setGalleryMode("add")}
          >
            + Add sticker
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#e9d5ff" }}>
              Placed on this scene ({items.length}/{MAX_STICKERS_PER_SCENE})
            </span>
            <button
              type="button"
              className="sticker-editor-btn sticker-editor-btn--primary"
              aria-label={`Add sticker to ${sceneLabel}`}
              disabled={atMaxLimit}
              onClick={() => setGalleryMode("add")}
            >
              + Add sticker
            </button>
          </div>

          {atMaxLimit && (
            <p
              role="status"
              style={{
                margin: 0,
                padding: "8px 10px",
                borderRadius: "10px",
                background: "rgba(236, 72, 153, 0.14)",
                border: "1px solid rgba(236, 72, 153, 0.35)",
                fontSize: "0.75rem",
                color: "#fbcfe8",
              }}
            >
              Maximum {MAX_STICKERS_PER_SCENE} stickers per scene reached. Remove or replace one to try another.
            </p>
          )}

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "8px" }}>
            {items.map((item, idx) => {
              const meta = getStickerById(item.stickerId);
              if (!meta) return null;
              const isSelected = item.uid === selectedUid;
              return (
                <li
                  key={item.uid}
                  data-placed-sticker={item.uid}
                  style={{
                    padding: "10px",
                    borderRadius: "12px",
                    border: isSelected
                      ? "1.5px solid rgba(236, 72, 153, 0.78)"
                      : "1px solid rgba(167, 139, 250, 0.22)",
                    background: isSelected
                      ? "rgba(236, 72, 153, 0.13)"
                      : "rgba(167, 139, 250, 0.06)",
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Select placed sticker ${idx + 1}: ${meta.name}`}
                    onClick={() => setSelectedUid(item.uid)}
                    style={{
                      appearance: "none",
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      minHeight: "44px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <img
                      src={meta.poster}
                      alt=""
                      aria-hidden="true"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      style={{
                        width: "40px",
                        height: "40px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "3px",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ display: "grid", gap: "2px", minWidth: 0, flex: 1 }}>
                      <strong
                        style={{
                          fontSize: "0.8rem",
                          color: isSelected ? "#fde68a" : "#f3ecff",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meta.name}
                      </strong>
                      <span style={{ fontSize: "0.7rem", color: "rgba(226, 199, 255, 0.68)" }}>
                        {Math.round(item.w * 100)}% width · {Math.round(item.rotate)}°
                        {item.flipX ? " · Flipped" : ""}
                      </span>
                    </span>
                  </button>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    <button
                      type="button"
                      className="sticker-editor-btn"
                      aria-label={`Replace sticker ${idx + 1} (${meta.name})`}
                      onClick={() => {
                        setSelectedUid(item.uid);
                        setGalleryMode("replace");
                      }}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="sticker-editor-btn"
                      aria-label={`Duplicate sticker ${idx + 1} (${meta.name})`}
                      disabled={atMaxLimit}
                      onClick={() => handleDuplicate(item.uid)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="sticker-editor-btn"
                      aria-label={`Reset sticker ${idx + 1} (${meta.name}) to default`}
                      onClick={() => handleReset(item.uid)}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="sticker-editor-btn sticker-editor-btn--danger"
                      aria-label={`Remove sticker ${idx + 1} (${meta.name})`}
                      onClick={() => handleRemove(item.uid)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Responsive gallery: bottom sheet on mobile, anchored popover on desktop */}
      <StickerGalleryPicker
        open={galleryMode !== null}
        mode={galleryMode ?? "add"}
        activeStickerIds={activeStickerIds}
        onSelectSticker={handleGalleryPick}
        onClose={() => setGalleryMode(null)}
      />
    </section>
  );
}
