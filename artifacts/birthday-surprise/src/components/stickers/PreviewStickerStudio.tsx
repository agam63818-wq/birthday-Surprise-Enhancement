import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import StickerGalleryPicker from "@/components/stickers/StickerGalleryPicker";
import { StickerEditContext, type StickerEditSession } from "@/components/stickers/StickerEditContext";
import type { StickerTransformValues } from "@/lib/stickers/editorMath";
import { clampInFrame } from "@/lib/stickers/frame";
import { getStickerById } from "@/lib/stickers/manifest";
import {
  addStickerPlacement,
  areStickersSupported,
  DEFAULT_STICKER_WIDTH,
  MAX_STICKERS_PER_SCENE,
  removeStickerPlacement,
  resolveHeroSceneKey,
  updateStickerPlacement,
} from "@/lib/stickers/model";
import { nanoid } from "@/lib/v2/nanoid";
import type { SceneKey, StickerPlacement, StickersConfig, SurpriseConfig } from "@/lib/v2/schema";

const HERO_KEYS = new Set<string>(["cake", "rakhiHero", "familyHero", "loveDayHero"]);
const PANEL_KEY = "preview-sticker-panel-min";

const SCENE_LABELS: Partial<Record<string, string>> = {
  landing: "Landing", intro: "Intro", cuteness: "Cuteness meter", celebration: "Celebration",
  cake: "Cake", rakhiHero: "Rakhi", familyHero: "Family", loveDayHero: "Love day",
  whyYouMatter: "Why you matter", ourStory: "Our story", memoryWall: "Memory wall",
  beforeLeave: "Before you leave", lastNote: "Last note",
};

/** The scene bucket that actually stores this scene's stickers (hero alias aware). */
export function storageSceneKey(config: SurpriseConfig, sceneKey: SceneKey): SceneKey {
  const scenes = config.stickers?.scenes ?? {};
  if (scenes[sceneKey] || !HERO_KEYS.has(sceneKey)) return sceneKey;
  const activeHero = resolveHeroSceneKey(config.occasionId ?? config.occasionType);
  if (sceneKey === "cake" && activeHero !== "cake" && scenes[activeHero]) return activeHero;
  if (sceneKey === activeHero && scenes.cake) return "cake";
  return sceneKey;
}

function sceneItems(config: SurpriseConfig, key: SceneKey): StickerPlacement[] {
  return config.stickers?.scenes[key]?.items ?? [];
}

function frameSize() {
  if (typeof window === "undefined") return { w: 390, h: 844 };
  return { w: document.documentElement.clientWidth || window.innerWidth, h: window.innerHeight };
}

export interface PreviewStickerStudioProps {
  config: SurpriseConfig;
  onChange: (updater: (prev: SurpriseConfig) => SurpriseConfig) => void;
  /** True when the draft's stickers differ from the saved stickers. */
  stickersDirty: boolean;
  saving: boolean;
  onSaveStickers: () => void;
  children: ReactNode;
}

/**
 * Owner-only Preview sticker studio. Rendered ONLY by the authenticated
 * Dashboard Preview tab — never by public share routes.
 */
export default function PreviewStickerStudio({
  config,
  onChange,
  stickersDirty,
  saving,
  onSaveStickers,
  children,
}: PreviewStickerStudioProps) {
  const [editing, setEditing] = useState(false);
  const [minimized, setMinimized] = useState<boolean>(() => {
    try { return localStorage.getItem(PANEL_KEY) === "1"; } catch { return false; }
  });
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneKey | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(PANEL_KEY, minimized ? "1" : "0"); } catch { /* ignore */ }
  }, [minimized]);

  const reportScene = useCallback((key: SceneKey) => {
    setScene((prev) => {
      if (prev !== key) setSelectedUid(null);
      return key;
    });
  }, []);

  const mutate = useCallback(
    (fn: (stickers: StickersConfig | undefined, cfg: SurpriseConfig) => StickersConfig | undefined) =>
      onChange((prev) => ({ ...prev, stickers: fn(prev.stickers, prev) })),
    [onChange],
  );

  const commitPlacement = useCallback(
    (sceneKey: SceneKey, uid: string, patch: StickerTransformValues) =>
      mutate((st, cfg) => updateStickerPlacement(st, storageSceneKey(cfg, sceneKey), uid, patch)),
    [mutate],
  );

  const removeSticker = useCallback(
    (sceneKey: SceneKey, uid: string) => {
      mutate((st, cfg) => removeStickerPlacement(st, storageSceneKey(cfg, sceneKey), uid));
      setSelectedUid((cur) => (cur === uid ? null : cur));
    },
    [mutate],
  );

  const session = useMemo<StickerEditSession>(
    () => ({ editing, selectedUid, setSelectedUid, reportScene, commitPlacement, removeSticker }),
    [editing, selectedUid, reportScene, commitPlacement, removeSticker],
  );

  const supported = !!scene && areStickersSupported(scene);
  const storeKey = scene ? storageSceneKey(config, scene) : null;
  const bucket = storeKey ? config.stickers?.scenes[storeKey] : undefined;
  const items = storeKey ? sceneItems(config, storeKey) : [];
  const enabled = !!bucket?.enabled;
  const selected = items.find((i) => i.uid === selectedUid) ?? null;
  const selectedMeta = selected ? getStickerById(selected.stickerId) : undefined;
  const atMax = items.length >= MAX_STICKERS_PER_SCENE;

  const updateSelected = (patch: Partial<StickerPlacement>) => {
    if (!selected || !storeKey || !selectedMeta) return;
    const { w, h } = frameSize();
    const geo = clampInFrame(
      { x: patch.x ?? selected.x, y: patch.y ?? selected.y, w: patch.w ?? selected.w, rotate: patch.rotate ?? selected.rotate },
      w, h, selectedMeta.aspect,
    );
    mutate((st) => updateStickerPlacement(st, storeKey, selected.uid, { ...patch, ...geo }));
  };

  const addSticker = (stickerId: string) => {
    if (!scene) return;
    const uid = nanoid();
    const spots = [{ x: 0.5, y: 0.42 }, { x: 0.26, y: 0.3 }, { x: 0.74, y: 0.3 }, { x: 0.72, y: 0.7 }, { x: 0.28, y: 0.7 }];
    const spot = spots[items.length % spots.length];
    mutate((st, cfg) => {
      const key = storageSceneKey(cfg, scene);
      const next = addStickerPlacement(st, key, { uid, stickerId, x: spot.x, y: spot.y, w: DEFAULT_STICKER_WIDTH, rotate: 0 });
      const b = next.scenes[key];
      return b ? { ...next, scenes: { ...next.scenes, [key]: { ...b, enabled: true } } } : next;
    });
    setSelectedUid(uid);
    setGalleryOpen(false);
  };

  const toggleEnabled = () => {
    if (!storeKey) return;
    mutate((st) => {
      const base: StickersConfig = st ?? { version: 1, scenes: {} };
      const b = base.scenes[storeKey];
      return { ...base, version: 1, scenes: { ...base.scenes, [storeKey]: { enabled: !b?.enabled, items: b ? [...b.items] : [] } } };
    });
  };

  const label = scene ? SCENE_LABELS[scene] ?? scene : "";

  return (
    <StickerEditContext.Provider value={session}>
      {children}

      {!editing ? (
        <button
          type="button"
          className="pss-fab"
          aria-label="Edit stickers on this page"
          onClick={() => { setEditing(true); setMinimized(false); }}
        >
          <span aria-hidden="true">✨</span> Edit stickers
          {stickersDirty && <span className="pss-dot" aria-label="unsaved sticker changes" />}
        </button>
      ) : minimized ? (
        <div className="pss-mini" role="toolbar" aria-label="Sticker editing (minimized)">
          <button type="button" onClick={() => setMinimized(false)} aria-label="Show sticker tools">
            ✨ Stickers {items.length}/{MAX_STICKERS_PER_SCENE} ▴
          </button>
          {stickersDirty && (
            <button type="button" className="pss-save" disabled={saving} onClick={onSaveStickers}>
              {saving ? "Saving…" : "Save"}
            </button>
          )}
          <button type="button" onClick={() => { setEditing(false); setSelectedUid(null); }} aria-label="Done editing stickers">✓</button>
        </div>
      ) : (
        <div className="pss-panel" role="toolbar" aria-label="Sticker editing tools">
          <div className="pss-head">
            <div className="pss-title">
              <strong>✨ Sticker mode</strong>
              <span>{supported ? `${label} · ${items.length}/${MAX_STICKERS_PER_SCENE}` : "Stickers not available on this scene"}</span>
            </div>
            <button type="button" className="pss-ghost" onClick={() => setMinimized(true)} aria-label="Minimize sticker tools">▾ Hide</button>
          </div>

          {supported && (
            <>
              <p className="pss-hint">
                {selected ? "Drag to move · ↘ resize · ↻ rotate" : items.length ? "Tap a sticker to select it" : "Add a sticker to this page"}
              </p>
              <div className="pss-row">
                <button type="button" className="pss-primary" disabled={atMax} onClick={() => setGalleryOpen(true)}>+ Add</button>
                {items.length > 0 && (
                  <button type="button" aria-pressed={enabled} onClick={toggleEnabled}>{enabled ? "👁 On" : "🚫 Off"}</button>
                )}
                {selected && selectedMeta && (
                  <>
                    <button type="button" aria-label="Smaller" onClick={() => updateSelected({ w: selected.w - 0.03 })}>−</button>
                    <button type="button" aria-label="Bigger" onClick={() => updateSelected({ w: selected.w + 0.03 })}>+</button>
                    <button type="button" aria-label="Rotate left" onClick={() => updateSelected({ rotate: selected.rotate - 15 })}>⟲</button>
                    <button type="button" aria-label="Rotate right" onClick={() => updateSelected({ rotate: selected.rotate + 15 })}>⟳</button>
                    <button type="button" aria-label="Flip" aria-pressed={!!selected.flipX} onClick={() => updateSelected({ flipX: !selected.flipX })}>⇄</button>
                    <button type="button" className="pss-danger" aria-label={`Remove ${selectedMeta.name}`} onClick={() => storeKey && scene && removeSticker(scene, selected.uid)}>🗑</button>
                  </>
                )}
              </div>
              {!enabled && items.length > 0 && <p className="pss-warn">Stickers are OFF on this scene — turn On to show them.</p>}
            </>
          )}

          <div className="pss-row pss-foot">
            <button type="button" className="pss-save" disabled={!stickersDirty || saving} onClick={onSaveStickers}>
              {saving ? "Saving…" : stickersDirty ? "💾 Save stickers" : "✓ Saved"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setSelectedUid(null); }}>Done</button>
          </div>
        </div>
      )}

      <StickerGalleryPicker
        open={galleryOpen}
        mode="add"
        activeStickerIds={new Set(items.map((i) => i.stickerId))}
        onSelectSticker={addSticker}
        onClose={() => setGalleryOpen(false)}
      />
    </StickerEditContext.Provider>
  );
}
