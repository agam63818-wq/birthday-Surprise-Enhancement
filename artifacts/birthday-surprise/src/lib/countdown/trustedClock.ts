// Trusted clock for the countdown gate.
//
// trustedNow() = serverMs + (performance.now() - perfAtServerMs)
//
// It is anchored to the MONOTONIC performance clock, not Date.now(), so a
// recipient changing their device clock cannot move the unlock moment once
// a trusted sample exists. Sources, best first:
//   (a) `server_now` from the hard-lock RPC (Tier 2)
//   (b) GET /api/server-time  ({ now }, Cache-Control: no-store)
//       — or the HTTP Date header of the Supabase response, if exposed
//   (c) device clock — flagged "untrusted" in diagnostics
// Re-measured periodically and on visibility return (sleep can pause the
// monotonic clock on some platforms).
import { bestOffset, computeOffset } from "./engine";

export type ClockSource = "rpc" | "server-time" | "date-header" | "device";

export interface ClockSample { serverMs: number; perfMid: number; rttMs: number; source: ClockSource }

const perfNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const SOURCE_RANK: Record<ClockSource, number> = { rpc: 0, "server-time": 1, "date-header": 2, device: 3 };

export class TrustedClock {
  private sample: ClockSample | null = null;
  private window: ClockSample[] = [];
  private stale = false;

  get source(): ClockSource { return this.sample?.source ?? "device"; }
  get trusted(): boolean { return !!this.sample && this.sample.source !== "device"; }
  get rttMs(): number | null { return this.sample?.rttMs ?? null; }

  /** Trusted current epoch ms. */
  now(): number {
    if (!this.sample) return Date.now();
    return this.sample.serverMs + (perfNow() - this.sample.perfMid);
  }

  /** Feed a new server sample. Better sources win; within a source, lowest RTT of recent samples. */
  accept(s: ClockSample): void {
    if (!Number.isFinite(s.serverMs) || !Number.isFinite(s.perfMid) || s.source === "device") return;
    const cur = this.sample;
    if (!cur || this.stale || SOURCE_RANK[s.source] < SOURCE_RANK[cur.source]) {
      this.sample = s; this.window = [s]; this.stale = false; return;
    }
    if (SOURCE_RANK[s.source] > SOURCE_RANK[cur.source]) return;
    this.window.push(s);
    if (this.window.length > 5) this.window.shift();
    const best = bestOffset(this.window.map(w => ({ offsetMs: w.serverMs - w.perfMid, rttMs: w.rttMs, w })));
    if (best) this.sample = (best as unknown as { w: ClockSample }).w;
  }

  /**
   * Mark existing samples stale (tab was hidden / device may have slept and
   * paused the monotonic clock). The next sample of any trusted source
   * replaces the anchor. Until then the old anchor keeps ticking.
   */
  markStale(): void { this.stale = true; }

  diagnostics() {
    return { source: this.source, trusted: this.trusted, rttMs: this.rttMs, skewVsDeviceMs: Math.round(this.now() - Date.now()) };
  }
}

/** Measure via the additive Vercel function `/api/server-time`. */
export async function measureServerTime(fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<ClockSample | null> {
  try {
    const t0 = perfNow();
    const res = await fetchImpl(`/api/server-time?t=${Math.round(t0)}`, { cache: "no-store", signal });
    const t1 = perfNow();
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return null;
    const body = (await res.json()) as { now?: unknown };
    const serverMs = typeof body.now === "number" ? body.now : typeof body.now === "string" ? Date.parse(body.now) : NaN;
    if (!Number.isFinite(serverMs)) return null;
    const { rttMs } = computeOffset(t0, serverMs, t1);
    return { serverMs, perfMid: (t0 + t1) / 2, rttMs, source: "server-time" };
  } catch {
    return null;
  }
}
