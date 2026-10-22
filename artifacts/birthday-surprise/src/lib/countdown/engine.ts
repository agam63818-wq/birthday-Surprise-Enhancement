// Scheduled Surprise Countdown — pure engine (no React, no DOM).
// Stage machine, remaining time, server-offset math, display strings and the
// once-only reveal guard. Fully unit-tested.
import { resolveWallTime, wallTimeInZone, type WallResolution } from "../../../supabase/functions/_shared/countdownTime";

export { resolveWallTime, wallTimeInZone };
export type { WallResolution };

export type CountdownStage = "locked" | "final3" | "final2" | "final1" | "reveal" | "unlocked";

export interface Remaining { totalMs: number; days: number; hours: number; minutes: number; seconds: number; ms: number }

/** Remaining time until `unlockAtMs` given a trusted `nowMs`. Never negative. */
export function remainingParts(unlockAtMs: number, nowMs: number): Remaining {
  const totalMs = Math.max(0, unlockAtMs - nowMs);
  // Display ceil-to-second so "00:00:01" shows until the instant itself.
  const totalSec = Math.ceil(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSec / 86_400),
    hours: Math.floor((totalSec % 86_400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    ms: totalMs % 1000,
  };
}

/** Duration of the reveal transition after zero (never delays the unlock itself). */
export const REVEAL_MS = 1200;

/**
 * Stage at trusted time `nowMs`. The final numerals are shown in the three
 * whole seconds before the instant: (3s..2s] -> final3, (2s..1s] -> final2,
 * (1s..0) -> final1. At/after the instant -> reveal, then unlocked.
 */
export function stageAt(unlockAtMs: number, nowMs: number): CountdownStage {
  const left = unlockAtMs - nowMs;
  if (left > 3000) return "locked";
  if (left > 2000) return "final3";
  if (left > 1000) return "final2";
  if (left > 0) return "final1";
  if (left > -REVEAL_MS) return "reveal";
  return "unlocked";
}

/** Milliseconds until the next stage/second boundary (for aligned ticks). */
export function msUntilNextBoundary(unlockAtMs: number, nowMs: number): number {
  const left = unlockAtMs - nowMs;
  if (left <= 0) return Math.max(16, REVEAL_MS + left);
  const rem = left % 1000;
  return rem === 0 ? 1000 : rem;
}

// ── Trusted server time ──────────────────────────────────────────────────
export interface OffsetSample { offsetMs: number; rttMs: number }

/**
 * NTP-style offset with RTT midpoint compensation: the server stamped
 * `serverMs` roughly half-way between our send (t0) and receive (t1).
 */
export function computeOffset(t0: number, serverMs: number, t1: number): OffsetSample {
  const rttMs = Math.max(0, t1 - t0);
  return { offsetMs: serverMs - (t0 + rttMs / 2), rttMs };
}

/** Prefer the sample with the lowest RTT (most precise). */
export function bestOffset(samples: OffsetSample[]): OffsetSample | null {
  if (!samples.length) return null;
  return samples.reduce((a, b) => (b.rttMs < a.rttMs ? b : a));
}

/** HTTP `Date` header has 1s resolution; centre it within that second. */
export function offsetFromDateHeader(header: string | null | undefined, t0: number, t1: number): OffsetSample | null {
  if (!header) return null;
  const ms = Date.parse(header);
  if (!Number.isFinite(ms)) return null;
  const s = computeOffset(t0, ms + 500, t1);
  return { offsetMs: s.offsetMs, rttMs: s.rttMs + 1000 };
}

// ── Display helpers ──────────────────────────────────────────────────────
export function formatUnlockMoment(unlockAtMs: number, timeZone: string, locale = "en-GB"): string {
  try {
    const date = new Intl.DateTimeFormat(locale, { timeZone, weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(unlockAtMs);
    const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(unlockAtMs);
    const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(unlockAtMs).find(p => p.type === "timeZoneName")?.value ?? timeZone;
    return `${date}, ${time} ${zone === "GMT+5:30" ? "IST" : zone}`;
  } catch {
    return new Date(unlockAtMs).toISOString();
  }
}

export function formatRelative(totalMs: number): string {
  if (totalMs <= 0) return "now";
  const r = remainingParts(totalMs, 0);
  if (r.days > 0) return `in ${r.days}d ${r.hours}h`;
  if (r.hours > 0) return `in ${r.hours}h ${r.minutes}m`;
  if (r.minutes > 0) return `in ${r.minutes}m ${r.seconds}s`;
  return `in ${r.seconds}s`;
}

/** Screen-reader milestone text, or null when nothing should be announced. */
export function milestoneAnnouncement(prevSec: number | null, nextSec: number): string | null {
  if (prevSec === nextSec) return null;
  if (nextSec === 10) return "10 seconds left";
  if (nextSec <= 3 && nextSec >= 1) return String(nextSec);
  if (nextSec === 0) return "The surprise is opening";
  if (nextSec > 10 && nextSec % 60 === 0) {
    const mins = nextSec / 60;
    if (mins >= 1440 && mins % 1440 === 0) return `${mins / 1440} ${mins === 1440 ? "day" : "days"} left`;
    if (mins >= 60 && mins % 60 === 0) return `${mins / 60} ${mins === 60 ? "hour" : "hours"} left`;
    if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} left`;
  }
  return null;
}

// ── Schedule validation for the editor ───────────────────────────────────
export type ScheduleCheck =
  | { level: "error"; code: "missing" | "invalid" | "nonexistent"; message: string }
  | { level: "ambiguous"; candidates: [number, number]; message: string }
  | { level: "past"; utcMs: number; message: string }
  | { level: "ok"; utcMs: number };

export function checkSchedule(localDate: string | undefined, localTime: string | undefined, timeZone: string, nowMs: number): ScheduleCheck {
  if (!localDate || !localTime) return { level: "error", code: "missing", message: "Pick a date and a time for the unlock." };
  const r = resolveWallTime(localDate, localTime, timeZone);
  if (r.status === "invalid") return { level: "error", code: "invalid", message: r.reason === "timezone" ? "Choose a valid timezone." : `That ${r.reason} is not valid.` };
  if (r.status === "nonexistent") return { level: "error", code: "nonexistent", message: "That time is skipped by a daylight-saving change in this timezone. Pick another time." };
  if (r.status === "ambiguous") return { level: "ambiguous", candidates: r.candidates, message: "That time happens twice (daylight-saving ends). Choose which one." };
  if (r.utcMs <= nowMs) return { level: "past", utcMs: r.utcMs, message: "This time has already passed — recipients will get the surprise immediately." };
  return { level: "ok", utcMs: r.utcMs };
}

// ── Once-only reveal guard (UX only — NEVER a security boundary) ─────────
export interface KVStore { getItem(k: string): string | null; setItem(k: string, v: string): void }

export function revealKey(slug: string, unlockAtUtc: string): string {
  return `countdown-revealed:${slug}:${unlockAtUtc}`;
}

export function createRevealGuard(store: KVStore | null, slug: string, unlockAtUtc: string) {
  const key = revealKey(slug, unlockAtUtc);
  let memo = false;
  return {
    hasPlayed(): boolean {
      if (memo) return true;
      try { return store?.getItem(key) === "1"; } catch { return false; }
    },
    /** Returns true exactly once per slug+unlockAt. */
    claim(): boolean {
      if (this.hasPlayed()) return false;
      memo = true;
      try { store?.setItem(key, "1"); } catch { /* storage unavailable */ }
      return true;
    },
  };
}

/** Pick only the stages still ahead (e.g. opened with 2s left -> final2, final1, reveal). */
export function remainingStages(unlockAtMs: number, nowMs: number): CountdownStage[] {
  const order: CountdownStage[] = ["final3", "final2", "final1", "reveal"];
  const current = stageAt(unlockAtMs, nowMs);
  if (current === "locked") return order;
  if (current === "unlocked") return [];
  return order.slice(order.indexOf(current));
}
