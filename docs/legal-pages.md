# Privacy Policy, Terms & signup consent

## What was added
- `/privacy-policy` and `/terms`: public, lazy-loaded, indexable (listed in `sitemap.xml`).
  The content lives in `src/lib/legal/content.ts` and only states what the code does.
  Anything that couldn't be verified is shown as a highlighted **[Owner to confirm: …]**.
- `<SiteFooter/>` with Home / Privacy Policy / Terms links. It is mounted on:
  - the home page (below the About/FAQ)
  - login, signup, forgot-password and reset-password
  - the legal pages
  - the dashboard Customize and AI tabs

  It is **not** shown on `/s/:slug` recipient pages or inside the Preview experience.
- Signup checkbox (unchecked by default): "I agree to the Terms & Conditions and acknowledge
  the Privacy Policy." Submit is blocked with an inline error until it's checked.
- Consent is saved at signup in Supabase auth `user_metadata`:
  `terms_accepted_at`, `terms_version`, `privacy_version` (versions are in `src/lib/legal/constants.ts`).
- Wording: "private link" → "unlisted link" everywhere. That covers the paywall, the FAQ /
  SEO static HTML, the About footer, the manifest and code comments. The FAQ now says
  plainly that links can be forwarded and media URLs are public.

## Important notes
- `user_metadata` is **client-writable**, so it is a convenience record, not tamper-proof
  evidence. For a stronger server-side record, see the OPTIONAL
  `supabase/proposals/consent-table.sql` (table + RLS + trigger). It is not applied, and no
  migration is required.
- Existing users are not asked to re-consent. That is a possible follow-up.
- These pages are plain-language information, **not legal advice**. Have a lawyer review
  them before launch.

## Filled in (2 November 2026)
- Support / privacy email: agamk5651@gmail.com (shown as a `mailto:` link)
- Operator: Agam, the independent operator of Birthday Surprise
- Default AI provider: Google Gemini (users may still bring their own OpenAI / Gemini / Anthropic key)
- Email delivery: Resend (custom SMTP via Supabase Auth)
- Price wording: "The price shown at checkout is the total amount payable." (no GST mention)
- Deletion: deleting an account removes the profile, surprises and payment records from the
  database; uploaded photo/audio files live in public storage buckets under the user's folder
  and are removed separately on request.

## [Owner to confirm] items still open (`src/lib/legal/content.ts`)
1. Refund and cancellation policy
2. Deletion process and timeline (including removal of stored photo/audio files)
3. Payment record fields stored on our side and how long they are kept
4. Payment record retention period
5. What Vercel / Supabase log for this project, and for how long
6. That platform request logs don't retain request bodies containing user API keys
7. Governing-law jurisdiction (city / state in India)

When a document changes in substance, bump `TERMS_VERSION` / `PRIVACY_VERSION` and
`LEGAL_LAST_UPDATED` in `src/lib/legal/constants.ts`.
