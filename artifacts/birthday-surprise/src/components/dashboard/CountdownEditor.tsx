import { useEffect, useState } from "react";
import type { CountdownConfig, SurpriseConfig } from "@/lib/v2/schema";
import { COUNTDOWN_TIMEZONES, DEFAULT_COUNTDOWN_TIMEZONE, resolveCountdownFor } from "@/lib/countdown/defaults";
import { checkSchedule, formatRelative, formatUnlockMoment } from "@/lib/countdown/engine";
import { defaultSchedule, resetCountdown, unlockNowPatch, withSchedule } from "@/lib/countdown/editor";
import { COUNTDOWN_LABEL_LIMIT, COUNTDOWN_STYLES, COUNTDOWN_TEXT_LIMITS, type CountdownTextField } from "../../../supabase/functions/_shared/countdownConfig";

// Scheduled Surprise Countdown card. Everything flows through the canonical
// draft via FUNCTIONAL updates (never a whole-config overwrite), so it is
// Save/Undo/Discard/autosave/stale-save safe like the rest of Customize.
type Update = (fn: (c: SurpriseConfig) => SurpriseConfig) => void;

function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}

const STYLE_LABELS: Record<string, string> = { aurora: "Aurora bloom", celestial: "Celestial night", velvet: "Golden velvet" };

export default function CountdownEditor({ config, onChange }: { config: SurpriseConfig; onChange: Update }) {
  const c = config.countdown ?? {};
  const r = resolveCountdownFor(config);
  const tz = c.timezone || DEFAULT_COUNTDOWN_TIMEZONE;
  const now = useNow();
  const [ambiguous, setAmbiguous] = useState<"earlier" | "later">("earlier");
  const [pastConfirmed, setPastConfirmed] = useState(false);
  const check = checkSchedule(c.localDate, c.localTime, tz, now);

  const patch = (fn: (cd: CountdownConfig) => CountdownConfig) => onChange(cfg => ({ ...cfg, countdown: fn(cfg.countdown ?? {}) }));
  const setText = (key: CountdownTextField, value: string) => patch(cd => ({ ...cd, [key]: value.slice(0, COUNTDOWN_TEXT_LIMITS[key]) }));
  const setSchedule = (edit: Partial<Pick<CountdownConfig, "localDate" | "localTime" | "timezone">>) => { setPastConfirmed(false); patch(cd => withSchedule(cd, edit, ambiguous)); };

  const toggle = (on: boolean) => patch(cd => {
    if (!on) return { ...cd, enabled: false };
    const zone = cd.timezone || DEFAULT_COUNTDOWN_TIMEZONE;
    const base = cd.localDate && cd.localTime ? cd : { ...cd, ...defaultSchedule(zone) };
    return { ...withSchedule(base, { timezone: zone }, ambiguous), enabled: true };
  });

  const field = (key: CountdownTextField, label: string, multiline = false, placeholder?: string) => {
    const value = (c[key] as string | undefined) ?? "";
    const max = COUNTDOWN_TEXT_LIMITS[key];
    const id = `cd-${key}`;
    return <div className="cdx-field">
      <label htmlFor={id}>{label}<span className="cdx-count" aria-hidden="true">{value.length}/{max}</span></label>
      {multiline
        ? <textarea id={id} aria-label={`Countdown ${label.toLowerCase()}`} value={value} maxLength={max} rows={3} placeholder={placeholder} onChange={e => setText(key, e.target.value)} />
        : <input id={id} aria-label={`Countdown ${label.toLowerCase()}`} value={value} maxLength={max} placeholder={placeholder} onChange={e => setText(key, e.target.value)} />}
    </div>;
  };

  const summary = r.unlockAtMs !== null
    ? `Opens ${formatUnlockMoment(r.unlockAtMs, tz)} · ${r.unlockAtMs > now ? formatRelative(r.unlockAtMs - now) : "already open"}`
    : "No unlock time yet";

  return <section className="cdx v2-panel" aria-labelledby="cdx-title" data-countdown-editor>
    <header className="cdx-head">
      <div>
        <p className="v2-eyebrow">SCHEDULED SURPRISE</p>
        <h3 id="cdx-title">Countdown unlock</h3>
        <p className="cdx-sub">Keep it sealed until the perfect moment. Recipients see a cinematic countdown, then a 3‑2‑1 reveal.</p>
      </div>
      <label className="cdx-switch">
        <input type="checkbox" role="switch" aria-label="Enable scheduled countdown" checked={r.enabled} onChange={e => toggle(e.target.checked)} />
        <span aria-hidden="true" className="cdx-track"><span className="cdx-thumb" /></span>
        <span className="cdx-switch-text">{r.enabled ? "On" : "Off"}</span>
      </label>
    </header>

    <div className={`cdx-summary${r.enabled ? " on" : ""}`} role="status" aria-live="polite">
      <span aria-hidden="true">{r.enabled ? "⏳" : "🔓"}</span>
      <span>{r.enabled ? summary : "Off — the surprise opens immediately (saved settings are kept)."}</span>
    </div>

    <fieldset className="cdx-group">
      <legend>When should it open?</legend>
      <div className="cdx-row3">
        <div className="cdx-field"><label htmlFor="cd-date">Date</label><input id="cd-date" type="date" aria-label="Countdown date" value={c.localDate ?? ""} onChange={e => setSchedule({ localDate: e.target.value })} /></div>
        <div className="cdx-field"><label htmlFor="cd-time">Time (24h)</label><input id="cd-time" type="time" step={60} aria-label="Countdown time" value={c.localTime ?? ""} onChange={e => setSchedule({ localTime: e.target.value })} /></div>
        <div className="cdx-field"><label htmlFor="cd-tz">Timezone</label>
          <select id="cd-tz" aria-label="Countdown timezone" value={tz} onChange={e => setSchedule({ timezone: e.target.value })}>
            {!COUNTDOWN_TIMEZONES.some(z => z.id === tz) && <option value={tz}>{tz}</option>}
            {COUNTDOWN_TIMEZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </div>
      </div>
      {check.level === "error" && r.enabled && <p className="cdx-msg error" role="alert">{check.message}</p>}
      {check.level === "ambiguous" && <div className="cdx-msg warn" role="alert">
        <p>{check.message}</p>
        <div className="cdx-chips">
          {(["earlier", "later"] as const).map((k, i) => <button type="button" key={k} aria-pressed={ambiguous === k} onClick={() => { setAmbiguous(k); patch(cd => withSchedule(cd, {}, k)); }}>
            {k === "earlier" ? "First" : "Second"} · {formatUnlockMoment(check.candidates[i], "UTC")}
          </button>)}
        </div>
      </div>}
      {check.level === "past" && r.enabled && <div className="cdx-msg warn" role="alert">
        <p>{check.message}</p>
        {!pastConfirmed
          ? <button type="button" onClick={() => setPastConfirmed(true)}>Yes, unlock immediately</button>
          : <p className="cdx-ok">Confirmed — recipients go straight in. Pick a future time to bring the countdown back.</p>}
      </div>}
      <div className="cdx-chips">
        <button type="button" onClick={() => { setPastConfirmed(false); patch(cd => withSchedule({ ...cd, timezone: tz }, defaultSchedule(tz))); }}>Tomorrow 00:00</button>
        <button type="button" onClick={() => { setPastConfirmed(false); patch(cd => unlockNowPatch({ ...cd, timezone: tz }, Date.now() + 2 * 60_000)); }}>In 2 minutes (test)</button>
      </div>
    </fieldset>

    <fieldset className="cdx-group">
      <legend>Words on the countdown page</legend>
      {field("heading", "Heading", false, r.heading)}
      {field("recipientName", "Recipient name", false, config.name || "Uses their name")}
      {field("message", "Message", true, r.message)}
      {field("waitingLine", "Waiting line", false, r.waitingLine)}
      {field("footer", "Signature / footer", false, "With love, …")}
      <details className="cdx-details"><summary>Timer labels</summary>
        <div className="cdx-row4">{(["days", "hours", "minutes", "seconds"] as const).map(k => <div className="cdx-field" key={k}>
          <label htmlFor={`cd-l-${k}`}>{k[0].toUpperCase() + k.slice(1)}</label>
          <input id={`cd-l-${k}`} aria-label={`Countdown ${k} label`} maxLength={COUNTDOWN_LABEL_LIMIT} value={c.labels?.[k] ?? ""} placeholder={r.labels[k]} onChange={e => patch(cd => ({ ...cd, labels: { ...cd.labels, [k]: e.target.value.slice(0, COUNTDOWN_LABEL_LIMIT) } }))} />
        </div>)}</div>
      </details>
    </fieldset>

    <fieldset className="cdx-group">
      <legend>Experience</legend>
      <div className="cdx-row2">
        <div className="cdx-field"><label htmlFor="cd-style">Look</label>
          <select id="cd-style" aria-label="Countdown look" value={r.style} onChange={e => patch(cd => ({ ...cd, style: e.target.value as CountdownConfig["style"] }))}>
            {COUNTDOWN_STYLES.map(s => <option key={s} value={s}>{STYLE_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="cdx-field"><label htmlFor="cd-after">At zero</label>
          <select id="cd-after" aria-label="After unlock" value={r.afterUnlock} onChange={e => patch(cd => ({ ...cd, afterUnlock: e.target.value as CountdownConfig["afterUnlock"] }))}>
            <option value="autoOpen">Open automatically</option>
            <option value="openButton">Show an “Open” button</option>
          </select>
        </div>
      </div>
      {r.afterUnlock === "openButton" && field("openButtonLabel", "Open button label", false, r.openButtonLabel)}
      <label className="cdx-check"><input type="checkbox" checked={r.showTeaserButton} onChange={e => patch(cd => ({ ...cd, showTeaserButton: e.target.checked }))} /> Show a playful teaser button <small>(never unlocks early)</small></label>
      {r.showTeaserButton && <div className="cdx-row2">{field("teaserLabel", "Teaser label", false, r.teaserLabel)}{field("teaserReaction", "Teaser reaction", false, r.teaserReaction)}</div>}
      <label className="cdx-check"><input type="checkbox" checked={r.soundEnabled} onChange={e => patch(cd => ({ ...cd, soundEnabled: e.target.checked }))} /> Soft countdown chimes <small>(visitor must tap “Enable sound”)</small></label>
    </fieldset>

    <p className="cdx-note">🔐 Owner-only “Open surprise now” and preview buttons live in the <strong>Preview</strong> tab. Recipients never see them.</p>
    <p className="cdx-note">Security: this is a <strong>soft lock</strong> until the hard-lock SQL is applied (see docs/countdown.md). The page hides the surprise, but a technical visitor could still read the content from the network.</p>
    <div className="cdx-chips">
      <button type="button" className="cdx-reset" onClick={() => { if (window.confirm("Reset countdown settings? Only this feature is affected.")) patch(() => resetCountdown()); }}>Reset countdown settings</button>
    </div>
  </section>;
}
