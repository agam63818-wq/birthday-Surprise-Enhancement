// Public share data source for /s/:slug.
//
// Tier 2 ("hard lock") rollout: try the NEW `get_surprise_by_slug_v2` RPC
// first. Until the owner applies supabase/proposals/countdown-hard-lock.sql
// it does not exist (PostgREST 404 / PGRST202), so we transparently fall back
// to the existing `get_surprise_by_slug` — nothing breaks before the SQL.
//
// The v2 payload is `{ locked: boolean, server_now: ISO, config }`. When
// `locked` is true the config is REDACTED server-side (name/theme/countdown
// only). The client never relies on its own checks for protection.
import type { SurpriseConfig } from "@/lib/v2/schema";
import { supabasePublicRest } from "@/lib/supabase";
import { computeOffset, offsetFromDateHeader, type OffsetSample } from "./engine";

export type LockTier = "hard" | "soft";

export interface PublicSurpriseResult {
  config: SurpriseConfig | null;
  /** Only meaningful for tier "hard": server says content is still withheld. */
  locked: boolean;
  tier: LockTier;
  /** Trusted server time sample from this response, when available. */
  timeSample: (OffsetSample & { source: "rpc" | "date-header"; serverMs: number; perfMid: number }) | null;
}

let v2Missing = false;
/** Test hook: reset the memoized "v2 missing" flag. */
export function __resetV2Probe() { v2Missing = false; }

const perfNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

async function callRpc(fn: string, slug: string, signal?: AbortSignal) {
  const t0 = perfNow();
  const res = await fetch(`${supabasePublicRest.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: supabasePublicRest.anonKey,
      Authorization: `Bearer ${supabasePublicRest.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_slug: slug }),
    cache: "no-store",
    signal,
  });
  const t1 = perfNow();
  return { res, t0, t1 };
}

function rowOf(data: unknown): Record<string, unknown> | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
}

export async function fetchPublicSurprise(slug: string, signal?: AbortSignal): Promise<PublicSurpriseResult> {
  if (!v2Missing) {
    const { res, t0, t1 } = await callRpc("get_surprise_by_slug_v2", slug, signal);
    if (res.status === 404) {
      v2Missing = true;
    } else {
      if (!res.ok) throw new Error(`rpc-v2-${res.status}`);
      const row = rowOf(await res.json().catch(() => null));
      // A v2 response is recognised only by an explicit boolean `locked`.
      if (row && typeof row.locked === "boolean") {
        const serverMs = typeof row.server_now === "string" ? Date.parse(row.server_now) : NaN;
        const sample = Number.isFinite(serverMs) ? computeOffset(t0, serverMs, t1) : null;
        return {
          config: (row.config as SurpriseConfig | undefined) ?? null,
          locked: row.locked,
          tier: "hard",
          timeSample: sample ? { ...sample, source: "rpc", serverMs, perfMid: (t0 + t1) / 2 } : null,
        };
      }
      // Some other shape (e.g. a mock or proxy): treat as the legacy payload.
      return { config: (row?.config as SurpriseConfig | undefined) ?? null, locked: false, tier: "soft", timeSample: dateSample(res, t0, t1) };
    }
  }
  const { res, t0, t1 } = await callRpc("get_surprise_by_slug", slug, signal);
  if (!res.ok) throw new Error(`rpc-${res.status}`);
  const row = rowOf(await res.json().catch(() => null));
  return { config: (row?.config as SurpriseConfig | undefined) ?? null, locked: false, tier: "soft", timeSample: dateSample(res, t0, t1) };
}

function dateSample(res: Response, t0: number, t1: number): PublicSurpriseResult["timeSample"] {
  // `Date` is not CORS-safelisted; this only works if the API exposes it.
  const s = offsetFromDateHeader(res.headers.get("date"), t0, t1);
  if (!s) return null;
  const serverMs = s.offsetMs + (t0 + t1) / 2;
  return { ...s, source: "date-header", serverMs, perfMid: (t0 + t1) / 2 };
}
