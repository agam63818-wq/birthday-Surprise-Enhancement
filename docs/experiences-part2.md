# Part 2 integration notes — config and scene plumbing

Part 2 makes the three bundled experiences valid, explicit opt-in scene IDs without changing the default recipient flow.

## IDs and activation

- `heartTunnel`, `loveConfession`, and `loveDrive` are in `NewSceneId`, the registry, lazy loaders, scene keys, and shared `SCENE_IDS`/`FEATURE_IDS`.
- `DEFAULT_V2_SCENE_SEQUENCE` and `LEGACY_SCENE_SEQUENCE` are unchanged. New scenes never appear merely because a row is v2 or because an occasion recommends them.
- New feature keys are optional in saved/normalized feature objects. `isSceneEnabled` requires explicit `true` for these three IDs; legacy flags keep their previous absent-means-enabled behavior. This is why old normalized v1/v2 snapshots remain byte-identical.
- `setSceneEnabled` is the pure ordering/flag operation used by Customize. Enabling inserts an absent ID; disabling preserves the saved sequence and config but removes it from `computeActiveSequence`.

## Config/defaults

`src/lib/v2/experienceDefaults.ts` is the single defaults/resolution source used by both `ExperienceSceneEditor` and the three lazy wrappers. `schema.ts` contains the optional plain-text slices; `config.ts` exposes the same optional slices for type interoperability with older records.

Heart Tunnel has occasion-specific copy, with empty years/date defaults outside anniversary. Confession has the bounded `noGiveInAfter` setting (3–12, default 6). Love Drive includes the audited dynamic objective and toast templates, collectible labels/toasts, pause/final/letter labels, and `{remaining}` placeholders. Heart letter bodies are arrays of at most six paragraphs.

Normalization resolves a new root only when its slice, scene ID, or feature flag is explicit. It does not add new roots to unrelated old rows. Invalid saved values resolve to safe defaults; save/AI boundaries reject them instead of silently accepting them.

## Validation and deployment

`supabase/functions/_shared/configPatch.ts` now validates the new roots and nested paths with per-field limits, plain-text checks, safe media URLs, bounded arrays, and integer ranges. The longer scene list also feeds audio playback validation and the scene-array maximum.

**REQUIRES MANUAL `supabase functions deploy`** after this shared edge-function change. The local code and tests are complete, but deployed AI assistant support for these new paths is not claimed until that deployment happens.

## Stickers and layering

Love Drive is a full-surface interactive game: its sticker editor returns nothing and `StickerLayer` returns nothing even if stale saved sticker data exists. Heart Tunnel and Love Confession allow the existing decorative sticker layer.

For the two allowed experiences, stickers remain `aria-hidden` and `pointer-events: none`; the layer is z-index 50 while scene navigation is z-index 210. Thus decorative stickers cannot intercept source or navigation button hit targets, and host navigation stays above the decoration. Love Drive has no such overlay at all. No saved sticker bucket is deleted as part of this guard.

## Deferred source work

The vendored original source behavior is intentionally unchanged in Part 2. Text binding inside the frames, source completion/replay signals, reduced-motion fixes, and resource disposal are Parts 3–4. No scene is enabled by default and no PR is opened by this part.
