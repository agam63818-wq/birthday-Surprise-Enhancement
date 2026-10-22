# Scheduled Surprise Countdown

An optional gate in front of the experience. While it is locked, the person who opens `/s/<slug>` sees a full-screen countdown. At the scheduled moment it plays a 3 → 2 → 1 reveal and opens the real experience. The creator can edit the schedule or turn it off at any time. Only the creator, in Dashboard → Preview, gets the "Open surprise now" button.

**With the countdown OFF (the default, or no `countdown` key at all), the site works exactly as it did before.** Visitors download no countdown code.

## Architecture

```
/s/:slug ─ PublicShare ─ fetchPublicSurprise (v2 RPC → falls back to v1)
             │  countdown OFF / time already passed ─────────► <BirthdayExperience>   (unchanged)
             └─ countdown ON and locked ─► lazy <CountdownGate viewerMode="public">
                                              └─ at zero ─► <BirthdayExperience config=authorised>
Dashboard → Preview ─ lazy <CountdownGate viewerMode="owner-preview" config={draft}>
```

| File | Role |
|---|---|
| `supabase/functions/_shared/countdownTime.ts` | Converts wall time + timezone to UTC with `Intl`, detects DST gaps and overlaps. No dependencies, Deno-safe. |
| `supabase/functions/_shared/countdownConfig.ts` | Field validators, text limits, AI patch allowlist, derivation of `unlockAtUtc`, AI prompt notes. |
| `supabase/functions/_shared/configPatch.ts` | Adds the countdown paths, validates `countdown` on save for v1 **and** v2, and re-derives `unlockAtUtc` after AI patches. |
| `src/lib/countdown/engine.ts` | Pure code: stage machine, remaining time, offset math, schedule checks, screen-reader milestones, once-only reveal guard. |
| `src/lib/countdown/defaults.ts` | The single defaults module, shared by the editor and the renderer. |
| `src/lib/countdown/trustedClock.ts` | Trusted time anchored to the monotonic clock. |
| `src/lib/countdown/ticker.ts` | One scheduler per gate, exposed as an external store so only the digits re-render. |
| `src/lib/countdown/sound.ts` | Web Audio cues: one `AudioContext`, each cue plays once. |
| `src/lib/countdown/publicSource.ts` | Calls the v2 RPC first and falls back to v1 on 404. |
| `src/components/countdown/*` | Gate, screen, CSS. Split into its own chunk. |
| `src/components/dashboard/CountdownEditor.tsx` | The countdown card in Customize. |
| `api/server-time.ts` | Returns `{ now }` with `Cache-Control: no-store`. |
| `supabase/proposals/countdown-hard-lock.sql` | Tier 2 SQL **proposal**. Only the owner applies it. |

## Config (`config.countdown`, all fields optional)

| Field | Default | Notes |
|---|---|---|
| `enabled` | `false` | Turning it OFF keeps every other setting. |
| `unlockAtUtc` | — | The authoritative unlock time (ISO string ending in `Z`). Always derived from the three fields below. The AI cannot set it. |
| `timezone` | `Asia/Kolkata` | IANA timezone name. |
| `localDate` / `localTime` | — | The creator's inputs: `YYYY-MM-DD` and 24-hour `HH:mm`. |
| `heading`, `recipientName`, `message`, `waitingLine`, `footer` | depends on occasion / `config.name` | Plain text, max 120 / 120 / 600 / 160 / 200 characters. |
| `labels.{days,hours,minutes,seconds}` | Days / Hours / … | Max 24 characters each. |
| `showTeaserButton`, `teaserLabel`, `teaserReaction` | off | Cosmetic only. It never unlocks anything. |
| `soundEnabled` | `false` | The visitor still has to tap "Enable sound". |
| `afterUnlock` | `autoOpen` | `openButton` shows an "Open" button instead. The tap also counts as the user gesture browsers need before playing audio. |
| `openButtonLabel` | "Open your surprise" | |
| `style` | taken from the theme | `aurora` / `celestial` / `velvet`. |

How validation behaves:
- **Blocked:** a missing or invalid date, time or timezone, or a time that falls in a DST gap.
- **Must choose:** a time that happens twice when DST ends. The creator picks the first or second occurrence.
- **Warning only:** a time in the past. The creator has to confirm "unlock immediately", and the time is never reset silently.
- **Rejected on save and in AI patches:** markup, unknown keys, text over the limit, and an `unlockAtUtc` that doesn't match the date, time and timezone.

## Time sync

`trustedNow = serverMs + (performance.now() − perfAtSample)`. Each sample is corrected for round-trip time using the midpoint, and the lowest-RTT sample in a window of 5 wins. Sources, best first:

1. `server_now` from the hard-lock RPC
2. `/api/server-time`, or the HTTP `Date` header if the API exposes it
3. the device clock, marked untrusted in `window.__countdownDiag`

The clock is anchored to `performance.now()`, not `Date.now()`. So **changing the device clock cannot move the unlock moment** (covered by a unit test and a Playwright test). Remaining time is recalculated from fresh timestamps on every tick. Ticks line up with second boundaries, use `requestAnimationFrame` in the last 3.5 seconds, and resync when the tab becomes visible again or regains focus. After the tab was hidden, the old anchor is marked stale and re-measured.

## Product behaviour

- **Opened after the unlock time:** the experience opens immediately, with no 3-2-1.
- **Opened with less than 3 seconds left:** only the remaining numerals are shown.
- **Refresh:** a completed reveal never replays. `sessionStorage` stores `countdown-revealed:<slug>:<unlockAt>`. This only affects the animation. It is not a security boundary.
- **Creator edits the schedule while someone is waiting:** the public page re-fetches every 60 seconds, when the tab becomes visible, when the connection comes back, and 15 and 5 seconds before the unlock.
  - Schedule extended → the countdown extends.
  - Countdown turned OFF or moved into the past → the page unlocks smoothly, without the 3-2-1.
  - Countdown turned ON for someone already inside the experience → nothing happens. The gate only applies when the page is first opened.
- **At zero:** a light bloom of about 1.2 seconds plays, but it never delays the unlock. The experience mounts exactly once.
  - **Hard lock:** the full config is fetched first, retrying up to 6 times with backoff. If it still fails, a friendly retry card appears.

## Owner-only controls (structural)

`viewerMode` is a prop. `PublicShare` hardcodes `"public"`. Only the authenticated `Dashboard` Preview passes `"owner-preview"`. Owner mode never comes from URL parameters, storage or cookies. A Playwright test confirms that `?owner=1`, `?preview=1` and tampered `localStorage` show no controls.

The creator toolbar has these buttons:
- **Live schedule**
- **Preview locked state**
- **Preview 3-2-1 finale**
- **Preview unlocked state**
- **Open surprise now**
- **Unlock for recipients now…** — after a confirmation, this sets the **draft** schedule to now. Recipients are only affected after the creator presses **Save**.

None of the preview buttons write anything. A test confirms there are 0 PATCH requests.

## Security — Tier 1 vs Tier 2 (read this)

**Tier 1 is what ships with this PR. It is a soft lock.** The gate hides the experience and relies on trusted server time, but `get_surprise_by_slug` still sends the *whole* config to the browser. Someone looking at network traffic can read letters and photo URLs before the unlock. **This content is not protected.**

**Tier 2 is the hard lock, and the owner must apply it.** `supabase/proposals/countdown-hard-lock.sql` creates `get_surprise_by_slug_v2`:
- It wraps the existing function, so its access rules carry over.
- It decides using database time (`now()`).
- Before the unlock it returns `{ locked: true, server_now, config: { name, theme/occasion keys, countdown display fields } }` and nothing else.
- After the unlock it returns the normal payload plus `locked: false`.

When the response says `locked: true`, the client renders the countdown from the redacted config and fetches the full config at zero.

### Rollout order

1. Deploy this frontend. It calls v2 and falls back to v1, so nothing breaks before the SQL exists. `middleware.js` and `api/og.tsx` now try v2 first as well; they only read `config.name`, which the redacted payload keeps.
2. Run **STEP 0** of the SQL file. It checks the current function's definition, return type and `prosecdef`. Adjust the file as its comments describe. **I couldn't see that definition from the repo.**
3. Apply STEP 1 (create v2) and STEP 2 (grants), then test with STEP 4.
4. **Only then** apply STEP 3: revoke `EXECUTE` on the old `get_surprise_by_slug` from `anon`/`authenticated`. Until this step, anyone holding the public anon key can call the old RPC and read everything.

Rollback SQL is included in the file.

What is and isn't relied on:
- Owner Preview and drafts never call the public RPC, so unsaved edits never reach `/s/<slug>`.
- Query parameters, storage, CSS, hidden DOM and the browser clock are never used for security.

## AI assistant

These requests now map to validated patches:
- "schedule it for 25 Oct 7pm IST" → `countdown.localDate` / `localTime` / `timezone` / `enabled`
- "change the countdown message"
- "turn the countdown off"

`unlockAtUtc` is derived automatically, and the AI cannot set it directly.

> ⚠️ **Manual step required:** `supabase/functions/_shared/configPatch.ts` (and the new `countdown*.ts` files it imports) are bundled into the deployed `generate-surprise-structure` edge function. **Run `supabase functions deploy generate-surprise-structure`** before AI countdown edits work in production. Until then, the deployed function rejects countdown paths, and the chat tells the user to use Customize instead of dropping the change silently.

## Performance and accessibility

**Performance**
- The gate is in its own lazy chunk. Visitors with the countdown OFF don't download it (a Playwright test checks this).
- One canvas with at most about 56 particles, device pixel ratio capped at 2. It pauses when the tab is hidden or the canvas is offscreen.
- Every timer, `requestAnimationFrame`, listener, observer and `AudioContext` is cleaned up.

**Accessibility**
- The timer has `role="timer"`. A polite live region announces only every minute, at "10 seconds left", and then the final numerals.
- With `prefers-reduced-motion`, decoration is static and transitions are opacity-only. The 3-2-1 still shows and the unlock still happens on time.
- No flashing above 3 per second, no strobes.
- Mobile: no horizontal overflow from 320px up, landscape works, safe-area insets and `dvh` are respected, and controls are at least 44px.

## Manual checks for the owner

1. On a Preview deploy, turn the countdown ON, use **In 2 minutes (test)**, Save, open the share link in incognito and watch the 3-2-1.
2. Confirm "Open surprise now" appears in Dashboard Preview and **not** on the public link.
3. Check sound and animation in iPhone Safari.
4. For a real lock, review and then apply the SQL file in the order above.
5. Run `supabase functions deploy generate-surprise-structure` to enable AI countdown edits.
