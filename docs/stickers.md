# Animated Stickers Guide

This document explains how per-scene animated stickers are stored, validated, rendered, and extended in **Birthday Surprise**.

---

## 1. Architecture Overview

- **Assets on disk (`artifacts/birthday-surprise/public/stickers/`)**:
  - `kitty-XX.webp` — Primary animated RGBA sticker rendered via `<img decoding="async" />` across all browsers (Safari/iOS WebKit, Chrome, Firefox, Edge), preserving crisp alpha even inside `backdrop-filter` glass cards and CSS `transform` animations.
  - `kitty-XX.webm` — Companion VP9+alpha asset verified for `minAlpha=0..maxAlpha=255` via `libvpx-vp9`.
  - `posters/kitty-XX.png` — Static first-frame RGBA PNG poster rendered automatically under `prefers-reduced-motion: reduce`, for off-screen gallery tiles, and for `heavy: true` stickers (> 600 KB) until explicitly previewed.
- **Single source of truth (`artifacts/birthday-surprise/src/lib/stickers/manifest.ts`)**:
  - Every asset path (`webp`, `webm`, `poster`), display `name`, `category` (`"love" | "cute" | "celebrate" | "funny"`), `width`, `height`, `aspect`, `durationMs`, `bytes`, and `heavy` flag lives exclusively here.
  - Hardcoding `/stickers/...` asset paths anywhere else in `src/` fails CI (`manifest.test.ts`).
- **Persistence (`config.stickers`)**:
  - Stored additively inside the existing `surprises.config` JSONB column (`StickersConfig`, version `1`) and saved through the standard `CustomizeForm` save flow (`supabase.from("surprises").update({ config, photo_urls, audio_urls })`).
  - No database migrations, RLS changes, or RPC changes are required because `get_surprise_by_slug` returns the full `config` JSONB document verbatim.
  - Legacy surprises without `config.stickers` render identically to before with zero auto-saves.
- **Renderer (`src/components/stickers/StickerLayer.tsx`)**:
  - Scene-scoped overlay (`position: absolute; inset: 0; pointer-events: none; z-index: 50`) mounted in both V2 (`SceneEngine.tsx`) and V1 (`BirthdayExperience.tsx`) for the active scene only.
  - Never uses `mix-blend-mode` (which breaks inside `backdrop-filter` / stacking contexts).
  - Unknown `stickerId`s and runtime HTTP 404 / broken assets are silently skipped without broken-image icons or layout errors.

---

## 2. How to Add a New Sticker

1. **Prepare transparent animated pairs**:
   - Export both `.webp` (animated RGBA with real transparency, `>= 2` frames) and `.webm` (`vp9` + alpha plane) using a lowercase slug ID such as `kitty-23.webp` and `kitty-23.webm`.
   - Copy both files into `artifacts/birthday-surprise/public/stickers/`.

2. **Generate static first-frame posters & scaffold manifest metadata**:
   ```bash
   pnpm generate:posters
   pnpm stickers:scaffold kitty-23
   ```

3. **Register the sticker in `artifacts/birthday-surprise/src/lib/stickers/manifest.ts`**:
   - Add `"kitty-23"` to `STICKER_IDS`.
   - Paste the scaffolded object into `STICKER_MANIFEST`, give it a friendly human-readable `name`, and choose the best `category` (`"love" | "cute" | "celebrate" | "funny"`).
   - Add `"kitty-23": <webmBytes>` to `STICKER_WEBM_BYTES` (and update the expected sticker count in `src/lib/stickers/__tests__/manifest.test.ts` if expanding the catalog).

4. **Run full verification before committing**:
   ```bash
   pnpm verify:stickers
   pnpm typecheck
   pnpm test
   pnpm build
   ```
   `pnpm verify:stickers` fails loudly if any `.webp`, `.webm`, or `posters/*.png` file is missing, extension-spoofed, single-frame, zero-sized, or missing real alpha transparency (`minAlpha < 255`).
