import { COUNTDOWN_DATE_RE, COUNTDOWN_TIME_RE, isValidTimeZone, parseUtcIso, resolveWallTime } from "./countdownTime.ts";
/**
 * Scheduled Surprise Countdown — shared config contract (browser + Deno).
 * Every field is optional/additive; absent `countdown` = feature OFF.
 *
 * REQUIRES MANUAL `supabase functions deploy` after changes before the
 * deployed AI assistant can use the countdown paths. Local validation is not
 * deployment.
 */
export const COUNTDOWN_AFTER_UNLOCK = ["autoOpen", "openButton"] as const;
export const COUNTDOWN_STYLES = ["aurora", "celestial", "velvet"] as const;
export const COUNTDOWN_LABEL_KEYS = ["days", "hours", "minutes", "seconds"] as const;

/** Plain-text caps (characters). Shared by validators, AI allowlist and the editor counters. */
export const COUNTDOWN_TEXT_LIMITS = {
  heading: 120,
  recipientName: 120,
  message: 600,
  waitingLine: 160,
  footer: 200,
  teaserLabel: 40,
  teaserReaction: 160,
  openButtonLabel: 60,
} as const;
export const COUNTDOWN_LABEL_LIMIT = 24;
export type CountdownTextField = keyof typeof COUNTDOWN_TEXT_LIMITS;

type Check = (v: unknown) => boolean;
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
/** Plain text only: no control chars, no markup, no script URLs. */
const plain = (max: number): Check => v => typeof v === "string" && v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v) &&
  !/<\s*\/?\s*[a-z][^>]*>/i.test(v) && !/(?:javascript|vbscript)\s*:/i.test(v);
const bool: Check = v => typeof v === "boolean";
const member = (values: readonly string[]): Check => v => typeof v === "string" && values.includes(v);

const labelChecks: Record<string, Check> = Object.fromEntries(COUNTDOWN_LABEL_KEYS.map(k => [k, plain(COUNTDOWN_LABEL_LIMIT)]));
const labels: Check = v => object(v) && Object.entries(v).every(([k, x]) => own(labelChecks, k) && labelChecks[k](x));

/** Leaf validators for every countdown field (path relative to `countdown`). */
export const COUNTDOWN_FIELD_CHECKS: Record<string, Check> = {
  enabled: bool,
  unlockAtUtc: v => parseUtcIso(v) !== null,
  timezone: isValidTimeZone,
  localDate: v => typeof v === "string" && COUNTDOWN_DATE_RE.test(v),
  localTime: v => typeof v === "string" && COUNTDOWN_TIME_RE.test(v),
  showTeaserButton: bool,
  soundEnabled: bool,
  afterUnlock: member(COUNTDOWN_AFTER_UNLOCK),
  style: member(COUNTDOWN_STYLES),
  labels,
  ...Object.fromEntries(Object.entries(COUNTDOWN_TEXT_LIMITS).map(([k, max]) => [k, plain(max)])),
};

/**
 * AI-patchable countdown paths. `unlockAtUtc` is intentionally NOT patchable:
 * it is always derived from localDate + localTime + timezone so the AI can
 * never produce an inconsistent schedule.
 */
export const COUNTDOWN_PATCH_CHECKS: Record<string, Check> = {};
for (const [key, check] of Object.entries(COUNTDOWN_FIELD_CHECKS)) {
  if (key === "unlockAtUtc" || key === "labels") continue;
  COUNTDOWN_PATCH_CHECKS[`countdown.${key}`] = check;
}
for (const k of COUNTDOWN_LABEL_KEYS) COUNTDOWN_PATCH_CHECKS[`countdown.labels.${k}`] = plain(COUNTDOWN_LABEL_LIMIT);

/** Throws a readable Error when `value` is not a valid countdown object. */
export function validateCountdown(value: unknown): void {
  if (value === undefined) return;
  if (!object(value)) throw new Error("Invalid countdown.");
  for (const [key, x] of Object.entries(value)) {
    if (!own(COUNTDOWN_FIELD_CHECKS, key) || !COUNTDOWN_FIELD_CHECKS[key](x)) throw new Error(`Invalid countdown.${key}.`);
  }
  const unlockMs = parseUtcIso(value.unlockAtUtc);
  if (value.enabled === true && unlockMs === null) throw new Error("Countdown is on but has no valid unlock date and time.");
  const { localDate, localTime, timezone } = value as Record<string, string | undefined>;
  if (unlockMs !== null && localDate && localTime) {
    const r = resolveWallTime(localDate, localTime, timezone ?? "Asia/Kolkata");
    const consistent = (r.status === "ok" && r.utcMs === unlockMs) || (r.status === "ambiguous" && r.candidates.includes(unlockMs));
    if (!consistent) throw new Error("Countdown schedule is inconsistent; pick the date and time again.");
  }
}

/**
 * Re-derive `unlockAtUtc` after a patch touched the wall time or zone.
 * Ambiguous (DST overlap) keeps the current instant if it is one of the two
 * candidates, else picks the earlier one. Gaps/invalid input throw.
 */
export function deriveCountdownUnlock(countdown: Record<string, unknown>): void {
  const { localDate, localTime } = countdown as Record<string, string | undefined>;
  if (!localDate || !localTime) return;
  const tz = typeof countdown.timezone === "string" ? countdown.timezone : "Asia/Kolkata";
  const r = resolveWallTime(localDate, localTime, tz);
  if (r.status === "ok") countdown.unlockAtUtc = new Date(r.utcMs).toISOString();
  else if (r.status === "ambiguous") {
    const current = parseUtcIso(countdown.unlockAtUtc);
    countdown.unlockAtUtc = new Date(current !== null && r.candidates.includes(current) ? current : r.candidates[0]).toISOString();
  } else throw new Error(r.status === "nonexistent" ? "That time does not exist in the selected timezone (daylight-saving jump)." : "Invalid countdown date, time or timezone.");
}

export const COUNTDOWN_PATCH_NOTES = `Countdown (scheduled unlock gate, works for v1 and v2): set countdown.localDate (YYYY-MM-DD), countdown.localTime (24h HH:mm) and countdown.timezone (IANA, default Asia/Kolkata; IST = Asia/Kolkata); unlockAtUtc is derived automatically and must never be returned. Turning it on requires a date and time (set countdown.enabled true together with localDate/localTime when not already set). "Turn the countdown off" = countdown.enabled false (keeps other settings). Text fields are plain text: heading, recipientName, message, waitingLine, footer, teaserLabel, teaserReaction, openButtonLabel, labels.days/hours/minutes/seconds. Booleans: showTeaserButton, soundEnabled. afterUnlock: autoOpen or openButton. style: ${COUNTDOWN_STYLES.join("/")}.`;
