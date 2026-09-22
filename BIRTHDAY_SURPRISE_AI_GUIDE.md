# Birthday Surprise Enhancement — AI Agent Guide

> Canonical repository guide for coding agents. Read this file before changing the project.

## 1. Product

**Birthday Surprise Enhancement** is a customizable digital-surprise experience engine. It started as a birthday-only cinematic page and now supports an extensible V2 configuration model for multiple occasions and cinematic scenes.

Primary app:
- Source: `artifacts/birthday-surprise`
- Framework: React + Vite + TypeScript
- UI/animation: React, Framer Motion, custom CSS/SVG, lazy-loaded scene components
- Persistence/integration: Supabase
- Deployment target: Vercel
- Public preview: https://birthday-surprise-enhancement.vercel.app/

## 2. Core principles

1. Preserve existing user data, legacy behavior, save payloads, Supabase schema/RLS/RPCs, and public-share behavior unless a change is explicitly required.
2. One canonical runtime configuration: `SurpriseConfig = Config + V2 extension`.
3. Customize, AI, Preview, and recipient/public experience must read/write the same config.
4. Feature `enabled` state is separate from feature settings. Turning a feature OFF must not erase its saved settings.
5. Disabled heavy scenes should not render, initialize, lazy-load unnecessary assets, appear in progress/navigation, or consume animation resources.
6. Occasion presets are defaults/recommendations only; explicit user overrides always win.
7. AI must use validated structured config patches. Never manipulate the DOM as a source of truth.
8. Unknown AI fields/unsupported features must not be invented or persisted.
9. Legacy configs must remain compatible. Do not silently rewrite old records into V2.
10. No new payment system. Existing payment-related code may exist and must not be removed accidentally.

## 3. Current V2 configuration

Canonical schema:
`artifacts/birthday-surprise/src/lib/v2/schema.ts`

Important fields:
- `_version: 1 | 2`
- `occasionId`
- `scenes: SceneId[]`
- `features`
- `themePreset`
- `notebook`
- `roseBloom`
- `butterfly`
- `giftReveal`
- `youAndMe`
- `textStyles`
- `_ext`

The V2 schema is additive over legacy `Config`; legacy fields are preserved.

### Occasion IDs

Supported canonical IDs include:
- birthday
- anniversary
- friendship
- mothersday
- fathersday
- rakshabandhan
- congratulations
- romantic
- justbecause
- loveday (legacy alias)
- custom

Legacy `occasionType` remains relevant for compatibility. V2 can use `occasionId`.

## 4. Scene system

Scene registry:
`artifacts/birthday-surprise/src/lib/v2/registry.ts`

### Legacy scenes
- landing
- intro
- cuteness
- celebration
- cake
- rakhiHero
- familyHero
- loveDayHero
- whyYouMatter
- ourStory
- memoryWall
- beforeLeave
- lastNote

### V2 cinematic scenes
- letters — Interactive Letters
- butterfly — Butterfly
- giftReveal — Gift Reveal
- youAndMe — You & Me
- notebook — Notebook
- roseBloom — Rose Bloom

Heavy V2 scenes are lazy-loaded through the registry:
- `LettersScene`
- `ButterflyScene`
- `GiftRevealScene`
- `YouAndMeScene`
- `NotebookScene`
- `RoseBloomScene`

The registry is the source of truth for scene metadata, feature keys, occasion recommendations, and lazy loaders. Do not create duplicate scene catalogs.

## 5. V2 default sequence

For an explicit V2/new configuration, the current default sequence is:

1. intro
2. butterfly
3. giftReveal
4. celebration
5. memoryWall
6. youAndMe
7. letters
8. notebook
9. roseBloom
10. lastNote

Legacy V1 records retain this fixed legacy sequence instead:

1. landing
2. intro
3. cuteness
4. celebration
5. cake
6. whyYouMatter
7. ourStory
8. memoryWall
9. beforeLeave
10. lastNote

**Do not enable new V2 cinematic scenes merely because an old record is read.**

## 6. V2 feature defaults

For new V2 configs, current defaults enable:
- intro
- celebration
- memoryWall
- whyYouMatter
- lastNote
- butterfly
- giftReveal
- youAndMe
- letters
- notebook
- roseBloom

They disable by default:
- cutenessMeter
- ourStory
- beforeLeave

Legacy records keep their legacy feature behavior and keep V2 cinematic scenes off.

## 7. Feature details

### Butterfly
Config:
- `butterfly.message`
- `butterfly.subMessage`

Purpose: romantic butterfly reveal / heart formation.

### Gift Reveal
Config:
- `giftReveal.occasionText`
- `giftReveal.recipientName`
- `giftReveal.senderName`
- `giftReveal.message`
- `giftReveal.photoUrl`

Purpose: animated gift box reveal and personalized message/photo.

For images, production should prefer an accessible direct asset URL (for example a public Supabase Storage asset) rather than a viewer-page URL.

### You & Me
Config:
- `youAndMe.name1`
- `youAndMe.name2`

Purpose: particle/heart-based two-person moment.

### Notebook
Config:
- `notebook.pages[]`

Page types:
- cover
- letter
- memory
- quote
- ending

Each page has `id`, `type`, `enabled` plus type-specific fields.

Notebook is a real scene, not an iframe or independent mini-site.

### Interactive Letters
Scene ID: `letters`

This is a V2 cinematic scene intended to present personal notes/letters interactively. Keep it integrated with the scene engine and canonical config.

### Rose Bloom
Config:
- `roseBloom.text`
- `roseBloom.speed`: slow | normal | fast
- `roseBloom.intensity`: subtle | normal | dramatic
- `roseBloom.fallingPetals`
- `roseBloom.soundEnabled`

Purpose: cinematic rose blooming finale.

## 8. Theme system

Legacy themes remain supported through:
`artifacts/birthday-surprise/src/lib/themePresets.ts`

V2 adds the premium **Midnight Rose** experience theme.

Midnight Rose tokens are defined in:
`artifacts/birthday-surprise/src/lib/v2/midnightRose.ts`

Design direction:
- deep near-black / midnight base
- wine/crimson accents
- champagne/gold highlights
- serif headings + modern sans body
- restrained glass / gradients / grain
- controlled glow
- avoid all-pink styling, excessive hearts, or particle overload

Midnight Rose must be scoped to the experience and must not retheme dashboard/auth/payment surfaces.

## 9. Migration / normalization

Canonical migration + normalization:
`artifacts/birthday-surprise/src/lib/v2/migrate.ts`

Important behavior:
- pure and deterministic
- non-mutating
- repeatable
- no auto-save
- preserve user text, names, media, audio, theme, occasion, ordering
- explicit false/zero/empty values are preserved
- missing values get safe defaults
- unsupported future versions fall back in a controlled way
- unknown safe extension data can remain in `_ext`

Use `normalizeConfig()` when the runtime needs fully resolved V2 values.

Do not invent a second migration path.

## 10. Runtime scene engine

`artifacts/birthday-surprise/src/scenes/SceneEngine.tsx`

The engine:
- receives normalized config
- computes active sequence using registry metadata + feature flags
- lazy-loads heavy scenes
- passes `isActive`, `reducedMotion`, and `globalMuted`
- mounts only active scene(s)
- has a loading/error boundary

When adding a new cinematic feature:
1. add schema/config
2. add registry metadata + feature key
3. add scene component
4. add lazy loader if heavy
5. add editor controls if needed
6. add AI patch/schema metadata
7. add tests
8. wire it through the engine

Do not hard-wire a new feature separately in multiple subsystems.

## 11. Experience renderer

`artifacts/birthday-surprise/src/BirthdayExperience.tsx`

This file still contains legacy page rendering for backward compatibility. Explicit V2 configs can use the SceneEngine path.

Important:
- legacy pages must continue to work
- do not delete the old renderer merely because V2 exists
- keep public/recipient playback consistent with Preview

## 12. Customize dashboard

Primary editor:
`artifacts/birthday-surprise/src/components/dashboard/CustomizeForm.tsx`

It edits the canonical config and supports:
- occasion/theme
- name
- legacy page content
- memory wall/photo content
- audio
- fonts/text styles
- V2 experience editor integration
- V2 validation
- audio playback settings integration

Current code still contains a legacy-visible occasion selector subset even though the V2 schema supports more occasions. Do not assume the schema and current UI are identical.

Current UI handles:
- dirty state
- before-unload warning for unsaved edits
- explicit save flow
- V2 validation
- audio duration/playback settings

Paywall code may still exist. Do not remove existing payment/paywall behavior unless specifically requested.

## 13. Audio system

V2 schema imports shared audio playback settings from:
`supabase/functions/_shared/audioPlayback`

Dashboard references:
- `AUDIO_TRACK_IDS`
- `AudioPlaybackSettings`
- `AudioField`
- `readActualAudioDuration`

The product direction includes per-track playback control (full song, custom segment, scene-aware playback, loop/fade). Preserve backward compatibility: missing playback config should behave like the current legacy/full-song behavior.

Never make the UI the only implementation; runtime playback must honor persisted settings.

## 14. AI system

Primary dashboard AI UI:
`artifacts/birthday-surprise/src/components/dashboard/AIAssistantChat.tsx`

Existing AI flow supports:
- platform/default AI
- own API key mode
- Gemini
- OpenAI
- Anthropic

Security expectations:
- user-supplied API keys are ephemeral
- do not persist or log them
- use structured validated patches
- review before apply
- do not treat model text as trusted configuration

The AI flow may contain legacy compatibility around `occasionType`. V2 uses `occasionId`. Whenever modifying AI behavior, keep legacy compatibility explicit and validate canonical V2 fields instead of relying on ambiguous aliases.

Do not leak personal/example names into new users' state. Defaults must come from a single default-config source.

## 15. Supabase integration

Project is already integrated with Supabase. The main persistence model stores the experience config in the existing `surprises` row's JSON configuration plus existing media/audio fields.

Rules:
- do not add new tables/columns/RLS/RPCs for normal V2 feature additions unless unavoidable
- do not redesign the persistence layer
- preserve existing public-share lookup behavior
- do not expose secrets in frontend code
- use existing authenticated/public access patterns

## 16. Assets and animation source

The repo contains `animation_code.zip` with reusable source material for:
- rose
- romantic butterfly
- you and me
- notebook
- animated birthday/gift

These are reusable animation references, not separate websites. Integrate them as native React/canvas/CSS/JS scenes or reusable components where appropriate.

Do NOT use iframes or embed the ZIP projects as independent routes.

## 17. Repository structure that matters

- `artifacts/birthday-surprise/src/` — main application code
- `artifacts/birthday-surprise/src/lib/v2/` — V2 schema, migration, registry, theme
- `artifacts/birthday-surprise/src/scenes/` — cinematic scenes / engine
- `artifacts/birthday-surprise/src/components/dashboard/` — creator UI
- `artifacts/birthday-surprise/public/` — static assets
- `supabase/functions/_shared/` — shared config/audio/validation logic
- `tests/browser/` — Playwright browser tests
- `animation_code.zip` — uploaded animation source reference

## 18. Safe modification checklist

Before editing:
- inspect the current implementation
- identify whether the code is legacy or V2
- read canonical schema/registry/migration first
- preserve existing persisted fields

After editing:
- run typecheck
- run build
- run relevant unit tests
- run browser/Playwright tests for user-facing changes
- verify Preview and public/recipient behavior
- verify old configs still render
- verify disabled scenes do not mount/load
- verify no secret/API key leakage
- verify AI patch validation still rejects unsupported fields

## 19. What not to do

Never:
- create a second config state tree
- invent new schema names when an existing canonical field fits
- write directly to DOM as configuration
- persist arbitrary AI-generated fields
- silently migrate all users to V2
- remove legacy rendering without a migration plan
- load every heavy animation up front
- use iframes for the cinematic scenes
- add a new payment system
- expose Supabase/service/API secrets in client code
- use fake example names such as Priya as runtime defaults for a new user's surprise

## 20. Preferred change pattern

For a new feature:

**Schema → Registry → Component → Editor → AI metadata/patch → Runtime → Tests**

For a bug:

**Reproduce in browser → find canonical owner → fix root cause → test legacy + V2 → build/typecheck**

## 21. Agent startup command

When an AI coding agent opens this repository, first read:
1. this file
2. `artifacts/birthday-surprise/src/lib/v2/schema.ts`
3. `artifacts/birthday-surprise/src/lib/v2/migrate.ts`
4. `artifacts/birthday-surprise/src/lib/v2/registry.ts`
5. `artifacts/birthday-surprise/src/contexts/ConfigContext.tsx`
6. `artifacts/birthday-surprise/src/scenes/SceneEngine.tsx`
7. the relevant dashboard editor and Supabase shared validation files

Then inspect the exact feature files before making changes. Never rely on memory of an earlier version.

## 22. Product identity

The experience should feel like a **personalized digital surprise**, not a generic template. The visual goal is cinematic, emotional, premium, interactive, and customizable while remaining fast enough for real users.

The default premium direction is **Midnight Rose**: elegant, dramatic, warm, restrained, and story-driven.
