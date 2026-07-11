import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL environment variable is required but was not provided.",
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "SUPABASE_ANON_KEY environment variable is required but was not provided.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
