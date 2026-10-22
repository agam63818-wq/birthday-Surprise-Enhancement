# Experiences — Part 5 release integration and final QA report

**Date:** 2026-10-22

**Scope:** Customize/AI/public-flow verification, host release hardening, deferred Parts 3–4 runtime QA, regression coverage, and screenshots. No Part 6 work, PR, merge, deployment, payment, Supabase schema/RLS/RPC, `api/`, or `middleware.js` change.

## Release changes

### Creator, AI, and public flow

Part 2 already supplied the schema-driven fields, explicit feature flags/order, shared AI validators, and normalized public config. Part 5 did not need to widen those production contracts. New browser coverage now proves the complete path with network fixtures:

1. Edit all three experience drafts in Customize, including a disabled Drive draft.
2. Reorder scenes and review an AI patch containing Heart, Confession, Drive, full scene order, and explicit `features.loveDrive` changes.
3. Confirm neither Review nor Apply saves automatically.
4. Apply, verify the same canonical draft in Customize, then Save once.
5. Reload Preview and open the public `/s/<slug>` route; navigate Confession → Heart → Drive and back with the same saved content/theme.

The tested AI enable/reorder was explicit and reviewable. No new experience is enabled by default, and the frozen V1/default-sequence compatibility tests remain green. Deployed AI availability is **not** claimed from this mocked browser test.

### Music/control overlap fixed

Real public captures exposed a host defect not visible in static checks: the fixed global MusicToggle covered Love Drive's gas control and could cover mobile Heart actions.

All three opt-in wrappers now reserve a bottom **70px + safe-area** dock outside the iframe. The existing MusicToggle remains available in that strip and is unchanged for legacy scenes. Love Drive also keeps its top 60px + safe-area scene-navigation gutter. Browser assertions verify that the iframe ends before the music button and starts below the top navigation; all driving controls remain inside the child viewport at 360×640, 390×844, and 640×360 landscape.

### Read-only QA diagnostics and development fixture

Love Drive diagnostics now expose getter-only mission/car/input/render/DPR/particle state in addition to the existing lifecycle/disposal counters. They do not expose the mutable game/renderer and provide no teleport or mutation command. This allowed Playwright to complete the actual mission using real keyboard input.

The development-only frame fixture now supports all three experiences with production-shared config resolvers and host lifecycle/event counters. It remains excluded from production builds and does not alter scene registration or default enablement.

## New automated browser coverage

Eight new Part 5 tests passed, and the migrated original Love Drive iframe-removal spike also passed:

- **Heart Tunnel:** reduced-motion reveal, read-only letter/focus trap/Escape restoration, AudioContext running/suspended state through pause/mute/resume, three replays, complete-per-play, one-shot Continue, full-motion rAF pause/reduced-motion stop, and pagehide cleanup.
- **Love Confession:** keyboard No reaction without teleport, reduced climax/letter, focus handling, three replays, one-shot Continue, full-motion loop/confetti pause, and pagehide tween/timer/audio cleanup.
- **Love Drive:** with **4× CPU throttling**, real Arrow-key steering through all three special blocks and collectibles, postbox completion, read-only letter, modal focus, Continue once, three replays, pause-during-hold, audio mute/host pause, bounded reduced particles, and WebGL/resource disposal counters.
- **Mobile touch:** real Chromium CDP simultaneous gas+steer touches, independent release preserving the other held action, touch cancel, DPR ≤1.75 at device scale 3, and orientation resize.
- **Public/Customize/AI:** the canonical flow above, no horizontal overflow, mobile scroll to Heart actions, mobile Confession letter Close reachability, navigation/music docking, and desktop/mobile/landscape screenshots.

Disposal was measured both through live-document `pagehide` handlers/counters and, in the original spike, by physically removing the iframe and checking that later child rAF ticks stopped. AudioContext state was measured; this is not a claim of audible speaker/headphone listening.

## Final check results

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | **Passed** |
| `corepack pnpm test` | **Passed: 12 files / 222 tests** |
| `corepack pnpm build` | **Passed**; existing large-chunk and sonner sourcemap warnings remain |
| `corepack pnpm verify:stickers` | **Passed: 44 files / 22 pairs** |
| `node --check public/experiences/love-drive/script.js` | **Passed** |
| `git -c core.whitespace=cr-at-eol diff --check` | **Passed** |
| Full Chromium `corepack pnpm test:browser` with dummy QA env | **37 passed / 1 failed out of 38**. All eight new Part 5 tests and the migrated frame spike passed. |
| Original ZIP SHA-256 | **Unchanged:** Heart `8e529abae0666b9321c3d52cf461304c6bec6dd26b75cd5c49bb4d4c8c3cf721`; Confession `5d3f0b485a8f56d63088b599980d604bddd1d4b2b52a38db4af664c098a4258c`; Drive `45ccff6b24b662e6893b53d6c6596b2ac72a12402db9c07b42a8278a783a7ff4`. |

### Preserved unrelated browser failure

The sole full-suite failure is the same pre-existing assertion documented in Parts 1–2:

`tests/browser/experience.spec.ts:362` — `music reset, missing metadata, autosave failure and retry retain the canonical draft`; the custom-segment `<option>` is expected disabled but Playwright reports enabled. The failure snapshot contains an `<option disabled>` element, so the enabled-state/assertion mismatch still needs separate investigation. It is unrelated to the bundled experiences and was **not hidden, skipped, or silently fixed**. The other 37 browser tests passed.

Test-generated changes to pre-existing Part 3/4 sticker screenshots were restored; only the new Part 5 capture set is included.

## Screenshot index

Captures are from the successful mocked public-flow tests in headless Chromium. The QA image has no system color-emoji font, so some emoji appear as missing-glyph boxes; this is a capture-environment limitation, not a claim about native device emoji rendering.

| Experience | Captures |
| --- | --- |
| Heart Tunnel | [Desktop reveal](./screenshots/part5/heart-tunnel-1280.png) · [Mobile reveal](./screenshots/part5/heart-tunnel-390.png) · [Mobile scrolled actions/music dock](./screenshots/part5/heart-tunnel-actions-390.png) |
| Love Confession | [Desktop climax](./screenshots/part5/love-confession-1280.png) · [Mobile question](./screenshots/part5/love-confession-390.png) · [Mobile letter](./screenshots/part5/love-confession-letter-390.png) |
| Love Drive | [Desktop](./screenshots/part5/love-drive-1280.png) · [360×640](./screenshots/part5/love-drive-360.png) · [390×844 public flow](./screenshots/part5/love-drive-390.png) · [390×844 controls](./screenshots/part5/love-drive-390-controls.png) · [640×360 landscape](./screenshots/part5/love-drive-landscape.png) |

## Remaining non-automated/manual boundaries

- No real Supabase, Vercel, payment, or deployment verification occurred; all creator/public/AI network traffic was mocked with `qa.invalid` fixtures.
- The Part 2 shared `supabase/functions/_shared/configPatch.ts` change still **REQUIRES MANUAL `supabase functions deploy`**. Part 5 made no function change and does not claim deployed AI support.
- No physical iPhone Safari, Android device, screen-reader session, speaker/headphone audio assessment, or real notched-safe-area measurement was performed. Chromium touch/mobile emulation and computed layout checks are not substitutes for those manual checks.
- No PR was opened and nothing was merged to `main`.
