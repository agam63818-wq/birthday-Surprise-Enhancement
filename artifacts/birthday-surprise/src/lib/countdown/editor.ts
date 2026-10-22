// Pure helpers for the Customize countdown card (unit-tested).
import type { CountdownConfig } from "@/lib/v2/schema";
import { DEFAULT_COUNTDOWN_TIMEZONE } from "./defaults";
import { resolveWallTime, wallTimeInZone } from "../../../supabase/functions/_shared/countdownTime";

/**
 * Apply a schedule edit (date/time/zone) and re-derive unlockAtUtc.
 * `ambiguousChoice` picks the earlier/later instant in a DST overlap.
 * Invalid/nonexistent input keeps the wall inputs but clears unlockAtUtc
 * so validation blocks saving while ON (never a silent wrong instant).
 */
export function withSchedule(
  current: CountdownConfig | undefined,
  edit: Partial<Pick<CountdownConfig, "localDate" | "localTime" | "timezone">>,
  ambiguousChoice: "earlier" | "later" = "earlier",
): CountdownConfig {
  const next: CountdownConfig = { ...current, ...edit };
  const tz = next.timezone || DEFAULT_COUNTDOWN_TIMEZONE;
  if (!next.timezone) next.timezone = tz;
  if (!next.localDate || !next.localTime) { delete next.unlockAtUtc; return next; }
  const r = resolveWallTime(next.localDate, next.localTime, tz);
  if (r.status === "ok") next.unlockAtUtc = new Date(r.utcMs).toISOString();
  else if (r.status === "ambiguous") next.unlockAtUtc = new Date(ambiguousChoice === "later" ? r.candidates[1] : r.candidates[0]).toISOString();
  else delete next.unlockAtUtc;
  return next;
}

/** Schedule = "now" (rounded down to the minute) in the creator's zone. */
export function unlockNowPatch(current: CountdownConfig | undefined, nowMs = Date.now()): CountdownConfig {
  const tz = current?.timezone || DEFAULT_COUNTDOWN_TIMEZONE;
  const minute = Math.floor(nowMs / 60_000) * 60_000;
  const wall = wallTimeInZone(minute, tz);
  return { ...current, timezone: tz, localDate: wall.localDate, localTime: wall.localTime, unlockAtUtc: new Date(minute).toISOString() };
}

/** A friendly default schedule: tomorrow at 00:00 in the zone. */
export function defaultSchedule(tz: string, nowMs = Date.now()): Pick<CountdownConfig, "localDate" | "localTime"> {
  const wall = wallTimeInZone(nowMs + 86_400_000, tz);
  return { localDate: wall.localDate, localTime: "00:00" };
}

/** Reset only this feature's settings; keeps nothing else in config. */
export function resetCountdown(): CountdownConfig {
  return { enabled: false, timezone: DEFAULT_COUNTDOWN_TIMEZONE };
}
