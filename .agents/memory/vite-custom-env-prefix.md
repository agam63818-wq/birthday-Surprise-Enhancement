---
name: Vite custom env prefix for non-VITE_ secrets
description: How to expose Repl secrets (e.g. SUPABASE_URL, SUPABASE_ANON_KEY) to Vite client code when they aren't prefixed with VITE_ and shouldn't be renamed.
---

By default Vite only exposes `.env`/`process.env` variables prefixed `VITE_` to client code via `import.meta.env`. When a user has already added secrets under a different name (e.g. `SUPABASE_URL`, `SUPABASE_ANON_KEY`) and asked to read them as-is, don't rename them or ask for new ones.

**Fix:** add `envPrefix: ["VITE_", "<OTHER_PREFIX>_"]` to the artifact's `vite.config.ts`. Vite's internal env loading merges matching `process.env` vars (not just `.env` file contents) into `import.meta.env`, so `import.meta.env.SUPABASE_URL` becomes available without any renaming.

**Why:** Avoids unnecessary secret renames/duplication and respects the user's existing secret setup; matches the project's existing pattern of validating required env vars (PORT, BASE_PATH) with a clear thrown error at startup, which should be replicated for new required secrets too.
