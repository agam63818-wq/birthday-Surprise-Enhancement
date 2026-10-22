import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { ResolvedCountdownConfig } from "@/lib/countdown/defaults";
import type { CountdownTicker } from "@/lib/countdown/ticker";
import { formatUnlockMoment, milestoneAnnouncement, type CountdownStage } from "@/lib/countdown/engine";
import "./countdown.css";

// ── Particles: one small canvas, <= 56 particles, DPR capped at 2, paused
// when the tab is hidden or the canvas is offscreen. Static under reduced motion.
type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; kind: 0 | 1 | 2; hue: number; burst?: boolean };
const MAX_PARTICLES = 56;

class ParticleField {
  private ctx: CanvasRenderingContext2D | null;
  private parts: P[] = [];
  private raf: number | null = null;
  private w = 0; private h = 0; private dpr = 1;
  private visible = true; private onscreen = true; private alive = true;
  private io: IntersectionObserver | null = null;
  private colors: string[];
  frames = 0;
  constructor(private canvas: HTMLCanvasElement, private reduced: boolean, colors: string[]) {
    this.ctx = canvas.getContext("2d");
    this.colors = colors;
    this.resize();
    const base = Math.min(42, Math.round((this.w * this.h) / 26000) + 14);
    for (let i = 0; i < base; i++) this.parts.push(this.spawn(true));
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVis);
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver(([e]) => { this.onscreen = !!e?.isIntersecting; this.kick(); });
      this.io.observe(canvas);
    }
    if (reduced) this.draw(); else this.kick();
  }
  private spawn(initial = false): P {
    const kind = (Math.random() < 0.22 ? 1 : Math.random() < 0.5 ? 2 : 0) as 0 | 1 | 2;
    return {
      x: Math.random() * this.w, y: initial ? Math.random() * this.h : this.h + 12,
      vx: (Math.random() - 0.5) * 0.12, vy: -(0.12 + Math.random() * 0.32),
      r: kind === 1 ? 4 + Math.random() * 4 : 0.8 + Math.random() * 1.8,
      a: 0.25 + Math.random() * 0.6, life: 1, kind, hue: Math.floor(Math.random() * this.colors.length),
    };
  }
  resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, rect.width); this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.reduced) this.draw();
  };
  private onVis = () => { this.visible = !document.hidden; this.kick(); };
  private kick() {
    if (this.reduced || !this.alive) return;
    if (this.visible && this.onscreen) { if (this.raf === null) this.raf = requestAnimationFrame(this.step); }
    else if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
  }
  burst(x: number, y: number, n = 14) {
    if (this.reduced) return;
    for (let i = 0; i < n && this.parts.length < MAX_PARTICLES + 16; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4; const sp = 1.2 + Math.random() * 2.2;
      this.parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.6, r: 4 + Math.random() * 4, a: 0.95, life: 1, kind: 1, hue: Math.floor(Math.random() * this.colors.length), burst: true });
    }
    this.kick();
  }
  burstCenter(n?: number) { this.burst(this.w / 2, this.h / 2, n); }
  private heart(x: number, y: number, s: number) {
    const c = this.ctx!; c.beginPath();
    c.moveTo(x, y + s * 0.3);
    c.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
    c.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
    c.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
    c.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
    c.fill();
  }
  private draw() {
    const c = this.ctx; if (!c) return;
    c.clearRect(0, 0, this.w, this.h);
    for (const p of this.parts) {
      c.globalAlpha = Math.max(0, p.a * p.life);
      c.fillStyle = this.colors[p.hue];
      if (p.kind === 1) this.heart(p.x, p.y, p.r * 2);
      else if (p.kind === 2) { c.beginPath(); c.moveTo(p.x, p.y - p.r * 2.2); c.lineTo(p.x + p.r * 0.6, p.y); c.lineTo(p.x, p.y + p.r * 2.2); c.lineTo(p.x - p.r * 0.6, p.y); c.closePath(); c.fill(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
  }
  private step = () => {
    this.raf = null; if (!this.alive) return;
    this.frames++;
    const t = performance.now() / 1000;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx + Math.sin(t + i) * 0.08; p.y += p.vy;
      if (p.burst) { p.vy += 0.035; p.vx *= 0.985; p.life -= 0.016; if (p.life <= 0) { this.parts.splice(i, 1); continue; } }
      else if (p.y < -16) { this.parts[i] = this.spawn(); }
      else if (p.kind === 2) p.a = 0.2 + Math.abs(Math.sin(t * 0.9 + i)) * 0.6;
    }
    this.draw();
    this.kick();
  };
  dispose() {
    this.alive = false;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.onVis);
    this.io?.disconnect();
  }
  get count() { return this.parts.length; }
  get running() { return this.raf !== null; }
}

function readColors(el: HTMLElement | null): string[] {
  const s = el ? getComputedStyle(el) : null;
  const v = (n: string, f: string) => (s?.getPropertyValue(n).trim() || f);
  return [v("--pink", "#f472b6"), v("--lavender", "#c4b5fd"), "#f3cf8f", v("--magenta", "#e879f9"), "#fff4e6"];
}

// ── Digits: the ONLY part that re-renders every second ──────────────────
const pad2 = (n: number) => String(n).padStart(2, "0");
const Digits = memo(function Digits({ ticker, labels }: { ticker: CountdownTicker; labels: ResolvedCountdownConfig["labels"] }) {
  const sec = useSyncExternalStore(ticker.subscribe, () => ticker.getSnapshot().sec, () => ticker.getSnapshot().sec);
  const units: Array<[keyof typeof labels, string]> = [
    ["days", pad2(Math.floor(sec / 86400))],
    ["hours", pad2(Math.floor((sec % 86400) / 3600))],
    ["minutes", pad2(Math.floor((sec % 3600) / 60))],
    ["seconds", pad2(sec % 60)],
  ];
  return <ol className="cd-timer" data-countdown-seconds={sec}>
    {units.map(([key, value], i) => <li key={key} className="cd-unit" style={{ "--i": i } as CSSProperties} data-unit={key}>
      <span className="cd-digits" aria-hidden="true">{value.split("").map((ch, j) => <span key={j} className="cd-digit-slot"><span key={ch} className="cd-digit">{ch}</span></span>)}</span>
      <span className="cd-sr">{Number(value)} {labels[key]}</span>
      <span className="cd-label" aria-hidden="true">{labels[key]}</span>
    </li>)}
  </ol>;
});

/** Polite milestone announcements (every minute, 10s, then the numerals). */
function Announcer({ ticker }: { ticker: CountdownTicker }) {
  const sec = useSyncExternalStore(ticker.subscribe, () => ticker.getSnapshot().sec, () => ticker.getSnapshot().sec);
  const prev = useRef<number | null>(null);
  const [text, setText] = useState("");
  useEffect(() => {
    const msg = milestoneAnnouncement(prev.current, sec);
    prev.current = sec;
    if (msg) setText(msg);
  }, [sec]);
  return <p className="cd-sr" aria-live="polite" aria-atomic="true" data-countdown-announcer>{text}</p>;
}

function LetterReveal({ text }: { text: string }) {
  // Letters are grouped per word (nowrap) so lines only break between words.
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  let i = 0;
  return <span aria-hidden="true">{words.map((w, wi) => /^\s+$/.test(w)
    ? <span key={wi}> </span>
    : <span key={wi} className="cd-word">{Array.from(w).map(ch => { const n = i++; return <span key={n} className="cd-letter" style={{ "--i": Math.min(n, 60) } as CSSProperties}>{ch}</span>; })}</span>)}</span>;
}

const viewerZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })();

export interface CountdownScreenProps {
  display: ResolvedCountdownConfig;
  ticker: CountdownTicker;
  stage: CountdownStage;
  unlockAtMs: number;
  /** Show the finale numerals for this stage (false when a reveal already played). */
  showFinale: boolean;
  ownerMode: boolean;
  themeVars?: Record<string, string>;
  reducedMotion: boolean;
  sound: { available: boolean; on: boolean; toggle: () => void };
  phase: "gate" | "open-button";
  onOpen: () => void;
  burstRef?: React.MutableRefObject<((n?: number) => void) | null>;
  toolbar?: ReactNode;
}

export default function CountdownScreen(props: CountdownScreenProps) {
  const { display, ticker, stage, unlockAtMs, showFinale, ownerMode, themeVars, reducedMotion, sound, phase, onOpen, burstRef, toolbar } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<ParticleField | null>(null);
  const [skip, setSkip] = useState(false);
  const [reaction, setReaction] = useState<{ n: number; text: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let field: ParticleField | null = null;
    try { field = new ParticleField(canvas, reducedMotion, readColors(rootRef.current)); } catch { field = null; }
    fieldRef.current = field;
    if (burstRef) burstRef.current = (n?: number) => field?.burstCenter(n);
    (window as unknown as { __countdownParticles?: unknown }).__countdownParticles = { get count() { return field?.count ?? 0; }, get running() { return field?.running ?? false; }, get frames() { return field?.frames ?? 0; } };
    return () => { field?.dispose(); fieldRef.current = null; if (burstRef) burstRef.current = null; };
  }, [reducedMotion, burstRef, themeVars]);

  // Heart burst on each finale numeral.
  useEffect(() => {
    if (stage === "final3" || stage === "final2" || stage === "final1") fieldRef.current?.burstCenter(stage === "final1" ? 18 : 10);
  }, [stage]);

  const when = formatUnlockMoment(unlockAtMs, display.timezone);
  const localWhen = viewerZone && viewerZone !== display.timezone ? formatUnlockMoment(unlockAtMs, viewerZone) : null;
  const finale = showFinale && (stage === "final3" || stage === "final2" || stage === "final1");
  const numeral = stage === "final3" ? "3" : stage === "final2" ? "2" : "1";

  const teaser = (e: React.MouseEvent<HTMLButtonElement>) => {
    setReaction(r => ({ n: (r?.n ?? 0) + 1, text: display.teaserReaction }));
    const host = rootRef.current?.getBoundingClientRect(); const b = e.currentTarget.getBoundingClientRect();
    if (host) fieldRef.current?.burst(b.left - host.left + b.width / 2, b.top - host.top, 12);
  };

  return <div
    ref={rootRef}
    className={`cd-root${skip ? " cd-skip" : ""}`}
    data-countdown-gate
    data-stage={finale ? stage : phase === "open-button" ? "open" : stage}
    data-cd-style={display.style}
    data-owner={ownerMode ? "true" : "false"}
    style={themeVars as CSSProperties}
    onPointerDown={() => setSkip(true)}
    onKeyDown={() => setSkip(true)}
  >
    {toolbar}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" />
    <div className="cd-atmos" aria-hidden="true"><div className="cd-aurora a1" /><div className="cd-aurora a2" /><div className="cd-aurora a3" /></div>
    <canvas ref={canvasRef} className="cd-canvas" aria-hidden="true" />
    <div className="cd-vignette" aria-hidden="true" />
    {sound.available && <button type="button" className="cd-sound" aria-pressed={sound.on} onClick={sound.toggle}>{sound.on ? "♪ Sound on" : "♪ Enable sound"}</button>}

    <main className="cd-stage" aria-labelledby="cd-heading">
      <p className="cd-eyebrow">{phase === "open-button" ? "It's time" : "A surprise is waiting"}</p>
      {display.recipientName && <p className="cd-name">For {display.recipientName}</p>}
      <h1 id="cd-heading" className="cd-heading" aria-label={display.heading}><LetterReveal text={display.heading} /></h1>
      <p className="cd-message">{display.message}</p>

      {phase === "open-button" ? <div className="cd-open-wrap">
        <button type="button" className="cd-open" onClick={onOpen} autoFocus>{display.openButtonLabel} ✨</button>
      </div> : <section className="cd-panel" role="timer" aria-label="Time remaining until the surprise opens" aria-live="off">
        <div className="cd-breath" aria-hidden="true" />
        <Digits ticker={ticker} labels={display.labels} />
        <p className="cd-when">Opens <strong>{when}</strong>{localWhen && <><br /><span>Your time: {localWhen}</span></>}</p>
      </section>}

      {phase === "gate" && <p className="cd-waiting">{display.waitingLine}</p>}
      {phase === "gate" && display.showTeaserButton && <div className="cd-actions">
        <button type="button" className="cd-btn" onClick={teaser} data-countdown-teaser>{display.teaserLabel} 💗</button>
      </div>}
      {reaction && <p className="cd-teaser-reaction" aria-live="polite"><span key={reaction.n}>{reaction.text}</span></p>}
      {display.footer && <p className="cd-footer">{display.footer}</p>}
      <Announcer ticker={ticker} />
    </main>

    {finale && <div className="cd-finale" aria-hidden="true" data-countdown-finale={numeral}>
      <div className="cd-finale-glow" />
      <div className="cd-num-wrap" key={stage}>
        <span className="cd-ring" /><span className="cd-ring r2" />
        <span className="cd-num">{numeral}</span>
      </div>
    </div>}
  </div>;
}
