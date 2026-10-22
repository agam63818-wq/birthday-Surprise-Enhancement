# Experiences — Part 4 implementation report

**Date:** 2026-10-22

**Scope:** Love Drive source/config/audio/input/replay/disposal and its existing wrapper only. Part 5 Customize/AI/public-flow/release work was not started, and no PR was opened.

## Implemented

### Explicit adapter and initialization

- Removed `WebsiteAdapter` and all parent-window/global-function/audio-element/localStorage guessing. There is no `LoveDriveConfig`, `RECIPIENT_NAME`, parent `openModal`, or DOMContentLoaded auto-init path.
- The game starts only from the validated bridge `init` message. One active instance is allowed per document; duplicate init does not create another renderer or loop. Bridge update/pause/resume/replay messages drive the existing instance.
- The original Three.js r128 local vendor file, 3D world, car, road, postbox, block placement, collectibles, collision/pickup logic, and `INTRO → DRIVING → COLLECTING → RETURN_TO_DESTINATION → COMPLETED` mechanics are retained.

### Config and read-only letter

- Added in-frame defaults for all **37 Part 2 Love Drive fields**, then merged the validated host slice without mutating it. Occasion/recipient/sender-aware values continue to come from the Part 2 resolver.
- Bound mission/progress labels, all objective states, intro/hint/broken-block/collect/all-collected/delivery toasts, collectible labels, skip/pause/resume/restart labels, final title/message, letter title/prompt/body/footer, Continue/Replay, close, and touch-control accessible labels.
- `{remaining}` templates are expanded as plain text. Recipient-name fallback builds the final title as text, never markup. Empty essential control labels have accessible built-in fallbacks.
- The editable `<textarea>` and its 300-character attribute are gone. The letter is a `textContent`-rendered, scrollable, `white-space: pre-wrap` read-only node using the validator-bounded 6,000-character config field.
- The final card keeps a configured read-letter action so the letter remains reachable, while configured Continue posts host navigation directly. The letter dialog also has Continue and Replay actions.

### Completion and replay

- Reaching `COMPLETED` posts `complete` once per play; the wrapper does not enable complete-driven advancement.
- Continue posts `next` once per frame mount and disables duplicate Continue paths. The existing host `advanceOnce` remains the second guard.
- Replay resets collectibles, block/collectible meshes, car position/rotation/velocity/previous position, camera, postbox lid, guide visibility/transforms, particles, HUD/slots/objective, toast text/timers, reveal/audio timers, modals/focus, input pointers/keys, intro/completion state, and elapsed animation time. It emits `replayed` without navigating or creating a second instance.
- The per-mount `next` latch intentionally remains latched across local replay so a scene which already advanced cannot navigate twice.

### Audio, loop, and disposal

- Sound requires both host unmuted state and a user pointer/key gesture. One lazy AudioContext is owned by the game; collision/collection/reveal tones never create audio implicitly.
- User pause, window blur, document hidden, and host inactive states clear controls, pause timers, stop rAF, and suspend audio. Resume never creates a context by itself. Oscillators are tracked/stopped and the context is closed on disposal.
- The main loop has one scheduling site, clamped delta time, a duplicate-start guard, and no paused-background rAF. Pixel ratio remains capped at 1.75; particles are capped at 120, reduced to 36 with reduced motion, and reduced emission is capped further.
- Every game listener is registered through one removal helper, including pointer buttons, UI, keyboard, blur/focus, visibility, resize, visualViewport, and the named orientation handler. ResizeObserver is disconnected.
- Disposal cancels rAF/timers, releases controls/listeners/audio, collects and disposes scene and shared geometries/materials/textures/render targets with de-duplication, calls renderer `dispose()` and `forceContextLoss()`, removes the canvas, clears its dedicated container, and nulls major resource/DOM references.
- Read-only `window.__loveDriveDebug` exposes instance/loop/timer/listener and disposal counters for final QA; it has no production mutation or teleport command.

### Input, focus, motion, and host layout

- Arrow/WASD input requires an active host and focused frame. Escape/P pause and resume correctly, including from the pause dialog. Hidden/inactive/modal states do not accept driving input.
- Pointer capture supports simultaneous gas + steering and independent pointer IDs. Release/cancel/lost capture, global release fallback, pause, blur, modal open/close, replay, and disposal all clear or recompute held actions so another pointer holding the same action is not released prematurely.
- Pause, final, and letter dialogs have initial focus, Tab containment, labelled controls, and appropriate focus restoration. Escape resumes pause or closes the letter back to the final card.
- Reduced motion skips the intro orbit, lowers particles, stops decorative collectible/trail motion, and makes the completed camera static. CSS motion is also disabled.
- Renderer sizing uses its container; resize, orientation, ResizeObserver, and visualViewport paths update aspect/size/DPR. Safe-area, narrow HUD, landscape, dialog scrolling, and read-only letter panning rules were added.
- `LoveDriveScene.tsx` now passes active theme tokens and the configured recovery label. A top 60px plus safe-area gutter reserves space for the existing fixed scene navigation instead of covering the game HUD. The existing `STICKERS_DISABLED_SCENE_KEYS` still explicitly includes `loveDrive`.

## Vendored edit inventory

The per-file edit log is appended to [`docs/experiences.md`](./experiences.md#part-4-vendored-source-patch-log). Changed implementation files:

- `public/experiences/love-drive/{index.html,script.js,style.css}`
- `src/scenes/LoveDriveScene.tsx`

The local Three.js vendor build and all three original ZIPs are unchanged. No new dependency, runtime CDN script, Supabase/payment/API/middleware change, or Part 5 file was introduced.

## Checks actually run for Part 4

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | **Passed** |
| `node --check public/experiences/love-drive/script.js` | **Passed** after the final source edits |
| Static HTML/JS audit | **Passed:** 37 unique IDs, 3 present local scripts, no duplicate IDs, no missing static ID references, no editable textarea, and no remote script URL. |
| Config audit | **Passed:** all 37 Part 2 fields have defaults; recipient fallback and every originally visible config field are referenced. |
| Adapter/DOM/layout audit | **Passed:** no WebsiteAdapter/ambient config, parent/localStorage heuristics, DOMContentLoaded auto-init, unsafe HTML sink, or window inner-width/height renderer sizing. One rAF scheduling site and the pausable timer scheduler were confirmed. |
| `git -c core.whitespace=cr-at-eol diff --check` | **Passed** |
| Original ZIP SHA-256 audit | **Unchanged:** Heart `8e529abae0666b9321c3d52cf461304c6bec6dd26b75cd5c49bb4d4c8c3cf721`; Confession `5d3f0b485a8f56d63088b599980d604bddd1d4b2b52a38db4af664c098a4258c`; Drive `45ccff6b24b662e6893b53d6c6596b2ac72a12402db9c07b42a8278a783a7ff4`. |

## Deferred verification and limitations

Following the standing instruction to leave remaining testing until all parts are complete, Part 4 did **not** run the full unit suite, production build, Playwright flow, CPU-throttled run, audible audio check, physical mobile/device QA, or screenshot capture. No `docs/screenshots/part4/` result is claimed yet.

The following remain for final QA: real keyboard drive and all three collectible progression, postbox/final/Continue-once flow, three consecutive replays, gas+steer multi-touch and pointer cancellation, pause-during-hold, mute/unmute after gesture, leaving/re-entering with disposal counters and no later rAF, 360×640 and landscape host-nav placement, 390×844 touch emulation, desktop/mobile visual checks, reduced motion, and physical iPhone Safari orientation/audio behavior. Static implementation of these paths is not being reported as runtime verification.

No real Supabase, Vercel, deployment, or physical-device verification was performed. The Part 2 manual edge-function deployment requirement remains separate and unchanged.
