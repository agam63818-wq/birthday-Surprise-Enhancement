# Experiences — Part 2 implementation report

**Date:** 2026-10-22

**Scope:** Config model and scene plumbing only. No Part 3/4 source behavior patches and no PR.

Part 1 audit and protocol details remain in [`docs/experiences.md`](./experiences.md). This part adds the three opt-in IDs `heartTunnel`, `loveConfession`, and `loveDrive` without adding them to the existing default sequence.

## Implemented

- Added the IDs to schema types, `FeatureFlags`, `SCENE_REGISTRY`, `SCENE_LAZY_LOADERS`, scene-key handling, and the shared AI/save `SCENE_IDS`/`FEATURE_IDS` contracts.
- Added thin lazy wrappers `HeartTunnelScene.tsx`, `LoveConfessionScene.tsx`, and `LoveDriveScene.tsx`. They mount the Part 1 `ExperienceFrame` only when the scene engine reaches an enabled scene and resolve their config through `useNormalizedConfig()`.
- Added optional plain-text config slices and shared resolvers in `src/lib/v2/experienceDefaults.ts`. Heart Tunnel has occasion-aware defaults; non-anniversary years/date fields default empty. Confession defaults include `noGiveInAfter: 6`; Love Drive includes the audited objective/toast/collectible/pause/final/letter labels and `{remaining}` templates.
- Added a schema-driven Customize editor for the new slices. It reads the same default resolvers as the wrappers and supports Heart letter paragraphs, Confession's bounded dodge count, and Love Drive's nested collectible text.
- Added conditional normalization: old configs do not acquire new normalized roots or enumerable feature keys. An absent new flag is treated as OFF by `isSceneEnabled`/`computeActiveSequence`; explicit `true` is required for the new experiences. Existing flags retain their old semantics.
- Preserved `DEFAULT_V2_SCENE_SEQUENCE` and the legacy v1 sequence exactly. `setSceneEnabled` adds an explicitly enabled scene and disabling leaves its order/settings intact while removing it from the active sequence.
- Added per-field AI/save validators with length caps, markup/script-shaped text rejection, safe media URLs, six-paragraph Heart letters, nested Love Drive groups/leaf paths, and integer `noGiveInAfter` validation (3–12).
- Added Love Drive sticker hard-disable in both `StickerLayer` and `SceneStickersEditor`. Heart Tunnel and Love Confession retain decorative sticker support. The overlay is `aria-hidden`, `pointer-events: none`, z-index 50; scene navigation is z-index 210, so decorative stickers cannot intercept scene/button hit targets. Saved Love Drive sticker data is ignored, not deleted.
- Expanded audio scene validation automatically through the longer shared `SCENE_IDS` list. No audio runtime behavior was changed.

## Compatibility evidence

Two snapshots were generated from the **Part 1 code before Part 2 edits**, using representative old v1 and v2 configs containing legacy text, theme, stickers, audio playback, notebook data, and extension data. They are stored at:

`artifacts/birthday-surprise/src/lib/v2/__tests__/__snapshots__/experienceConfig.test.ts.snap`

The same snapshots pass after the Part 2 changes without being regenerated. Tests also prove that v1 upgrade/promotion does not add the new IDs/flags, the default V2 sequence remains unchanged, enabling each new ID inserts it, disabling skips it, and enabling only Heart Tunnel preserves unrelated stickers/audio/theme/text.

## Automated checks

See the final check table below for the exact run results. The pre-Part-2 baseline was **10 files / 181 tests passed**, with typecheck passing. The Part 2 suite adds frozen compatibility snapshots and validator/registry/sticker coverage.

| Check | Result |
| --- | --- |
| `pnpm typecheck` | **Passed** |
| `pnpm test` | **Passed: 12 files / 222 tests** |
| `pnpm verify:stickers` | **Passed: 44 files / 22 pairs** |
| Frozen old v1/v2 normalization snapshots | **Passed without snapshot update** |
| `pnpm build` | **Passed** (Vite emitted the existing large-chunk/sourcemap warnings) |
| Full `pnpm test:browser` with dummy QA env | **29 passed / 1 failed**; the only failure is the pre-existing unrelated custom-audio `<option>` disabled assertion in `music reset, missing metadata, autosave failure and retry retain the canonical draft`. The three new opt-in wrapper tests and flags-off lazy-isolation test passed. |
| Final targeted flags-off + opt-in browser rerun | **4/4 passed** after the final ordering-helper change. |

The browser run also verifies that an explicitly enabled wrapper mounts its own iframe, reaches `ready`, and receives its custom/default config through `window.__experience.config`. The QA auth init script was made top-frame-only so it does not generate false `sessionStorage` errors inside opaque sandboxed frames; production sandboxing was not changed.

## Required deployment follow-up

`artifacts/birthday-surprise/supabase/functions/_shared/configPatch.ts` is shared with the deployed AI edge function. **REQUIRES MANUAL `supabase functions deploy`** for the deployed AI assistant to receive the new IDs, paths, and validators. No deploy was performed in this sandbox, and AI assistant support for the new paths is therefore **not claimed as live**. Browser/local validation tests pass independently of deployment.

No Supabase tables/RLS/RPCs, payment/Razorpay code, `api/`, or `middleware.js` were changed. The three original ZIP SHA-256 hashes still match the Part 1 audit (`8e529aba…`, `5d3f0b48…`, `45ccff6b…`); no vendored source or ZIP was edited in Part 2.

## Deliberate boundaries and manual limitations

- The original vendored HTML/JS/CSS behavior is not patched in Part 2. The wrappers provide config/default plumbing; source-level text binding, replay/completion behavior, reduced-motion fixes, and disposal remain Parts 3–4.
- New scenes are not in the default sequence and are OFF for old configs and all occasions until explicitly enabled.
- No Vercel preview, physical iPhone Safari, real Supabase RPC, or deployed AI check was performed. Browser tests use mocked network fixtures and the temporary Chromium QA setup.
- No new npm dependency was added. No PR was opened.
