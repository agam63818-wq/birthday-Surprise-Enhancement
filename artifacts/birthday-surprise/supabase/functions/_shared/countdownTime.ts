/**
 * Scheduled Surprise Countdown — pure, dependency-free time math.
 *
 * Shared by the browser (Customize editor, CountdownGate, validators) and by
 * the Deno edge function bundle (via configPatch.ts). Uses only `Intl` and
 * `Date.UTC` — no date library, no DOM, no React.
 *
 * REQUIRES MANUAL `supabase functions deploy` after changes before the
 * deployed AI assistant uses the updated logic (it bundles this file).
 */

export const COUNTDOWN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const COUNTDOWN_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Strict UTC ISO-8601 instant, e.g. 2026-10-25T13:30:00.000Z */
export const COUNTDOWN_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/;
const TZ_RE = /^(?:UTC|[A-Za-z][A-Za-z_]*(?:\/[A-Za-z0-9_+\-]+){1,2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length > 64 || !TZ_RE.test(tz)) return false;
  try { formatter(tz); return true; } catch { return false; }
}

export interface WallParts { year: number; month: number; day: number; hour: number; minute: number; second: number }

/** Wall-clock parts of the instant `ms` as seen in `timeZone`. */
export function wallPartsInZone(ms: number, timeZone: string): WallParts {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  // Some engines render midnight as "24" even with h23.
  const hour = out.hour === 24 ? 0 : out.hour;
  return { year: out.year, month: out.month, day: out.day, hour, minute: out.minute, second: out.second };
}

/** UTC offset (ms) in effect in `timeZone` at instant `ms`. */
export function zoneOffsetMs(ms: number, timeZone: string): number {
  const p = wallPartsInZone(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (ms - (((ms % 1000) + 1000) % 1000));
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** The wall date/time ("YYYY-MM-DD", "HH:mm") of an instant in a zone. */
export function wallTimeInZone(ms: number, timeZone: string): { localDate: string; localTime: string } {
  const p = wallPartsInZone(ms, timeZone);
  return { localDate: `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`, localTime: `${pad(p.hour)}:${pad(p.minute)}` };
}

export type WallResolution =
  | { status: "ok"; utcMs: number }
  /** DST overlap: the wall time happens twice. Both candidates, earliest first. */
  | { status: "ambiguous"; candidates: [number, number] }
  /** DST gap: the wall time never happens on that day in that zone. */
  | { status: "nonexistent" }
  | { status: "invalid"; reason: "date" | "time" | "timezone" };

/**
 * Convert a creator's wall time (date + 24h time) in an IANA zone to the
 * authoritative UTC instant. Detects DST gaps and overlaps explicitly
 * instead of silently shifting the moment.
 */
export function resolveWallTime(localDate: string, localTime: string, timeZone: string): WallResolution {
  if (!isValidTimeZone(timeZone)) return { status: "invalid", reason: "timezone" };
  if (typeof localDate !== "string" || !COUNTDOWN_DATE_RE.test(localDate)) return { status: "invalid", reason: "date" };
  if (typeof localTime !== "string" || !COUNTDOWN_TIME_RE.test(localTime)) return { status: "invalid", reason: "time" };
  const [y, m, d] = localDate.split("-").map(Number);
  const [hh, mm] = localTime.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const check = new Date(guess);
  if (y < 1970 || y > 9999 || check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return { status: "invalid", reason: "date" };
  }
  const offsets = new Set([-86_400_000, -43_200_000, 0, 43_200_000, 86_400_000].map(delta => zoneOffsetMs(guess + delta, timeZone)));
  const matches = new Set<number>();
  for (const offset of offsets) {
    const candidate = guess - offset;
    const p = wallPartsInZone(candidate, timeZone);
    if (p.year === y && p.month === m && p.day === d && p.hour === hh && p.minute === mm) matches.add(candidate);
  }
  const sorted = [...matches].sort((a, b) => a - b);
  if (sorted.length === 0) return { status: "nonexistent" };
  if (sorted.length === 1) return { status: "ok", utcMs: sorted[0] };
  return { status: "ambiguous", candidates: [sorted[0], sorted[sorted.length - 1]] };
}

export function parseUtcIso(value: unknown): number | null {
  if (typeof value !== "string" || !COUNTDOWN_ISO_RE.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
