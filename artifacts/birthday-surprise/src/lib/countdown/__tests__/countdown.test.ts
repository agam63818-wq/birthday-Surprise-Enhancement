import { describe, expect, it } from "vitest";
import defaultConfig from "@/config";
import { normalizeConfig, promoteToCinematic } from "@/lib/v2/migrate";
import type { SurpriseConfig } from "@/lib/v2/schema";
import { resolveWallTime, wallTimeInZone, isValidTimeZone, parseUtcIso } from "../../../../supabase/functions/_shared/countdownTime";
import { validateCountdown } from "../../../../supabase/functions/_shared/countdownConfig";
import { applyConfigPatch, validatePatch, validateV2Config, PATCH_PATHS } from "../../../../supabase/functions/_shared/configPatch";
import {
  remainingParts, stageAt, computeOffset, bestOffset, offsetFromDateHeader, checkSchedule,
  createRevealGuard, remainingStages, milestoneAnnouncement, formatUnlockMoment, msUntilNextBoundary,
} from "../engine";
import { resolveCountdownFor, countdownActive } from "../defaults";
import { withSchedule, unlockNowPatch, resetCountdown } from "../editor";
import { initialGateDecision } from "../gateDecision";
import { TrustedClock } from "../trustedClock";
import { CountdownTicker } from "../ticker";

const iso = (ms: number) => new Date(ms).toISOString();

describe("timezone conversion", () => {
  it("Asia/Kolkata (+05:30, no DST)", () => {
    const r = resolveWallTime("2026-10-25", "00:00", "Asia/Kolkata");
    expect(r).toEqual({ status: "ok", utcMs: Date.parse("2026-10-24T18:30:00Z") });
    expect(wallTimeInZone(Date.parse("2026-10-24T18:30:00Z"), "Asia/Kolkata")).toEqual({ localDate: "2026-10-25", localTime: "00:00" });
  });
  it("America/New_York DST gap (spring forward) is nonexistent", () => {
    expect(resolveWallTime("2026-03-08", "02:30", "America/New_York")).toEqual({ status: "nonexistent" });
    expect(resolveWallTime("2026-03-08", "03:30", "America/New_York")).toEqual({ status: "ok", utcMs: Date.parse("2026-03-08T07:30:00Z") });
  });
  it("America/New_York DST overlap (fall back) is ambiguous with both instants", () => {
    const r = resolveWallTime("2026-11-01", "01:30", "America/New_York");
    expect(r).toEqual({ status: "ambiguous", candidates: [Date.parse("2026-11-01T05:30:00Z"), Date.parse("2026-11-01T06:30:00Z")] });
  });
  it("Pacific/Auckland (+13 in southern summer, +12 in winter)", () => {
    expect(resolveWallTime("2026-01-15", "09:00", "Pacific/Auckland")).toEqual({ status: "ok", utcMs: Date.parse("2026-01-14T20:00:00Z") });
    expect(resolveWallTime("2026-07-15", "09:00", "Pacific/Auckland")).toEqual({ status: "ok", utcMs: Date.parse("2026-07-14T21:00:00Z") });
  });
  it("rejects invalid inputs", () => {
    expect(resolveWallTime("2026-02-30", "10:00", "UTC")).toEqual({ status: "invalid", reason: "date" });
    expect(resolveWallTime("2026-02-10", "24:00", "UTC")).toEqual({ status: "invalid", reason: "time" });
    expect(resolveWallTime("2026-02-10", "10:00", "Mars/Olympus")).toEqual({ status: "invalid", reason: "timezone" });
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("<script>")).toBe(false);
    expect(parseUtcIso("2026-10-24T18:30:00.000Z")).toBe(Date.parse("2026-10-24T18:30:00Z"));
    expect(parseUtcIso("2026-10-24 18:30")).toBeNull();
  });
});

describe("schedule validation (editor)", () => {
  const now = Date.parse("2026-10-22T10:00:00Z");
  it("missing / invalid / nonexistent are blocking errors", () => {
    expect(checkSchedule("", "10:00", "UTC", now)).toMatchObject({ level: "error", code: "missing" });
    expect(checkSchedule("2026-13-01", "10:00", "UTC", now)).toMatchObject({ level: "error", code: "invalid" });
    expect(checkSchedule("2026-03-08", "02:30", "America/New_York", now)).toMatchObject({ level: "error", code: "nonexistent" });
  });
  it("past is a warning (never silently reset), future ok, overlap ambiguous", () => {
    expect(checkSchedule("2026-10-01", "10:00", "UTC", now)).toMatchObject({ level: "past" });
    expect(checkSchedule("2026-10-25", "00:00", "Asia/Kolkata", now)).toMatchObject({ level: "ok" });
    expect(checkSchedule("2026-11-01", "01:30", "America/New_York", now)).toMatchObject({ level: "ambiguous" });
  });
});

describe("remaining time + stage machine", () => {
  const U = Date.parse("2026-10-25T00:00:00Z");
  it("breaks remaining into d/h/m/s with ceil-to-second display", () => {
    expect(remainingParts(U, U - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000)).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5 });
    expect(remainingParts(U, U - 400)).toMatchObject({ seconds: 1 });
    expect(remainingParts(U, U + 5000)).toMatchObject({ totalMs: 0, seconds: 0 });
  });
  it("stages at exact boundaries", () => {
    expect(stageAt(U, U - 3001)).toBe("locked");
    expect(stageAt(U, U - 3000)).toBe("final3");
    expect(stageAt(U, U - 2001)).toBe("final3");
    expect(stageAt(U, U - 2000)).toBe("final2");
    expect(stageAt(U, U - 1000)).toBe("final1");
    expect(stageAt(U, U - 1)).toBe("final1");
    expect(stageAt(U, U)).toBe("reveal");
    expect(stageAt(U, U + 1199)).toBe("reveal");
    expect(stageAt(U, U + 1200)).toBe("unlocked");
  });
  it("opened with 2s left shows only remaining stages; after unlock none", () => {
    expect(remainingStages(U, U - 1800)).toEqual(["final2", "final1", "reveal"]);
    expect(remainingStages(U, U - 60_000)).toEqual(["final3", "final2", "final1", "reveal"]);
    expect(remainingStages(U, U + 10_000)).toEqual([]);
  });
  it("ticks align to second boundaries", () => {
    expect(msUntilNextBoundary(U, U - 5250)).toBe(250);
    expect(msUntilNextBoundary(U, U - 5000)).toBe(1000);
  });
});

describe("once-only reveal guard (UX only)", () => {
  it("claims exactly once per slug+unlockAt and survives a new guard (refresh)", () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const g = createRevealGuard(store, "slug", "2026-10-25T00:00:00.000Z");
    expect(g.claim()).toBe(true);
    expect(g.claim()).toBe(false);
    expect(createRevealGuard(store, "slug", "2026-10-25T00:00:00.000Z").hasPlayed()).toBe(true);
    expect(createRevealGuard(store, "slug", "2026-10-26T00:00:00.000Z").hasPlayed()).toBe(false);
  });
  it("works when storage throws", () => {
    const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    const g = createRevealGuard(bad, "s", "u");
    expect(g.claim()).toBe(true);
    expect(g.claim()).toBe(false);
  });
});

describe("server offset math", () => {
  it("compensates RTT using the midpoint", () => {
    expect(computeOffset(1000, 6100, 1200)).toEqual({ offsetMs: 5000, rttMs: 200 });
    expect(bestOffset([{ offsetMs: 1, rttMs: 300 }, { offsetMs: 2, rttMs: 40 }, { offsetMs: 3, rttMs: 90 }])).toEqual({ offsetMs: 2, rttMs: 40 });
    expect(offsetFromDateHeader("Thu, 22 Oct 2026 10:00:00 GMT", 0, 100)?.rttMs).toBe(1100);
    expect(offsetFromDateHeader("garbage", 0, 1)).toBeNull();
  });
  it("TrustedClock keeps the trusted instant when the device clock changes", () => {
    const clock = new TrustedClock();
    const perf = performance.now();
    clock.accept({ serverMs: 1_000_000, perfMid: perf, rttMs: 20, source: "server-time" });
    const before = clock.now();
    const realNow = Date.now;
    Date.now = () => realNow() + 10 * 86_400_000; // user moves their clock +10 days
    try { expect(Math.abs(clock.now() - before)).toBeLessThan(1000); }
    finally { Date.now = realNow; }
    expect(clock.trusted).toBe(true);
    expect(clock.source).toBe("server-time");
  });
  it("prefers the RPC source over server-time and replaces stale anchors", () => {
    const clock = new TrustedClock();
    const p = performance.now();
    clock.accept({ serverMs: 5000, perfMid: p, rttMs: 10, source: "server-time" });
    clock.accept({ serverMs: 9000, perfMid: p, rttMs: 500, source: "rpc" });
    expect(clock.source).toBe("rpc");
    clock.accept({ serverMs: 1, perfMid: p, rttMs: 1, source: "server-time" });
    expect(clock.source).toBe("rpc");
    clock.markStale();
    clock.accept({ serverMs: 20_000, perfMid: p, rttMs: 900, source: "server-time" });
    expect(clock.source).toBe("server-time");
  });
});

describe("ticker", () => {
  it("emits only on second/stage change and respects schedule extensions", () => {
    let now = 0;
    const t = new CountdownTicker({ now: () => now }, 10_000);
    let emits = 0; t.subscribe(() => emits++);
    expect(t.getSnapshot()).toMatchObject({ sec: 10, stage: "locked" });
    now = 100; t.resync(); expect(emits).toBe(0);
    now = 1001; t.resync(); expect(t.getSnapshot().sec).toBe(9); expect(emits).toBe(1);
    t.setUnlock(60_000); expect(t.getSnapshot()).toMatchObject({ sec: 59, stage: "locked" });
    t.stop();
  });
});

describe("a11y milestones", () => {
  it("announces sparingly", () => {
    expect(milestoneAnnouncement(61, 60)).toBe("1 minute left");
    expect(milestoneAnnouncement(3601, 3600)).toBe("1 hour left");
    expect(milestoneAnnouncement(59, 58)).toBeNull();
    expect(milestoneAnnouncement(11, 10)).toBe("10 seconds left");
    expect(milestoneAnnouncement(3, 2)).toBe("2");
    expect(milestoneAnnouncement(1, 0)).toBe("The surprise is opening");
  });
  it("formats the moment in the creator zone (IST label)", () => {
    expect(formatUnlockMoment(Date.parse("2026-10-24T18:30:00Z"), "Asia/Kolkata")).toMatch(/^Sunday,? 25 Oct 2026, 00:00 IST$/);
  });
});

describe("config contract: legacy configs unchanged", () => {
  it("normalizeConfig output is byte-identical without countdown (v1 and v2)", () => {
    const v1 = structuredClone(defaultConfig) as SurpriseConfig;
    const v2 = promoteToCinematic(structuredClone(defaultConfig));
    for (const cfg of [v1, v2]) {
      const n = normalizeConfig(cfg);
      expect(JSON.stringify(n)).not.toContain("countdown");
      expect(countdownActive(cfg)).toBe(false);
      expect(() => validateV2Config(cfg)).not.toThrow();
    }
  });
  it("defaults resolve sensibly (recipient name, IST, style from theme)", () => {
    const r = resolveCountdownFor({ ...structuredClone(defaultConfig), name: "Aanya", themeId: "champagne" } as SurpriseConfig);
    expect(r).toMatchObject({ enabled: false, timezone: "Asia/Kolkata", recipientName: "Aanya", afterUnlock: "autoOpen", soundEnabled: false, showTeaserButton: false, style: "velvet" });
  });
  it("gate decision: OFF / past -> experience, future / hard-locked -> gate", () => {
    const now = Date.parse("2026-10-22T10:00:00Z");
    const base = structuredClone(defaultConfig) as SurpriseConfig;
    expect(initialGateDecision(base, false, now)).toBe("experience");
    expect(initialGateDecision({ ...base, countdown: { enabled: false, unlockAtUtc: iso(now + 9e6) } }, false, now)).toBe("experience");
    expect(initialGateDecision({ ...base, countdown: { enabled: true, unlockAtUtc: iso(now + 9e6) } }, false, now)).toBe("gate");
    expect(initialGateDecision({ ...base, countdown: { enabled: true, unlockAtUtc: iso(now - 1) } }, false, now)).toBe("experience");
    expect(initialGateDecision(base, true, now)).toBe("gate");
  });
});

describe("validators + AI patch", () => {
  const good = { enabled: true, timezone: "Asia/Kolkata", localDate: "2026-10-25", localTime: "19:00", unlockAtUtc: "2026-10-25T13:30:00.000Z", heading: "Soon" };
  it("accepts a consistent schedule for v1 AND v2 records", () => {
    expect(() => validateCountdown(good)).not.toThrow();
    expect(() => validateV2Config({ ...structuredClone(defaultConfig), countdown: good })).not.toThrow();
    expect(() => validateV2Config({ ...promoteToCinematic(structuredClone(defaultConfig)), countdown: good })).not.toThrow();
  });
  it("rejects markup, unknown keys, overlong text, inconsistent or missing schedule", () => {
    expect(() => validateCountdown({ ...good, heading: "<img src=x onerror=alert(1)>" })).toThrow();
    expect(() => validateCountdown({ ...good, evil: 1 })).toThrow();
    expect(() => validateCountdown({ ...good, message: "x".repeat(601) })).toThrow();
    expect(() => validateCountdown({ ...good, unlockAtUtc: "2026-10-25T14:30:00.000Z" })).toThrow(/inconsistent/);
    expect(() => validateCountdown({ enabled: true })).toThrow(/no valid unlock/);
    expect(() => validateCountdown({ enabled: false })).not.toThrow();
    expect(() => validateV2Config({ ...structuredClone(defaultConfig), countdown: { enabled: true } })).toThrow();
  });
  it("AI: 'schedule it for 25 Oct 7pm IST' derives unlockAtUtc and preserves unrelated config", () => {
    const base = promoteToCinematic(structuredClone(defaultConfig));
    const next = applyConfigPatch(base, { changes: [
      { path: "countdown.enabled", value: true },
      { path: "countdown.localDate", value: "2026-10-25" },
      { path: "countdown.localTime", value: "19:00" },
      { path: "countdown.timezone", value: "Asia/Kolkata" },
    ] });
    expect(next.countdown?.unlockAtUtc).toBe("2026-10-25T13:30:00.000Z");
    const { countdown, ...rest } = next;
    expect(rest).toEqual(base);
    expect(countdown?.enabled).toBe(true);
  });
  it("AI: message change / turn off touch only the countdown slice", () => {
    const base = { ...promoteToCinematic(structuredClone(defaultConfig)), countdown: good } as SurpriseConfig;
    const msg = applyConfigPatch(base, { changes: [{ path: "countdown.message", value: "Almost time!" }] });
    expect(msg.countdown).toEqual({ ...good, message: "Almost time!" });
    const off = applyConfigPatch(base, { changes: [{ path: "countdown.enabled", value: false }] });
    expect(off.countdown).toEqual({ ...good, enabled: false });
  });
  it("AI cannot set unlockAtUtc directly, enable without a date, or inject markup", () => {
    expect(PATCH_PATHS).not.toContain("countdown.unlockAtUtc");
    expect(() => validatePatch({ changes: [{ path: "countdown.unlockAtUtc", value: "2026-10-25T13:30:00.000Z" }] })).toThrow();
    expect(() => applyConfigPatch(structuredClone(defaultConfig), { changes: [{ path: "countdown.enabled", value: true }] })).toThrow();
    expect(() => validatePatch({ changes: [{ path: "countdown.heading", value: "<b>x</b>" }] })).toThrow();
    expect(() => applyConfigPatch(structuredClone(defaultConfig), { changes: [{ path: "countdown.localDate", value: "2026-03-08" }, { path: "countdown.localTime", value: "02:30" }, { path: "countdown.timezone", value: "America/New_York" }] })).toThrow(/does not exist/);
  });
});

describe("editor helpers", () => {
  it("withSchedule derives, handles overlap choice, clears on gap", () => {
    expect(withSchedule({}, { localDate: "2026-10-25", localTime: "00:00" }).unlockAtUtc).toBe("2026-10-24T18:30:00.000Z");
    const later = withSchedule({ timezone: "America/New_York" }, { localDate: "2026-11-01", localTime: "01:30" }, "later");
    expect(later.unlockAtUtc).toBe("2026-11-01T06:30:00.000Z");
    expect(() => validateCountdown({ ...later, enabled: true })).not.toThrow();
    expect(withSchedule({ timezone: "America/New_York", unlockAtUtc: "x" }, { localDate: "2026-03-08", localTime: "02:30" }).unlockAtUtc).toBeUndefined();
  });
  it("unlockNowPatch is consistent and reset keeps only the feature", () => {
    const p = unlockNowPatch({ enabled: true, heading: "Hi" }, Date.parse("2026-10-22T10:00:42Z"));
    expect(p).toMatchObject({ heading: "Hi", enabled: true, localDate: "2026-10-22", localTime: "15:30", unlockAtUtc: "2026-10-22T10:00:00.000Z" });
    expect(() => validateCountdown(p)).not.toThrow();
    expect(resetCountdown()).toEqual({ enabled: false, timezone: "Asia/Kolkata" });
  });
});
