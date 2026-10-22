// CountdownGate — the Scheduled Surprise Countdown sits IN FRONT of the
// experience (it is not a scene). Lazy-loaded: countdown-OFF visitors never
// download this chunk.
//
// OWNER-ONLY GUARANTEE: owner controls render only when the parent passes
// viewerMode="owner-preview". That prop is set exclusively by the
// authenticated Dashboard Preview. PublicShare hardcodes viewerMode="public".
// Nothing here reads URL params, cookies or storage to decide owner mode.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SurpriseConfig } from "@/lib/v2/schema";
import { resolveCountdownFor, countdownActive } from "@/lib/countdown/defaults";
import { createRevealGuard, formatUnlockMoment, REVEAL_MS, type CountdownStage } from "@/lib/countdown/engine";
import { CountdownTicker, type NowSource } from "@/lib/countdown/ticker";
import { CountdownSound, type CountdownCue } from "@/lib/countdown/sound";
import { TrustedClock, measureServerTime } from "@/lib/countdown/trustedClock";
import { fetchPublicSurprise, type LockTier, type PublicSurpriseResult } from "@/lib/countdown/publicSource";
import { parseUtcIso } from "../../../supabase/functions/_shared/countdownTime";
import CountdownScreen from "./CountdownScreen";
import { THEME_PRESETS } from "@/lib/themePresets";
import { normalizeConfig } from "@/lib/v2/migrate";

type View = "countdown" | "open-button" | "experience";
type OwnerPreview = "auto" | "locked" | "finale" | "unlocked";

interface CommonProps { children: (config: SurpriseConfig) => ReactNode }
export interface PublicGateProps extends CommonProps {
  viewerMode: "public";
  slug: string;
  initial: PublicSurpriseResult;
  clock: TrustedClock;
}
export interface OwnerGateProps extends CommonProps {
  viewerMode: "owner-preview";
  config: SurpriseConfig;
  /** Edits the DRAFT schedule to "now" (never publishes; the creator still Saves). */
  onUnlockForRecipientsNow?: () => void;
}
export type CountdownGateProps = PublicGateProps | OwnerGateProps;

function useReducedMotion(): boolean {
  const q = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [v, setV] = useState(() => !!q?.matches);
  useEffect(() => {
    if (!q) return;
    const on = () => setV(q.matches);
    q.addEventListener?.("change", on);
    return () => q.removeEventListener?.("change", on);
  }, [q]);
  return v;
}

const safeSession = (): Storage | null => { try { return window.sessionStorage; } catch { return null; } };
const FINAL_STAGES: CountdownStage[] = ["final3", "final2", "final1"];
const MAX_FULL_FETCH_ATTEMPTS = 6;

interface Diag { tier: LockTier | "preview"; clockSource: string; trustedClock: boolean; stage: CountdownStage; view: View; reveals: number; experienceMounts: number; refetches: number; soundContexts: number; soundLog: CountdownCue[]; soundState: string; unlockAtUtc: string; ownerControls: boolean }
declare global { interface Window { __countdownDiag?: Diag } }

export default function CountdownGate(props: CountdownGateProps) {
  const owner = props.viewerMode === "owner-preview";
  const reducedMotion = useReducedMotion();

  // ── Config: the latest known (possibly REDACTED) config ─────────────────
  const [liveConfig, setLiveConfig] = useState<SurpriseConfig | null>(owner ? (props as OwnerGateProps).config : (props as PublicGateProps).initial.config);
  const [tier, setTier] = useState<LockTier>(owner ? "soft" : (props as PublicGateProps).initial.tier);
  const lockedRef = useRef<boolean>(owner ? false : (props as PublicGateProps).initial.locked);
  const fullConfigRef = useRef<SurpriseConfig | null>(owner ? (props as OwnerGateProps).config : lockedRef.current ? null : (props as PublicGateProps).initial.config);
  useEffect(() => { if (owner) { setLiveConfig((props as OwnerGateProps).config); fullConfigRef.current = (props as OwnerGateProps).config; } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [owner, owner ? (props as OwnerGateProps).config : null]);

  const display = useMemo(() => resolveCountdownFor(liveConfig ?? ({} as SurpriseConfig)), [liveConfig]);
  // Same theme resolution as BirthdayExperience (works on the redacted payload too).
  const themeVars = useMemo(() => {
    try { const preset = normalizeConfig((liveConfig ?? {}) as SurpriseConfig).theme.preset; return THEME_PRESETS[preset]?.vars ?? THEME_PRESETS.midnightPurple.vars; }
    catch { return THEME_PRESETS.midnightPurple.vars; }
  }, [liveConfig]);

  // ── Clock ───────────────────────────────────────────────────────────────
  const ownClock = useMemo(() => new TrustedClock(), []);
  const clock: TrustedClock = owner ? ownClock : (props as PublicGateProps).clock;
  const [ownerPreview, setOwnerPreview] = useState<OwnerPreview>("auto");
  const [simUnlock, setSimUnlock] = useState<number | null>(null);
  const realUnlock = display.unlockAtMs ?? clock.now();
  const unlockAtMs = owner && simUnlock !== null ? simUnlock : realUnlock;
  const nowSource: NowSource = clock;

  const ticker = useMemo(() => new CountdownTicker(nowSource, unlockAtMs), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { ticker.setUnlock(unlockAtMs); }, [ticker, unlockAtMs]);
  useEffect(() => { ticker.start(); return () => ticker.stop(); }, [ticker]);
  const stage = useSyncExternalStore(ticker.subscribe, () => ticker.getSnapshot().stage, () => ticker.getSnapshot().stage);

  // Owner preview: measure trusted time too (purely for accuracy).
  useEffect(() => {
    if (!owner) return;
    let alive = true;
    void measureServerTime().then(s => { if (alive && s) { ownClock.accept(s); ticker.resync(); } });
    return () => { alive = false; };
  }, [owner, ownClock, ticker]);

  // ── Views ───────────────────────────────────────────────────────────────
  const slug = owner ? "owner-preview" : (props as PublicGateProps).slug;
  const guard = useMemo(() => createRevealGuard(owner ? null : safeSession(), slug, new Date(unlockAtMs).toISOString()), [owner, slug, unlockAtMs]);
  const initialView: View = stage === "unlocked" ? (display.afterUnlock === "openButton" && !owner ? "open-button" : "experience") : "countdown";
  const [view, setView] = useState<View>(initialView);
  const [bloom, setBloom] = useState<null | "play" | "hold">(null);
  const [retryCard, setRetryCard] = useState(false);
  const [experienceConfig, setExperienceConfig] = useState<SurpriseConfig | null>(initialView === "experience" ? fullConfigRef.current : null);
  const finaleAllowedRef = useRef(!guard.hasPlayed());
  const zeroHandledRef = useRef(initialView !== "countdown");
  const diag = useRef({ reveals: 0, experienceMounts: initialView === "experience" ? 1 : 0, refetches: 0 });
  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; if (bloomTimer.current) clearTimeout(bloomTimer.current); }; }, []);

  // ── Sound (one AudioContext per gate, lazily on gesture) ─────────────────
  const sound = useMemo(() => new CountdownSound(), []);
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => () => sound.dispose(), [sound]);
  useEffect(() => {
    const vis = () => sound.setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [sound]);
  useEffect(() => { if (!display.soundEnabled && soundOn) { sound.mute(); setSoundOn(false); } }, [display.soundEnabled, soundOn, sound]);
  // Let the reveal chime finish, then silence the gate's context for good.
  useEffect(() => {
    if (view !== "experience") return;
    const t = setTimeout(() => sound.mute(), 1600);
    return () => clearTimeout(t);
  }, [view, sound]);
  const toggleSound = useCallback(() => {
    if (soundOn) { sound.mute(); setSoundOn(false); }
    else if (sound.enable()) setSoundOn(true);
  }, [sound, soundOn]);

  const mountExperience = useCallback((cfg: SurpriseConfig) => {
    setExperienceConfig(prev => { if (!prev) diag.current.experienceMounts += 1; return prev ?? cfg; });
    setView("experience");
    setBloom("play");
    if (bloomTimer.current) clearTimeout(bloomTimer.current);
    bloomTimer.current = setTimeout(() => { if (mountedRef.current) setBloom(null); }, reducedMotion ? 1100 : REVEAL_MS);
  }, [reducedMotion]);

  const proceed = useCallback((cfg: SurpriseConfig, viaGesture = false) => {
    if (!owner && display.afterUnlock === "openButton" && !viaGesture) {
      setBloom(null); setView("open-button"); setExperienceConfig(null);
      fullConfigRef.current = cfg;
      return;
    }
    mountExperience(cfg);
  }, [display.afterUnlock, mountExperience, owner]);

  // Hard lock: fetch the authorised config now (with backoff); soft lock: in memory.
  const obtainFull = useCallback(async (): Promise<SurpriseConfig | "still-locked" | null> => {
    if (owner || tier === "soft" || fullConfigRef.current) return fullConfigRef.current;
    for (let attempt = 0; attempt < MAX_FULL_FETCH_ATTEMPTS; attempt++) {
      try {
        diag.current.refetches += 1;
        const r = await fetchPublicSurprise(slug);
        if (r.timeSample) clock.accept({ serverMs: r.timeSample.serverMs, perfMid: r.timeSample.perfMid, rttMs: r.timeSample.rttMs, source: r.timeSample.source });
        if (r.config && !r.locked) { fullConfigRef.current = r.config; lockedRef.current = false; setTier(r.tier); return r.config; }
        if (r.config && r.locked) {
          const next = parseUtcIso(r.config.countdown?.unlockAtUtc);
          setLiveConfig(r.config);
          // Creator extended the schedule meanwhile -> stay locked.
          if (next !== null && next - clock.now() > 1500) return "still-locked";
        }
      } catch { /* retry with backoff */ }
      await new Promise(res => setTimeout(res, Math.min(3000, 300 * 2 ** attempt)));
      if (!mountedRef.current) return null;
    }
    return null;
  }, [clock, owner, slug, tier]);

  const handleZero = useCallback(async (opts: { skipFinale?: boolean } = {}) => {
    if (zeroHandledRef.current) return;
    zeroHandledRef.current = true;
    if (!opts.skipFinale && guard.claim()) { diag.current.reveals += 1; if (finaleAllowedRef.current) sound.play("reveal"); }
    const cached = fullConfigRef.current;
    if (cached) { proceed(cached); return; }
    setBloom("hold");
    const full = await obtainFull();
    if (!mountedRef.current) return;
    if (full === "still-locked") { zeroHandledRef.current = false; finaleAllowedRef.current = true; setBloom(null); return; }
    if (!full) { setRetryCard(true); return; }
    setRetryCard(false);
    proceed(full);
  }, [guard, obtainFull, proceed, sound]);

  // Stage reactions: cues + zero.
  useEffect(() => {
    if (view !== "countdown") return;
    if (FINAL_STAGES.includes(stage) && finaleAllowedRef.current) sound.play(stage as CountdownCue);
    // Re-check against the live clock: a stale stage from a previous schedule
    // (owner preview switch / creator extension) must never trigger the unlock.
    if ((stage === "reveal" || stage === "unlocked") && unlockAtMs - clock.now() <= 0) void handleZero({ skipFinale: !finaleAllowedRef.current });
  }, [stage, view, handleZero, sound, unlockAtMs, clock]);

  // ── Public revalidation: creator may edit the schedule any time ──────────
  const revalidate = useCallback(async () => {
    if (owner || view !== "countdown" || zeroHandledRef.current) return;
    try {
      diag.current.refetches += 1;
      const r = await fetchPublicSurprise(slug);
      if (!mountedRef.current || !r.config) return;
      if (r.timeSample) clock.accept({ serverMs: r.timeSample.serverMs, perfMid: r.timeSample.perfMid, rttMs: r.timeSample.rttMs, source: r.timeSample.source });
      setTier(r.tier);
      lockedRef.current = r.locked;
      setLiveConfig(r.config);
      if (r.tier === "hard" && r.locked) { ticker.resync(); return; }
      fullConfigRef.current = r.config;
      const next = parseUtcIso(r.config.countdown?.unlockAtUtc);
      if (!countdownActive(r.config) || next === null || next <= clock.now()) {
        // Switched OFF / moved to the past -> unlock smoothly, no 3-2-1.
        finaleAllowedRef.current = false;
        void handleZero({ skipFinale: true });
      } else ticker.resync();
    } catch { /* network blip: keep counting with what we have */ }
  }, [clock, handleZero, owner, slug, ticker, view]);

  useEffect(() => {
    if (owner || view !== "countdown") return;
    const iv = setInterval(() => { void revalidate(); }, 60_000);
    const onVis = () => {
      if (document.hidden) return;
      clock.markStale();
      void measureServerTime().then(s => { if (s) clock.accept(s); ticker.resync(); });
      ticker.resync();
      void revalidate();
    };
    const onOnline = () => { void revalidate(); };
    const onFocus = () => ticker.resync();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    // T-15s and T-5s re-validation.
    const timers = [15_000, 5_000].map(lead => {
      const wait = unlockAtMs - lead - clock.now();
      return wait > 0 && wait < 2 ** 31 - 1 ? setTimeout(() => { void revalidate(); }, wait) : null;
    });
    return () => {
      clearInterval(iv);
      timers.forEach(t => t && clearTimeout(t));
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, [clock, owner, revalidate, ticker, unlockAtMs, view]);

  // ── Owner preview actions (never touch the saved/public schedule) ───────
  const resetPlay = useCallback(() => {
    zeroHandledRef.current = false; finaleAllowedRef.current = true;
    sound.resetPlaythrough(); setBloom(null); setRetryCard(false); setExperienceConfig(null);
  }, [sound]);
  const previewLocked = () => {
    resetPlay(); setOwnerPreview("locked");
    const real = display.unlockAtMs;
    setSimUnlock(real !== null && real - clock.now() > 4000 ? null : clock.now() + 2 * 86_400_000 + 3 * 3_600_000 + 15 * 60_000);
    setView("countdown");
  };
  const previewFinale = () => { resetPlay(); setOwnerPreview("finale"); setSimUnlock(clock.now() + 3600); setView("countdown"); };
  const previewUnlocked = () => { resetPlay(); setOwnerPreview("unlocked"); setView("experience"); setExperienceConfig(fullConfigRef.current); };
  const openNow = () => { resetPlay(); setOwnerPreview("unlocked"); zeroHandledRef.current = true; mountExperience(fullConfigRef.current!); };
  // Diagnostics (no content; safe to expose).
  useEffect(() => {
    window.__countdownDiag = {
      tier: owner ? "preview" : tier, clockSource: clock.source, trustedClock: clock.trusted, stage, view,
      reveals: diag.current.reveals, experienceMounts: diag.current.experienceMounts, refetches: diag.current.refetches,
      soundContexts: sound.createdContexts, soundLog: [...sound.log], soundState: sound.state,
      unlockAtUtc: new Date(unlockAtMs).toISOString(), ownerControls: owner,
    };
  });
  useEffect(() => () => { delete window.__countdownDiag; }, []);

  const toolbar = owner ? <OwnerToolbar
    mode={ownerPreview}
    unlockLabel={display.unlockAtMs !== null ? formatUnlockMoment(display.unlockAtMs, display.timezone) : "No schedule"}
    onLocked={previewLocked}
    onFinale={previewFinale}
    onUnlocked={previewUnlocked}
    onOpenNow={openNow}
    onAuto={() => { resetPlay(); setOwnerPreview("auto"); setSimUnlock(null); setView("countdown"); }}
    onUnlockForRecipients={(props as OwnerGateProps).onUnlockForRecipientsNow}
  /> : null;

  const bloomLayer = bloom ? <>
    <div className={`cd-bloom${bloom === "hold" ? " hold" : ""}`} aria-hidden="true" data-countdown-bloom={bloom} />
    {bloom === "hold" && !retryCard && <div className="cd-bloom-msg" role="status">Unwrapping…</div>}
  </> : null;

  // Owner preview always renders the CURRENT draft; public renders the authorised config.
  const shown = owner ? (props as OwnerGateProps).config : experienceConfig;
  if (view === "experience" && shown) {
    return <div className="cd-host" data-countdown-host="unlocked">
      {toolbar}
      {bloomLayer && <div className="cd-root" style={{ position: "fixed", inset: 0, minHeight: 0, padding: 0, background: "transparent", pointerEvents: "none", zIndex: 1200 }}>{bloomLayer}</div>}
      {props.children(shown)}
    </div>;
  }

  return <div className="cd-host" data-countdown-host="locked">
    {toolbar}
    <CountdownScreen
      display={display}
      ticker={ticker}
      stage={stage}
      unlockAtMs={unlockAtMs}
      showFinale={finaleAllowedRef.current}
      ownerMode={owner}
      themeVars={themeVars}
      reducedMotion={reducedMotion}
      sound={{ available: display.soundEnabled, on: soundOn, toggle: toggleSound }}
      phase={view === "open-button" ? "open-button" : "gate"}
      onOpen={() => { const cfg = fullConfigRef.current; if (cfg) mountExperience(cfg); }}
    />
    {bloomLayer && <div className="cd-root" style={{ position: "fixed", inset: 0, minHeight: 0, padding: 0, background: "transparent", pointerEvents: "none", zIndex: 1200 }}>{bloomLayer}</div>}
    {retryCard && <div className="cd-root" style={{ position: "fixed", inset: 0, minHeight: 0, background: "transparent", zIndex: 1202 }}>
      <div className="cd-retry" role="alert">
        <strong>Your surprise is ready — we just couldn't fetch it.</strong>
        <span>Check your connection and try again.</span>
        <button type="button" className="cd-btn" onClick={() => { setRetryCard(false); zeroHandledRef.current = false; void handleZero({ skipFinale: true }); }}>Try again</button>
      </div>
    </div>}
  </div>;
}

function OwnerToolbar(p: { mode: OwnerPreview; unlockLabel: string; onLocked: () => void; onFinale: () => void; onUnlocked: () => void; onOpenNow: () => void; onAuto: () => void; onUnlockForRecipients?: () => void }) {
  return <div className="cd-owner-bar" role="region" aria-label="Creator controls" data-countdown-owner-controls>
    <p className="cd-owner-title"><span aria-hidden="true">🔒</span> Creator controls — recipients never see this</p>
    <p className="cd-owner-sub">Scheduled: <strong>{p.unlockLabel}</strong> · Preview actions never change your saved schedule.</p>
    <div className="cd-owner-actions">
      <button type="button" aria-pressed={p.mode === "auto"} onClick={p.onAuto}>Live schedule</button>
      <button type="button" aria-pressed={p.mode === "locked"} onClick={p.onLocked}>Preview locked state</button>
      <button type="button" aria-pressed={p.mode === "finale"} onClick={p.onFinale}>Preview 3-2-1 finale</button>
      <button type="button" aria-pressed={p.mode === "unlocked"} onClick={p.onUnlocked}>Preview unlocked state</button>
      <button type="button" className="cd-owner-primary" onClick={p.onOpenNow}>Open surprise now</button>
      {p.onUnlockForRecipients && <button type="button" className="cd-owner-warn" onClick={() => {
        if (window.confirm("Unlock for recipients now?\n\nThis sets the countdown to the current time in your DRAFT. Recipients are only affected after you press Save in Customize.")) p.onUnlockForRecipients?.();
      }}>Unlock for recipients now…</button>}
    </div>
  </div>;
}
