# Experiences — Part 3 implementation report

**Date:** 2026-10-22

**Scope:** Heart Tunnel and Love Confession source patches, config/theme binding, lifecycle, accessibility, and frame events only. Love Drive/Part 4 and Part 5 host UI were not started. No PR was opened.

## Implemented

### Host, config, and theme

- Both existing opt-in wrappers still resolve their validated Part 2 config slices and occasion/sender-aware defaults. They now derive the four closed protocol theme tokens from the active preset through `src/lib/experiences/theme.ts`, with `midnightPurple` and per-token color fallbacks.
- `isActive`, reduced-motion, and global mute continue through `ExperienceFrame`; the frame's existing init/update/pause/resume/replay protocol is now consumed by both source controllers. Replay is scene-local and emits `replayed` without navigating.
- `ExperienceFrame` accepts an optional scene-owned recovery Continue label. Its shared `EMPTY_CONFIG`/`EMPTY_THEME` defaults are unchanged, and `advanceOnComplete` remains **false** by default.
- Canvas drawing function signatures and signature color sequences were not changed. Theme tokens affect surrounding background/controls/fallbacks rather than replacing the original canvas identity.

### Heart Tunnel

- Every Part 2 Heart field is bound: start/cinematic/reveal copy, couple/photo/caption/subtitle, optional years and date, quote, letter button/title/paragraph array/highlight/signature, and Continue/Replay labels.
- Text is rendered with `textContent` or created text nodes. Newline titles/quotes use text nodes and explicit `<br>` elements; letter paragraphs and highlights are created as safe DOM nodes. No `innerHTML` renderer remains.
- The hardcoded Unsplash photo, URL-query customization, local file upload/FileReader, clipboard/share, and dead edit/replay references were removed. A configured safe photo URL still works; missing/failed photos show the bundled SVG heart and retain meaningful alt/caption text.
- The original tunnel → light/heart → reveal sequence remains. Reduced motion skips the tunnel after a short tracked delay, removes shake/flash/CSS motion, immediately reveals content, and renders ambient particles/petals statically.
- Tunnel, ambient, and petals share one owned rAF with clamped delta time. Reveal timers and listeners are tracked; pause/hidden states stop work and resume without a time jump. Replay/teardown cancels pending work.
- Audio is synthesized only through one lazy WebAudio context unlocked by a user gesture. Mute, pause/resume, oscillator cleanup, and close-on-teardown are handled; no background-music system was added.
- Reveal emits `complete` once per play. Continue emits `next` once per frame mount; Replay resets only this frame and emits `replayed`. Neither `complete` nor Replay implicitly advances the host.
- The letter has dialog semantics, an accessible close button, Escape/backdrop close, Tab containment, and focus restoration. Configured Continue is also available in recoverable error UI.

### Love Confession

- All Part 2 Confession fields are bound, including question/Yes/No/reaction, both climax lines, envelope/letter/signature/close labels, Continue/Replay, and `noGiveInAfter`.
- No stays within the iframe container, avoids the question and Yes, has bounded retry attempts, and returns to normal layout if no safe position exists. After the configured dodge count it can be clicked normally and shows the configured reaction. Yes grows on dodges with a capped scale.
- Keyboard activation does not teleport No; focusing an escaped No returns it to the flow. Reduced motion disables dodging. There is no `touchstart` cancellation or harmful touch prevention.
- The word-rain, assembly, rotating/beating 3D heart, envelope, and letter climax remain. The envelope is now a native keyboard-accessible button.
- Letter typing appends text nodes instead of reparsing HTML. Close/replay/reduced-motion/teardown clear typing timers; reduced motion renders the complete letter and signature immediately. Signature copy comes from config.
- The main canvas has one owned clamped-delta rAF. GSAP tweens/timelines are tracked, paused, killed, and reset; completed tweens leave the tracking set. Confetti uses one reusable local no-worker instance with an owned emitter, pause/reset, and replay/teardown cleanup.
- Audio follows the same lazy one-context gesture/mute/pause/teardown model as Heart Tunnel. No separate music track was introduced.
- Reaching the 3D finale emits `complete` once per play; Continue and Replay follow the same one-shot/local-reset semantics as Heart Tunnel. The letter dialog supports Escape, Tab containment, backdrop close, and focus restoration.

### Responsive and fallback behavior

- Both documents use container-relative absolute/100% layout rather than `window.innerWidth/innerHeight` or fixed viewport positioning. Dynamic viewport, safe-area padding, narrow container queries, long-copy wrapping, scrollable dialogs/reveal content, and responsive action rows were added.
- Both have friendly renderer failure fallback plus the existing host ready/runtime error boundary and a usable Continue path. A failed Heart photo is non-fatal and uses the built-in heart illustration.
- Real buttons, visible focus indicators, dialog labels, inert hidden regions, and aria-live status/reaction nodes are included.

## Protocol behavior

| Source event | Frame message | Host navigation |
| --- | --- | --- |
| Heart reveal / Confession 3D finale | `complete` once per play | Notification only; no implicit advancement |
| Configured Continue or recovery Continue | `next` guarded once | Existing host `advanceOnce` handles navigation |
| Current-scene Replay | `replayed` after local reset | None |
| Unrecoverable renderer/source failure | `error(code, message)` | Host shows Retry/configured Continue |

## Vendored edit inventory

The complete per-file source edit log is appended to [`docs/experiences.md`](./experiences.md#part-3-vendored-source-patch-log). Six vendored experience source files changed:

- `heart-tunnel/{index.html,script.js,style.css}`
- `love-confession/{index.html,script.js,style.css}`

`love-confession/tailwind.css`, both vendor library files, Love Drive, and all three original ZIPs were not edited. No new npm dependency or runtime script CDN was added; the existing optional Google Fonts stylesheets remain non-blocking with system fallbacks.

## Checks actually run for Part 3

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | **Passed** |
| `node --check` on both rewritten experience scripts | **Passed** after the final edits |
| Static HTML/JS reference audit | **Passed:** Heart 41 unique IDs / 39 JS ID references / 2 local scripts; Confession 29 unique IDs / 28 JS ID references / 4 local scripts. No duplicate IDs, missing referenced IDs, missing local scripts, or remote script URLs. |
| Unsafe source scan | **Passed:** no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `URLSearchParams`, `FileReader`, or Unsplash reference in either experience HTML/controller. |
| `git -c core.whitespace=cr-at-eol diff --check` | **Passed** (the vendored Heart stylesheet retains its original CRLF convention). |
| Original ZIP SHA-256 audit | **Unchanged:** Heart `8e529abae0666b9321c3d52cf461304c6bec6dd26b75cd5c49bb4d4c8c3cf721`; Confession `5d3f0b485a8f56d63088b599980d604bddd1d4b2b52a38db4af664c098a4258c`; Drive `45ccff6b24b662e6893b53d6c6596b2ac72a12402db9c07b42a8278a783a7ff4`. |

## Deferred verification and limitations

Per the instruction to leave remaining testing until all parts are complete, this part did **not** run the full unit suite, production build, browser suite, or new interactive browser/device QA. Part 1/2 results are not reused as Part 3 results.

Accordingly, actual 320px horizontal-overflow measurement, visual climax comparison, keyboard/focus walkthrough, touch/dodge behavior, reduced-motion rendering, pause/replay/resource counters, audible WebAudio output, and physical iPhone Safari behavior remain to be verified in the final QA pass. No real Supabase, Vercel, deployment, or physical-device verification is claimed.

No Supabase tables/RLS/RPCs, payment/Razorpay code, `api/`, `middleware.js`, or Love Drive source was changed. The previously documented manual `supabase functions deploy` requirement from Part 2 remains separate; nothing was deployed in Part 3.
