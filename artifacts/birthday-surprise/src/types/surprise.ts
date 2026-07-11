import type { Config } from "@/config";

// Mirrors the `public.surprises` row shape (table/RLS/trigger already
// exist in Supabase — this is a read/write client-side type only).
export interface SurpriseRow {
  id: string;
  user_id: string;
  slug: string;
  config: Config;
  is_paid: boolean;
  photo_urls: string[];
  audio_urls: string[];
  created_at?: string;
  updated_at?: string;
}
