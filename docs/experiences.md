# Bundled experiences — Part 1 audit and isolation infrastructure

**Scope:** Part 1 only (audit, vendored assets, protocol, `ExperienceFrame`, bridge, and tests). Scene IDs, config slices, scene registration, Customize UI, AI allowlists, and public-flow wiring are intentionally **not** changed in this part.

The three original ZIPs remain at the repository root and were extracted only into a temporary audit directory. Line numbers in the audit below refer to the **original files inside those ZIPs**, not to the patched copies.

## Baseline (run before editing)

| Command | Result |
| --- | --- |
| `pnpm install` | Initially unavailable because the sandbox had no `pnpm` shim. `corepack pnpm install` then completed successfully with pnpm 10.26.1; lockfile was already up to date. |
| `pnpm typecheck` | **Passed** before edits. |
| `pnpm test` | **Passed:** 8 files, 167 tests before edits. |
| `pnpm build` | The first invocation exposed the same missing nested `pnpm` shim. After `corepack enable pnpm`, the unchanged baseline build **passed**. Vite emitted its existing large-chunk and sonner-sourcemap warnings. |

No baseline failure was hidden or silently fixed. The shim was an environment setup step, not a repository code change.

## Source inventory and integrity

| Experience / original ZIP | Original files (lines; bytes) | Bundled destination |
| --- | --- | --- |
| Heart Tunnel — `Cinematic_3D_Heart_Tunnel.zip` | `index.html` (154; 6,706), `script.js` (637; 21,589), `style.css` (817; 20,212) | `artifacts/birthday-surprise/public/experiences/heart-tunnel/` |
| Love Confession — `Interactive_Love_Confession.zip` | `index.html` (84; 6,029), `script.js` (661; 21,711), `style.css` (79; 1,513) | `artifacts/birthday-surprise/public/experiences/love-confession/` |
| Love Drive — `Love_Drive.zip` | `index.html` (111; 5,412), `script.js` (1,160; 44,306), `style.css` (414; 7,670) | `artifacts/birthday-surprise/public/experiences/love-drive/` |

Total original source: **4,117 lines** across the nine HTML/JS/CSS files. Original ZIP SHA-256 values recorded before vendoring:

```text
8e529abae0666b9321c3d52cf461304c6bec6dd26b75cd5c49bb4d4c8c3cf721  Cinematic_3D_Heart_Tunnel.zip
5d3f0b485a8f56d63088b599980d604bddd1d4b2b52a38db4af664c098a4258c  Interactive_Love_Confession.zip
45ccff6b24b662e6893b53d6c6596b2ac72a12402db9c07b42a8278a783a7ff4  Love_Drive.zip
```

The audit found **25 Heart Tunnel IDs, 16 Confession IDs, and 30 Love Drive IDs**, with no exact ID duplicated between the three HTML documents. That does not make native injection safe: generic selectors and globals still collide with the host, and future host markup could reuse any of these IDs.

## External dependencies and vendoring result

| Experience | External dependencies verified in original | Part 1 result |
| --- | --- | --- |
| Heart Tunnel | Google Fonts CSS/font files (`index.html:9–13`); hardcoded Unsplash photo (`index.html:72–74`); Canvas2D and WebAudio, no JS library. | Google Fonts links remain as progressive enhancement with the existing system fallbacks; the stylesheet uses the print-to-all onload pattern so a failed font request cannot hold up first render. The Unsplash photo is deliberately still present in Part 1 to avoid changing source behaviour early; Part 3 must replace it with config/built-in illustration and an error fallback. No runtime script CDN. |
| Love Confession | Runtime Tailwind JIT and global `tailwind.config` (`index.html:8–20`); GSAP 3.12.2 CDN (`:81`); canvas-confetti 1.6.0 CDN (`:82`); Pixabay MP3 (`:77–79`); Google Fonts (`:7`). | Tailwind CDN/config replaced by scoped, static `tailwind.css`. GSAP **3.12.2 minified** is local. canvas-confetti is local from the repo's installed **1.9.4** `dist/confetti.browser.js` (the originally referenced 1.6.0 was not installed). Pixabay audio element and its two script references were removed; no replacement background track was added. Google Fonts remains optional and uses the same non-blocking print-to-all pattern. |
| Love Drive | Three.js r128 CDN (`index.html:8–9`); WebGL and WebAudio. | Exact npm `three@0.128.0` `build/three.min.js` and license are local. No runtime script CDN. |

All three viewport metas had `maximum-scale=1.0, user-scalable=no`; those restrictions were removed for accessibility. No new npm dependency or package manifest change was needed. The vendored library files also retain their license/readme notices.

## Heart Tunnel audit

### User-visible hardcoded strings (exact source inventory)

The following is the complete user-facing text inventory found in the original HTML/JS, including text which is currently dead because its button is absent. Decorative-only glyphs are listed separately.

| Original location | Exact string(s) |
| --- | --- |
| `index.html:7–8` | `Happy Anniversary 💕`; `A cinematic 3D heart tunnel anniversary reveal experience.` |
| `index.html:24–31` | `OUR`; `ANNIVERSARY`; `A Special Surprise For You`; `Tap To Open Surprise`; `🔊 Turn on sound for best experience` |
| `index.html:40–41` | `✦ OUR JOURNEY ✦`; `Our Love Story` |
| `index.html:58–60` | `Happy<br>Anniversary`; `Anu & Sam` |
| `index.html:72–79` | Unsplash URL `https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop`; alt `Our Moment`; `📷 Tap to change photo`; `Forever My Favorite Person 💕` |
| `index.html:94–105` | `To Us & Our Beautiful Journey`; `5`; `Years of Love`; `"Every love story is beautiful,<br>but ours is my favorite."`; `~ November 2, 2025 ~` |
| `index.html:110` | `Open My Love Letter` |
| `index.html:128–144` | `×`; `My Dearest Love,`; `Happy Anniversary to the person who fills my heart with endless joy, laughter, and warmth every single day.`; `From the moment we first met, every day with you has been a beautiful adventure. You are my best friend, my calm in the storm, and my favorite part of every memory.`; `Thank you for all the sweet moments, the late-night talks, the unconditional love, and for building this wonderful life together.`; `Here’s to us, to our forever, and to a million more memories together! 🥂💖`; `Forever & Always Yours,`; `With All My Heart 💕` |
| `index.html:150` | `Link Copied to Clipboard! 💖` |
| `script.js:577` | `Photo updated! 📷💖` |
| `script.js:618–621` | `Link Copied! Share with your partner 💖`; `Shareable URL Ready! 🔗` |

Decorative/aria-adjacent glyphs also occur at `index.html:22,55,64,87–90,110,115,129,131` (`💖`, `✦`, `·`, `✧`, `◆`, `♥`, `❤`, `💌`, `❖ ─── ✦ ─── ❖`). They should remain decorative unless a later config design explicitly gives them meaning.

### Global CSS, layout, and collision risks

- `style.css:3–10` is a global `*` reset, including global `user-select: none`; `:12–19` globally sets `html, body`, `overflow: hidden`, and `touch-action: none`.
- Viewport/fixed layout is used at `:22–29` (`fixed`, `100vw`, `100vh`), `:32–42`, `:158–168`, `:204–218`, `:248–253`, `:667–678`, and `:786–799`. Other viewport sizing occurs at `:53` (`92vw`) and throughout the responsive rules. This is not container-safe if mounted in a host scene.
- Generic IDs/classes such as `#start-overlay`, `#reveal`, `#letter-modal`, `#toast-msg`, `.glow-btn`, and `.letter-card` can collide with host CSS or future scenes. The iframe prevents these rules from reaching the host.
- The original uses hardcoded anniversary content (`index.html:58,60,97–105`) and an external photo rather than host config.
- The letter overlay has no dialog role/label, focus trap, Escape handling, or focus restoration (`index.html:126–147`, `script.js:544–563`). The close control is a glyph-only button without an accessible label (`:128`).

### Loops, listeners, timers, and audio which do not reliably stop

- `script.js:44–50` installs a permanent window resize listener and sizes from `window.innerWidth/innerHeight`.
- The tunnel loop at `:177–364` schedules the next rAF at `:179` **before** the apparent stop condition at `:184`; consequently even the post-reveal branch continues scheduling callbacks. It is started at `:539` and can be started again by the dead replay path at `:609`, with no cancellation ID or duplicate-start guard.
- Reveal stagger timeouts (`:375–378`) are not stored or cancelled. `triggerReveal()` starts two more loops at `:380–381`.
- Ambient particles (`:385–436`) have an uncancellable rAF loop (`:411–435`). `resizeAC()` is called once (`:393`) but is never registered for later resizes.
- Petals (`:439–516`) have another uncancellable rAF loop (`:496–515`) and a resize listener (`:448`) with no removal.
- AudioContext creation/resume and oscillator scheduling are at `:63–120`; there is no `suspend()`/`close()` or host mute contract. The toast timeout at `:630–632` is not tracked. UI listeners at `:531–624` have no teardown.
- `dt = 0.028` is fixed per frame at `:238`, so movement is refresh-rate dependent (for example, faster at 120 Hz than at 60 Hz).

### Security and data-flow findings

- **Confirmed URL-to-DOM XSS sink:** `loadFromUrl()` reads query parameters at `:519–520`, then writes `title` and `quote` using `innerHTML` at `:522` and `:526`. The `.replace('\n', '<br>')` operation does not sanitize markup. `couple`, `years`, `yearsUnit`, and `date` use safer `textContent`, while `photo` is assigned directly to `img.src` at `:527` without an allowlist.
- The file-upload path (`:566–581`) reads arbitrary local files into the image and has no lifecycle cancellation. The photo overlay is a `div`, not a keyboard-accessible button (`index.html:75`).
- No global error/fallback path handles a missing 2D context, failed photo, audio rejection, or clipboard rejection.
- The source has no `postMessage` protocol and no host completion contract.

### Completion/replay signals missing

There is no Continue button, `next`, or `complete` signal. `replay-btn`, `edit-btn`, `share-btn`, `edit-modal`, `modal-close-btn`, and `save-custom-btn` are queried at `script.js:32–37` but are absent from the original HTML; the replay handler at `:597–610` is therefore dead in the shipped page. The only working modal action is close. Part 3 must add explicit completion/replay behaviour and remove the dead editor/share/upload paths.

## Love Confession audit

### User-visible hardcoded strings (exact source inventory)

| Original location | Exact string(s) |
| --- | --- |
| `index.html:6` | `Do You Love Me? ❤️` |
| `index.html:31–40` | `🥺`; `Do you love me?`; `Yes`; `No` |
| `index.html:47–58` | `I Love You`; `forever & always`; `Open Secret Letter` |
| `index.html:64–73` | `❤️`; `For You 💌`; `Forever Yours,`; `Anurag`; `Close Letter` |
| `script.js:46–49` | Canvas word list: `I love you`, `i love you`, `❤`, `love`, `te amo`, `je t'aime`, `forever`, `always`, `you`, `me & you`, `love you`, `sweetheart` |
| `script.js:51` | `You make my world brighter just by being in it. Every smile you share, every laugh we have, and every tiny moment with you is something I treasure. I am so incredibly lucky to have you in my life. ❤️` |

There is no existing Continue, Replay, or No-button reaction copy. The signature `Anurag` is hardcoded at `index.html:70`; the letter body is the constant at `script.js:51`, not host data.

### Global CSS, layout, and collision risks

- `style.css:1–5` is another global `*` reset. `.hidden-state` at `:7–11` globally applies `display/opacity/pointer-events: … !important` and could affect unrelated host elements with the same class.
- The original Tailwind CDN can inject preflight/utilities into the host and executes a global `tailwind` configuration (`index.html:8–20`). Part 1 removes that runtime dependency; the replacement is scoped to `#confession-root`.
- `position: fixed` is used for the No button at `script.js:63–67` and the letter overlay through `index.html:61`; No uses viewport bounds at `:71–89`. Canvas sizing uses `window.innerWidth/innerHeight` at `:21–41`, and particle positions use `vw/vh` at `:271–272` and `:285–286`.
- IDs including `c`, `particles`, `yesBtn`, `noBtn`, `closeBtn`, and `bgMusic` are generic. The No button is promoted to `z-index: 999` (`script.js:67`) and can cover unrelated UI.
- The envelope is a clickable `div` (`index.html:53`) rather than a keyboard-accessible button. The letter overlay has no dialog semantics, Escape handling, focus trap, or focus restoration (`:61–75`). No's `touchstart` calls `preventDefault()` (`script.js:100–103`), so touch users cannot activate it normally.

### Loops, listeners, timers, and audio which do not reliably stop

- The resize listener at `script.js:40` is never removed. The main canvas loop starts at `:129` and recursively schedules at `:514–660`; `canvasActive` is set true at `:127` and is never set false.
- Forty ambient particle GSAP tweens are created at `:262–289` with `repeat: -1` (`:282`). Other GSAP tweens/timelines (`:91–96`, `:111–120`, `:131–143`, `:147–174`, `:195–200`, `:210–227`) are not killed on teardown or replay.
- Each letter opening creates a new confetti instance at `:231–235`; its own rAF emitter at `:240–259` is not stored or cancelled, and `.reset()` is never called. `useWorker: true` adds another resource to clean up.
- The typewriter timeout is scheduled at `:188–203` and cleared only by Close (`:206–208`), not on iframe teardown/replay. `innerHTML` is also reparsed for every character.
- The original looping audio element is `index.html:77–79`, started at `script.js:105–107`, with no host mute/pause integration. Part 1 removes only that separate track and its references, as requested; synthesized audio is a later-part task.
- Yes, No, envelope, close, and resize listeners have no teardown. Repeated Yes/envelope activation is not comprehensively guarded against duplicate tweens/loops.

### Security and data-flow findings

- `letterTextElement.innerHTML += secretMessage.charAt(i)` at `script.js:190` is an unsafe HTML sink and causes repeated DOM parsing. In the original ZIP `secretMessage` is a hardcoded constant (`:51`), so this is **not currently an externally controlled URL-to-XSS path**; it becomes an XSS risk as soon as config/user text is wired to it. The clear at `:181` is a static empty-string write.
- Runtime third-party scripts and the audio hotlink create supply-chain/privacy/reliability risks; local vendoring removes those script/audio requests. Google Fonts is still optional and non-blocking by design.
- No global error/fallback path handles missing GSAP/confetti/canvas contexts. No host `postMessage` contract exists.

### Completion/replay signals missing

The only flow is Yes → climax → envelope → letter → Close (`script.js:105–229`). There is no `next`, `complete`, Continue, Replay, or `replayed` signal, and no host pause/resume/reduced-motion/mute contract.

## Love Drive audit

### User-visible hardcoded strings (exact source inventory)

| Original location | Exact string(s) |
| --- | --- |
| `index.html:6` | `Love Drive - Birthday Surprise` |
| `index.html:22–44` | `MISSION`; `Find the 3 Hidden Surprises`; `Mission Collectibles Progress`; `Love Letter`; `Birthday Gift`; `Golden Heart`; `0/3`; `Pause Game`; `Skip Intro ➔` |
| `index.html:49–54` | `Steer Left`; `Steer Right`; `Brake or Reverse`; `Accelerate` |
| `index.html:62–79` | `Game Paused`; `Take a breath on the magical road.`; `Resume Drive`; `Restart Mission 🔄`; `Happy Birthday! ✨`; `You crashed through every obstacle and found all three hidden surprises! Ready for your special birthday message?`; `Back to Surprise 💌`; `Replay Mission 🔄` |
| `index.html:87–103` | `Close message`; `HAPPY BIRTHDAY & I LOVE YOU`; `Your Special Birthday Surprise Message:`; placeholder `Write something sweet...`; textarea body `To my favorite person, every road is better with you by my side. You make my heart race more than any engine ever could. Wishing you the happiest birthday filled with love and magic! 💖🎂✨`; `Screenshot & cherish this special moment 💌`; `Keep Driving / Replay 💖` |
| `script.js:281–285` | Dynamic templates `Happy Birthday, ${this.recipientName}! ✨` and `this.customMessage` (assigned with safe `textContent`) |
| `script.js:301–317` | `${count}/${this.totalRequired}`; `Mission Complete! Happy Birthday! 🎉`; `Crash glowing gold blocks & find 3 Hidden Surprises`; `Keep exploring! ${3 - count} surprise(s) left to collect`; `All 3 found! Follow the Golden Hearts to the Postbox 📮` |
| `script.js:514–516` | `💌 Love Letter Collected!`; `🎁 Birthday Gift Collected!`; `💛 Golden Heart Collected!` |
| `script.js:709` | `✨ Secret Block Broken! Drive into the Surprise ahead!` |
| `script.js:733` | Dynamic `${c.label} (${this.collectedItems.size}/${this.totalRequired})` |
| `script.js:742` | `💖 All 3 Surprises Found! Deliver them to the Postbox ahead!` |
| `script.js:764–766` | Dynamic `📮 Postbox Locked! Collect ${remaining} more hidden surprise(s) along the road first!` |
| `script.js:792–803` | `Skip Intro ➔`; `✨ Welcome to Love Drive! Find the 3 Hidden Surprises ✨`; `Steer & crash through glowing gold blocks! 🚗💨` |
| `script.js:838` | `Skip Reveal ➔` |

The collectible emoji and modal heart rows are decorative (`index.html:28–30,36,49–54,74,87,90,94`). The editable textarea has `maxlength="300"` (`index.html:99`), which is a source behaviour limitation to address in Part 4, not a config validator.

### Global CSS, layout, and collision risks

- Most component rules are intentionally prefixed `.ld-wrapper` (`style.css:2–7`), but `body, html` is still global at `:9–17`, setting overflow, background, and overscroll behaviour.
- `.ld-wrapper` uses `100vh`/`100dvh` and `touch-action: none` at `:19–31`; controls also disable touch action at `:205–220`. The media query at `:392–414` is viewport-based, not host-container-based.
- The `ld-` prefix reduces collisions, but `love-modal`, `close-modal`, `love-message`, and `save-modal-btn` are unprefixed IDs (`index.html:85–103`), and `#love-message` has a global-by-ID rule at `style.css:363–377`.
- Control styles set `outline: none` at `style.css:133–145` without a replacement focus-visible style. Dialog roles exist (`index.html:60,72,85`), but focus trapping/restoration and keyboard-safe modal behaviour are incomplete.

### Loops, listeners, timers, audio, and disposal findings

- `LoveDriveGame` is a 1,160-line class/IIFE with the expected `INTRO → DRIVING → COLLECTING → RETURN_TO_DESTINATION → COMPLETED` states (`script.js:9–15`). It auto-initializes on `DOMContentLoaded` at `:1157–1159`.
- The main rAF starts at `:888–892` and schedules the next frame at `:899` before checking `isPaused` at `:904`; pause therefore skips simulation/rendering but does **not** stop rAF. Disposal cancels only the current ID at `:1129–1135`.
- Timeout tracking exists at `:170–190`, but the orientation callback at `:1126` uses an anonymous listener and an untracked native `setTimeout`. The toast timer at `:294–296` is separately managed and must be checked during replay/teardown.
- AudioContext creation/resume is at `:195–209`; tones and delayed sound effects are at `:211–258`. There is no owned `suspend()`/`close()` lifecycle, no guaranteed first-gesture gate at the adapter boundary, and no host mute update message.
- The listener inventory is large (`:997–1127`). `dispose()` removes keyboard, blur, visibility, global pointer, and resize listeners (`:1136–1142`), but not the anonymous per-button touch/UI listeners (`:1031–1113`) or the anonymous `orientationchange` listener (`:1126`).
- Disposal ends with only `this.renderer?.dispose()` at `:1143`: it does not traverse/dispose geometries, materials, textures, render targets, call `forceContextLoss()`, remove the canvas, close AudioContext, or null references. The existing `innerHTML = ''` at `:391` is a static clear, not an external-input XSS sink, but it is destructive if the container ever contains host children.
- Additional verified input defects: the early return at `:998–1000` prevents the Escape/P resume branch at `:1004–1007` from running while paused; keyboard handling has no explicit active/focused-frame check; blur clears controls but only pauses when `document.hidden` (`:1021–1025`); global pointer release (`:1075–1085`) does not preserve another pointer holding the same action.

### Security and parent-integration findings

- `WebsiteAdapter` guesses parent/window globals and DOM state (`script.js:28–72`): it reads mute flags, parent `<audio>` elements, mute classes/attributes, and localStorage keys (`:34–69`). It also tries arbitrary parent function names including `openModal` (`:74–110`). These are implicit, brittle privileges and can throw on cross-origin property access or invoke unrelated host behaviour.
- `window.LoveDriveConfig`, `window.RECIPIENT_NAME`, and callback hooks are additional ambient globals (`:28–32`, `:118–120`). Part 4 must replace all of this with the explicit bridge contract.
- Recipient/custom message assignment uses `textContent` (`:281–285`), which is safe for those values. No current external-input `innerHTML` sink was found in Love Drive; the `innerHTML` clear at `:391` is constant.
- The love letter is an editable `<textarea>` (`index.html:99`), not a read-only recipient message. There is no host error protocol or friendly WebGL fallback.

### Completion/replay signals missing

`triggerFinalReveal()` reaches `COMPLETED` (`script.js:825–845`) but never posts `complete`. `Back to Surprise` opens the love modal through the guessing adapter (`:1095–1102`), not `next`. `replayMission()` resets internal state (`:856–883`) but emits no `replayed` event and has no host replay message. There is no host init/pause/resume contract.

## Host facts independently verified

- `SceneComponentProps` currently contains `onNext`, optional `onPrev`, `isActive`, `reducedMotion`, and `globalMuted` (`src/lib/v2/registry.ts:224–230`).
- Heavy scenes use `SCENE_LAZY_LOADERS` and `SceneEngine` lazy loading (`registry.ts:222–240`, `SceneEngine.tsx:44–62`). No new loader/registry entry was added in Part 1.
- The existing scene list is hardcoded in `artifacts/birthday-surprise/supabase/functions/_shared/configPatch.ts:2`; audio validation consumes that list (`src/lib/v2/audioRuntime.ts:2,78`). `migrate.ts` has `KNOWN_V2_KEYS` at `:251–258`, and `DEFAULT_V2_SCENE_SEQUENCE` at `:70–74`. These are Part 2 integration points only.
- Sticker scene keys are independently listed in `src/lib/stickers/model.ts:33–52`. No sticker model was changed.
- The app has canvas-confetti and framer-motion but no three/GSAP package dependency. Vendoring avoids adding either to the host bundle.
- `artifacts/birthday-surprise/vercel.json` already had an SPA rewrite and no CSP. Static files under `public/experiences/` are served before the SPA fallback, matching the iframe design.

## Architecture decision and measured evidence

**Decision:** use same-origin bundled documents under `public/experiences/<id>/` inside `ExperienceFrame`, with `sandbox="allow-scripts"` only and the typed v1 protocol. Do not port the sources to native React in Part 1.

Measured/source evidence:

1. The originals contain 4,117 lines, three independent global style environments, viewport-fixed layout, 10 `requestAnimationFrame` call sites (including starts/recursion, excluding cancellation), and multiple never-ending GSAP/CSS/audio activities. These are concrete isolation and teardown hazards, not just stylistic concerns.
2. Confession's runtime Tailwind and global reset, Heart's `*`/`html,body`, and Drive's `body,html` would affect a native host immediately. An iframe gives each source its own CSS, DOM, window listeners, and document viewport.
3. Removing an iframe document is a reliable final teardown boundary for its timers/rAF/audio/WebGL. Part 3/4 still must implement cooperative pause/replay and explicit disposal for in-frame resets and resource hygiene; iframe removal is not an excuse to skip those fixes.
4. `allow-same-origin` is **not** required by the source inventory: all scripts/assets are local, no source needs host DOM/localStorage access, and the protocol works with an opaque origin. The original Drive parent heuristics are a defect to remove, not a reason to relax sandboxing.
5. Because the sandboxed frame has an opaque origin, both directions use `postMessage(..., "*")`. Host acceptance additionally requires `event.source === iframe.contentWindow` and a closed runtime schema; the bridge accepts only messages from `window.parent`. This is intentional and documented rather than an accidental wildcard trust.

**Browser measurement:** the Playwright spike at `tests/browser/experience-frame.spec.ts` was run against the real Love Drive bundle and passed. It checks WebGL/render calls, clicks the canvas and sends a real ArrowUp key, then measures child rAF ticks after removal. The run used a temporary test-only Chromium executable and dummy `qa.invalid` app env; no repository dependency or credential was added. The full browser regression result, including one unrelated existing audio-test failure, is recorded in `docs/experiences-part1-report.md`. If another browser exposes a WebGL/worker limitation, the first fallback is to keep this same protocol/host and investigate a software-WebGL-compatible renderer or a per-experience native adapter behind the wrapper—not to weaken the sandbox or reintroduce CDN scripts.

## Protocol v1 reference

### Host → frame

All messages have exactly `v: 1` and the listed keys. Unknown keys, wrong types/versions, unsafe JSON, and excess depth/size are rejected.

| Type | Additional fields |
| --- | --- |
| `init` | `experience` (`heart-tunnel`, `love-confession`, or `love-drive`), plain-JSON `config`, allowlisted `theme`, `reducedMotion`, `muted`, `occasion` |
| `update` | Optional `muted`, `reducedMotion`, `theme`; no iframe reload |
| `pause` / `resume` / `replay` | No additional fields |

Theme keys are only `--exp-accent`, `--exp-accent-2`, `--exp-bg`, and `--exp-text`. Config is intentionally open per experience but is bounded to depth 8, 2,000 nodes, 60,000 total characters, 6,000 characters per string, and 512 array items. Prototype-pollution keys (`__proto__`, `prototype`, `constructor`) are rejected recursively. Text is data only; markup-shaped strings and script URLs are rejected, and every future renderer must still use `textContent`/DOM nodes rather than `innerHTML`.

### Frame → host

`ready`, `next`, `complete`, and `replayed` have no extra fields. `error` has `code` (maximum 64 characters) and `message` (maximum 200 characters). `next` and optional `complete`-driven advancement share a one-shot host guard. By default `complete` only notifies `onComplete`; it does **not** auto-advance, leaving the later Continue button in control.

### Bridge API available to each page

`public/experiences/shared/bridge.js` is included before each original script and exposes `window.__experience`:

- State: `config`, `theme`, `muted`, `reducedMotion`, `occasion`, `experience`, `paused`, `initialized`.
- Subscriptions: `onInit`, `onUpdate`, `onPause`, `onResume`, `onReplay`; each returns an unsubscribe function.
- Host notifications: `next()`, `complete()`, `replayed()`, and `error(code, message)`.

It validates incoming host messages, exposes updates without reloading, posts `ready` after deferred DOMContentLoaded setup, and forwards `window.onerror` plus unhandled rejections as bounded error messages. The original experiences do not consume config yet; that is deliberately reserved for Parts 3–4.

## Part 1 patch log (append future source edits here)

| File(s) | What changed | Why |
| --- | --- | --- |
| `public/experiences/{heart-tunnel,love-confession,love-drive}/index.html` | Copied original starting points; removed viewport zoom restrictions; added `data-experience`; included `../shared/bridge.js` before each source script. Google Fonts stylesheets use non-blocking print-to-all loading. | Safe vendoring, accessibility, reliable font fallbacks, and explicit frame identity/lifecycle. |
| `public/experiences/love-drive/index.html` + `vendor/three.min.js` | Replaced cdnjs Three.js r128 with exact local npm `three@0.128.0` build and license. | Removes runtime CDN dependency while preserving the requested library version. |
| `public/experiences/love-confession/index.html` + `vendor/gsap.min.js` | Replaced GSAP CDN with local GSAP 3.12.2 minified build/readme. | Removes runtime CDN dependency without rewriting animation behaviour. |
| `public/experiences/love-confession/index.html` + `vendor/confetti.browser.js` | Replaced jsDelivr confetti 1.6.0 with local repo-provided canvas-confetti 1.9.4 and license. | Uses the already-installed dependency; no new package was added. Version difference is recorded for Part 3 behavioural testing. |
| `public/experiences/love-confession/tailwind.css` | Added hand-written, root-scoped static utilities for every class token used by the original HTML. | Removes Tailwind runtime JIT/global preflight; system font fallbacks remain if Google Fonts fails. |
| `public/experiences/love-confession/index.html` and `script.js` | Removed the Pixabay `<audio>` element, `bgMusic` lookup, and its volume/play calls. | Required removal of the separate background track; prevents a null-audio exception. No replacement audio behaviour was introduced. |
| `public/experiences/shared/bridge.js` | New shared validated postMessage bridge and error forwarding. | Common isolation/lifecycle contract for all three frames. |
| `src/lib/experiences/protocol.ts` | New pure-TypeScript closed schemas, limits, theme allowlist, JSON/prototype-safety validators. | Prevents malformed/oversized/hostile messages and documents the v1 contract. |
| `src/components/experiences/ExperienceFrame.tsx` | New sandboxed iframe host with ready timeout, Retry/Skip, loading/error UI, source/schema checks, one-shot next, pause/resume/update/replay, and error boundary. | Shared infrastructure without registering scenes or changing existing flows. |
| `src/pages/ExperienceFrameFixture.tsx`, `src/App.tsx` | Added a development-only `/__experience-frame-fixture` route for the real Love Drive spike. | Browser measurement without production scene registration or config changes. |
| `artifacts/birthday-surprise/vercel.json` | Added immutable caching for `experiences/*/vendor/*` and revalidation for experience HTML/JS/CSS/shared bridge. | Appropriate cache lifetime for stable libraries versus files later parts will patch. |
| `src/lib/experiences/__tests__/protocol.test.ts`, `src/components/experiences/__tests__/ExperienceFrame.test.tsx`, `tests/browser/experience-frame.spec.ts` | Added validator, fake-iframe lifecycle, and real-browser fixture tests. | Automated regression coverage for Part 1 contracts. |

The original Heart Tunnel `script.js/style.css`, Love Drive `script.js/style.css`, and Confession `style.css` are otherwise byte-preserved from the ZIP starting points. No behaviour patch for the audited animation/input/config issues is claimed in Part 1.

## Explicitly deferred / not changed

- No `NewSceneId`, feature flag, registry, lazy loader, config schema/migration, AI patch path, sticker scene key, or Customize editor changes.
- No native React rewrite, theme binding, config-driven text, reduced-motion source patch, WebAudio replacement, completion buttons, or full disposal implementation yet.
- No Supabase tables/RLS/RPCs/functions, payment/Razorpay, `api/`, or `middleware.js` changes.
- No PR and no merge. The Arena session branch remains `arena/fbde90ae-birthday-surprise-enhancement`; the prompt's suggested `feat/scenes-part1` branch was not created because this session requires its fixed branch.

## Part 2 follow-up

Part 2 config/scene plumbing is documented in [`docs/experiences-part2.md`](./experiences-part2.md), with its compatibility/test report in [`docs/experiences-part2-report.md`](./experiences-part2-report.md). The shared AI validator change **REQUIRES MANUAL `supabase functions deploy`** before deployed AI assistant support can be claimed.
