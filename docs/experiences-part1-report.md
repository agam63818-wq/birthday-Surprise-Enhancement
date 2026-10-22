# Experiences — Part 1 implementation report

**Date:** 2026-10-22  
**Scope:** Part 1 only — audit, vendoring, iframe/protocol infrastructure, and a real-browser spike.  
**Branch:** `arena/fbde90ae-birthday-surprise-enhancement`  
**Status:** Complete for Part 1; Parts 2–5 were not started. No pull request was opened.

The source-by-source audit, exact original line references, dependency inventory, integration decision, protocol reference, and patch log are in [`docs/experiences.md`](./experiences.md). The original ZIPs were not edited.

## Delivered

- Copied the three original experiences into `artifacts/birthday-surprise/public/experiences/` without changing the original ZIPs.
- Vendored Three.js r128, GSAP 3.12.2, and canvas-confetti 1.9.4 with their license/readme files. No runtime CDN script tags remain in the vendored HTML.
- Replaced Confession's runtime Tailwind CDN with the root-scoped static `tailwind.css`; removed its Pixabay audio element and the two corresponding audio calls. Google Fonts remain external, non-blocking, and have system fallbacks; Heart's original Unsplash image is unchanged and documented.
- Removed viewport zoom restrictions from all three vendored documents.
- Added the dependency-free, closed, versioned TypeScript protocol in `src/lib/experiences/protocol.ts`, including bounded plain-JSON config validation, prototype-key rejection, and allowlisted theme tokens.
- Added `public/experiences/shared/bridge.js` and the shared `ExperienceFrame` host: opaque-origin sandbox, ready timeout (8 seconds), Retry/Skip recovery, loading/error states, source/schema validation, one-shot next, complete/replayed notifications, update/pause/resume/replay messages, and teardown by iframe removal.
- Added `/experiences/*` cache headers in `artifacts/birthday-surprise/vercel.json`.
- Added Vitest protocol/host tests and a development-only `/__experience-frame-fixture` route plus Playwright spike. No scene registry, config schema, Customize UI, or production scene registration was added.

## Baseline checks (before Part 1 edits)

| Check | Result |
| --- | --- |
| `corepack pnpm install` | Passed; 579 packages installed using the existing lockfile. |
| `pnpm typecheck` | Passed. |
| `pnpm test` | Passed: **8 files / 167 tests**. |
| `pnpm build` | Passed. Existing sourcemap and chunk-size warnings were present. |
| Browser suite | Not run at baseline: no Chromium executable was available in the sandbox. |

## Final automated checks

| Check | Result |
| --- | --- |
| `pnpm typecheck` | **Passed**. |
| `pnpm test` | **Passed: 10 files / 181 tests**. This includes 7 protocol tests and 7 ExperienceFrame tests; the other 167 baseline tests still pass. |
| `node --check` on all vendored source/library scripts and `bridge.js` | **Passed**. |
| `vercel.json` JSON parse | **Passed**. |
| Static HTTP smoke on the QA Vite server | **Passed**: all three HTML documents, Three.js, and the shared bridge returned HTTP 200 with non-empty bodies; local Three/bridge references and absence of Confession CDN/Pixabay/zoom attributes were checked. |
| `pnpm build` | **Passed**. Existing `sonner.tsx` sourcemap and large-chunk warnings remain; no build error. |
| Targeted Playwright spike | **Passed: 1/1**. Real Love Drive loaded inside `ExperienceFrame`; WebGL context/canvas and render calls were observed, canvas click followed by a real ArrowUp key was observed, and child rAF tick counts stopped increasing after iframe removal. |
| Full Playwright regression with test env | **26 passed / 1 failed** (27 total). The failing test is `tests/browser/experience.spec.ts:302`, `music reset, missing metadata, autosave failure and retry retain the canonical draft`, at the existing assertion that the `custom` option is disabled. It reproduced when run alone. No audio code was changed in Part 1. |

### Browser environment and failure accounting

The first full browser attempt had no Supabase environment and 26 existing tests redirected to the login page. I did not count that as a product regression. I then ran a separate QA Vite server with dummy `SUPABASE_URL=https://qa.invalid` and `SUPABASE_ANON_KEY=qa-anon`, matching the existing browser fixtures' request interception. With that environment, 26 tests passed and the one audio assertion above remained failing. No real credentials were used.

The sandbox initially had no browser. The successful browser runs used a temporary, test-only Chromium package and its extracted system libraries under `/tmp`; no package manifest, lockfile, or runtime dependency was changed. This is not a claim that every browser/device is covered.

The full browser run regenerated some existing tracked screenshot artifacts; those unrelated changes were restored. The final working diff contains only the Part 1 files.

## Manual checks / not verified

- No real iPhone, iOS Safari, Android device, or physical GPU was available. iOS WebGL/audio policy, actual touch driving, and device-specific performance remain unverified.
- No deployed Vercel preview was used; cache-header behavior was checked by configuration inspection/JSON parsing and local static-file routing, not by a deployed response-header request.
- Full recipient-facing completion, Replay, Next, and mobile playtesting of the original experiences remain for their later behavior parts. Part 1 deliberately does not add those source behaviors.
- The browser spike is intentionally limited to Love Drive, as required by Part 1; Heart Tunnel and Confession received static/syntax/asset checks, not full interactive browser acceptance tests.

## Known limitations intentionally left for later parts

- Original perpetual animation/timer/listener behavior, incomplete disposal, Heart's URL-to-`innerHTML` sink, Confession's indefinite No-button avoidance, and Love Drive's paused-keyboard/parent-adapter issues are documented in the audit and are not silently claimed fixed.
- The vendored sources do not yet consume host config/theme or emit their scene-specific completion/replay/navigation signals. The shared protocol and host support those contracts, but source wiring is deferred.
- Confession now uses the locally available canvas-confetti 1.9.4 rather than the original CDN URL's 1.6.0; this version difference is explicitly logged for later visual/behavior testing.
- Google Fonts and Heart's Unsplash image still require network access for their original external resources; system font fallbacks are present. No new external audio or script CDN dependency was introduced.
- The existing full-suite audio assertion failure is reported above rather than hidden or unrelatedly rewritten.

## Scope and preservation confirmation

No changes were made to Supabase tables/RLS/RPCs/functions, payment/Razorpay code, `api/`, or `middleware.js`. No new npm dependency was added to the repository. Original ZIP SHA-256 values remain:

- Heart Tunnel: `8e529abae0666b9321c3d52cf461304c6bec6dd26b75cd5c49bb4d4c8c3cf721`
- Love Confession: `5d3f0b485a8f56d63088b599980d604bddd1d4b2b52a38db4af664c098a4258c`
- Love Drive: `45ccff6b24b662e6893b53d6c6596b2ac72a12402db9c07b42a8278a783a7ff4`

Part 1 stops here. Parts 2–5 and PR creation are intentionally pending.
