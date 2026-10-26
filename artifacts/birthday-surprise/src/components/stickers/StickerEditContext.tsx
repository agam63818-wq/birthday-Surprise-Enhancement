import { createContext, useContext } from "react";
import type { StickerTransformValues } from "@/lib/stickers/editorMath";
import type { SceneKey } from "@/lib/v2/schema";

/**
 * Owner-only in-Preview sticker editing session.
 *
 * Provided ONLY by the authenticated Dashboard Preview (structural, never
 * derived from URL/storage). Public share pages never render the provider, so
 * `useStickerEditSession()` returns null there and StickerLayer stays a
 * pointer-events:none decorative layer.
 */
export interface StickerEditSession {
  editing: boolean;
  selectedUid: string | null;
  setSelectedUid: (uid: string | null) => void;
  /** StickerLayer reports which scene is currently on screen. */
  reportScene: (sceneKey: SceneKey) => void;
  commitPlacement: (sceneKey: SceneKey, uid: string, patch: StickerTransformValues) => void;
  removeSticker: (sceneKey: SceneKey, uid: string) => void;
}

export const StickerEditContext = createContext<StickerEditSession | null>(null);

export function useStickerEditSession(): StickerEditSession | null {
  return useContext(StickerEditContext);
}
