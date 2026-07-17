import { createClient } from "@supabase/supabase-js";

// Read credentials with a VITE_-prefixed fallback so the app works on
// standard Vite hosts (Vercel, Netlify…) even without a custom envPrefix.
const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

/**
 * Non-null when Supabase credentials are missing. UI components check this
 * to render a friendly message instead of a dead screen.
 *
 * IMPORTANT: never throw at module load here — this module is imported by
 * AuthContext before anything renders, so a throw white-screens the whole
 * app (blank page / spinner-only shared links on misconfigured deploys).
 */
export const supabaseConfigError: string | null =
  !supabaseUrl || !supabaseAnonKey
    ? "Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) in the deployment environment."
    : null;

if (supabaseConfigError) {
  // Loud in the console for developers, silent for visitors.
  console.error(`[supabase] ${supabaseConfigError}`);
}

export const supabase = createClient(
  // Safe placeholders keep the client constructible; every call will fail
  // fast and the UI surfaces supabaseConfigError instead of crashing.
  supabaseUrl || "https://missing-config.supabase.co",
  supabaseAnonKey || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
