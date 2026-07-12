---
name: Running real-browser Playwright flows in this environment
description: How to drive an actual signup/login/click flow against a Replit dev preview when `npx playwright install` can't fetch browsers.
---

`npx playwright install` fails here because Nix blocks system-level dependency installation for the downloaded browser binaries.

**Workaround:** the environment already provides a working Chromium at the
`REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` env var. Install just the `playwright`
npm package (e.g. in a scratch dir via `npm init` + `npm install playwright --no-save`,
no need to touch the monorepo's package.json), then launch with:

```js
chromium.launch({ executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] })
```

**Why:** this lets you drive a *real* browser against `$REPLIT_DEV_DOMAIN` (actual
JS/CSS execution) instead of relying on raw HTTP calls or a debug route — needed
when a user wants proof a flow works end-to-end through the real UI.

**Gotcha:** the Replit dev-preview banner (`#replit-dev-banner`) intercepts
pointer events and blocks normal `.click()`. Either `el.remove()` it via
`page.evaluate` first, or click through `page.evaluate` DOM dispatch instead of
Playwright's locator click. Also, CSS `text-transform: capitalize` changes an
element's computed accessible name in Chromium, so `getByRole('button', { name: 'x', exact: true })`
can silently fail to match lowercase source text — prefer a plain `textContent`
match via `page.evaluate` for such buttons.
