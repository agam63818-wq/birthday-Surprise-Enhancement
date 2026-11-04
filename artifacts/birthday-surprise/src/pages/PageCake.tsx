import { useState } from "react";
import CelebrationBurst from "@/components/CelebrationBurst";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

interface CakePageProps {
  onNext: () => void;
  playCakeSong?: () => void;
}

/* ── Professional sound effects (Web Audio — no files needed) ───── */
let sfxCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!sfxCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sfxCtx = new AC();
    }
    if (sfxCtx.state === "suspended") sfxCtx.resume();
    return sfxCtx;
  } catch { return null; }
}

// Soft match-strike ignite chime (for lighting the candles)
function playIgniteSfx() {
  const c = getCtx(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1040, c.currentTime + 0.12);
    g.gain.setValueAtTime(0.16, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.45);
    // tiny sparkle tail
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.type = "sine"; o2.frequency.value = 1560;
    g2.gain.setValueAtTime(0.07, c.currentTime + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    o2.connect(g2); g2.connect(c.destination);
    o2.start(c.currentTime + 0.1); o2.stop(c.currentTime + 0.55);
  } catch {}
}

// Soft knife-through-cake whoosh (filtered noise sweep)
function playSliceSfx() {
  const c = getCtx(); if (!c) return;
  try {
    const dur = 0.4;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(1400, c.currentTime);
    bp.frequency.exponentialRampToValueAtTime(260, c.currentTime + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.35, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start();
  } catch {}
}

// Gentle candle blow-out (low airy noise)
function playBlowSfx() {
  const c = getCtx(); if (!c) return;
  try {
    const dur = 0.5;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / d.length) * Math.PI);
    const src = c.createBufferSource(); src.buffer = buf;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    const g = c.createGain(); g.gain.value = 0.22;
    src.connect(lp); lp.connect(g); g.connect(c.destination);
    src.start(c.currentTime + 0.05);
  } catch {}
}

// Celebration pop + sparkling chime arpeggio
function playCelebrateSfx() {
  const c = getCtx(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.08);
    g.gain.setValueAtTime(0.28, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.3);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const t = c.currentTime + 0.14 + i * 0.09;
      const o2 = c.createOscillator(), g2 = c.createGain();
      o2.type = "sine"; o2.frequency.value = f;
      g2.gain.setValueAtTime(0.12, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o2.connect(g2); g2.connect(c.destination);
      o2.start(t); o2.stop(t + 0.55);
    });
  } catch {}
}

/* ── Page-local keyframes (glow flash) ────────────────────── */
const LOCAL_KEYFRAMES = `
@keyframes cake-flash {
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  100% { opacity: 0; }
}
`;

/* ── Radial sparkle particles that burst on cut (theme colours) ── */
const SPARK_COLORS = ["var(--pink)", "var(--violet)", "var(--lavender)", "var(--magenta)", "#fff6d8"];
function SparkleParticles({ active }: { active: boolean }) {
  if (!active) return null;
  const sparks = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const dist = 90 + (i % 3) * 40;
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
      size: 4 + (i % 4) * 3,
      delay: `${i * 0.025}s`,
    };
  });
  return (
    <div className="cake-sparks" aria-hidden="true">
      {sparks.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          width: s.size, height: s.size, borderRadius: "50%",
          background: s.color, boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
          animation: `sparkle-burst 0.95s cubic-bezier(0.22,1,0.36,1) ${s.delay} both`,
          "--tx": `${s.x}px`, "--ty": `${s.y}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

/* ── Premium tiered cake (SVG). Every colour comes from the active theme
      via CSS custom properties defined on .cake-art (see index.css). ── */
const CANDLE_X = [100, 115, 130, 145, 160];
const VIEW_W = 260;
const VIEW_H = 272;
const FLAME_Y = 44;

function Stop({ offset, color }: { offset: string; color: string }) {
  return <stop offset={offset} style={{ stopColor: color }} />;
}

/** Cream drip line hanging from a tier's top edge. */
function dripPath(x: number, y: number, w: number, seed: number) {
  const n = Math.max(5, Math.round(w / 16));
  const step = w / n;
  let d = `M${x} ${y} h${w} v4`;
  for (let i = n - 1; i >= 0; i--) {
    const depth = 5 + ((i * 7 + seed) % 4) * 3.2;
    const cx = x + i * step + step / 2;
    d += ` L${cx + step / 2} ${y + 4} Q${cx + step * 0.28} ${y + 4} ${cx + step * 0.22} ${y + depth} a${step * 0.22} ${step * 0.22} 0 0 1 ${-step * 0.44} 0 Q${cx - step * 0.28} ${y + 4} ${cx - step / 2} ${y + 4}`;
  }
  return `${d} Z`;
}

function Pearls({ x, y, w, gap = 11, r = 2.4, prefix }: { x: number; y: number; w: number; gap?: number; r?: number; prefix: string }) {
  const count = Math.floor(w / gap);
  const start = x + (w - (count - 1) * gap) / 2;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <circle cx={start + i * gap} cy={y} r={r} fill={`url(#${prefix}gold)`} />
          <circle cx={start + i * gap - r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="rgba(255,255,255,0.75)" />
        </g>
      ))}
    </g>
  );
}

function Tier({ x, y, w, h, prefix, fill, drip, seed }: {
  x: number; y: number; w: number; h: number; prefix: string; fill: string; drip: string; seed: number;
}) {
  const rx = w / 2;
  const ry = Math.max(6, w * 0.055);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={`url(#${prefix}${fill})`} />
      {/* Cylinder shading */}
      <rect x={x} y={y} width={w} height={h} rx={10} fill={`url(#${prefix}sheen)`} />
      {/* Tier top surface */}
      <ellipse cx={x + rx} cy={y} rx={rx} ry={ry} style={{ fill: drip }} />
      <ellipse cx={x + rx} cy={y - 1} rx={rx - 5} ry={ry - 2.5} fill="rgba(255,255,255,0.22)" />
      {/* Ganache / cream drips */}
      <path d={dripPath(x, y, w, seed)} style={{ fill: drip }} />
    </g>
  );
}

function CakeArt({ flamesLit, prefix }: { flamesLit: boolean; prefix: string }) {
  const config = useConfig();
  const name = config.name;
  const long = name.length > 12;
  const nameSize = long ? 14 : name.length > 9 ? 16.5 : 20;
  return (
    <svg className="cake-art" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`${prefix}t1`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" color="var(--cake-b1)" /><Stop offset="100%" color="var(--cake-b2)" />
        </linearGradient>
        <linearGradient id={`${prefix}t2`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" color="var(--cake-m1)" /><Stop offset="100%" color="var(--cake-m2)" />
        </linearGradient>
        <linearGradient id={`${prefix}t3`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" color="var(--cake-c1)" /><Stop offset="100%" color="var(--cake-c2)" />
        </linearGradient>
        <linearGradient id={`${prefix}gold`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" color="var(--cake-gold-1)" /><Stop offset="55%" color="var(--cake-gold-2)" /><Stop offset="100%" color="var(--cake-gold-1)" />
        </linearGradient>
        <linearGradient id={`${prefix}sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.30)" />
          <stop offset="22%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="78%" stopColor="rgba(0,0,0,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.34)" />
        </linearGradient>
        <linearGradient id={`${prefix}candle`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#efe4d6" /><stop offset="45%" stopColor="#fffaf2" /><stop offset="100%" stopColor="#d9cbb8" />
        </linearGradient>
        <radialGradient id={`${prefix}fl`} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#fffdf0" /><stop offset="50%" stopColor="#ffd86b" /><stop offset="100%" stopColor="#ff8a2a" />
        </radialGradient>
        <radialGradient id={`${prefix}halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,214,120,0.55)" /><stop offset="100%" stopColor="rgba(255,214,120,0)" />
        </radialGradient>
      </defs>

      {/* Cake stand */}
      <ellipse cx="130" cy="264" rx="56" ry="7" fill="rgba(0,0,0,0.35)" />
      <path d="M112 262 Q130 252 148 262 L142 240 L118 240 Z" fill={`url(#${prefix}gold)`} />
      <ellipse cx="130" cy="240" rx="112" ry="12" fill={`url(#${prefix}gold)`} />
      <ellipse cx="130" cy="237" rx="104" ry="9" style={{ fill: "var(--cake-plate)" }} />
      <ellipse cx="96" cy="235" rx="34" ry="2.4" fill="rgba(255,255,255,0.35)" />

      {/* Bottom tier */}
      <Tier x={38} y={174} w={184} h={62} prefix={prefix} fill="t1" drip="var(--cake-cream)" seed={1} />
      <rect x="38" y="214" width="184" height="5" fill={`url(#${prefix}gold)`} opacity="0.9" />
      <text x="130" y="205" textAnchor="middle" fontSize="9.5" letterSpacing="3.2"
        fontFamily="Inter, sans-serif" fontWeight="700" style={{ fill: "var(--cake-text)" }}>
        HAPPY BIRTHDAY
      </text>
      <Pearls x={44} y={232} w={172} prefix={prefix} />

      {/* Middle tier */}
      <Tier x={62} y={128} w={136} h={50} prefix={prefix} fill="t2" drip="var(--cake-cream)" seed={4} />
      <text x="130" y="163" textAnchor="middle" fontSize={nameSize}
        fontFamily="'Dancing Script', cursive" fontWeight="700"
        {...(long ? { textLength: 118, lengthAdjust: "spacingAndGlyphs" } : {})}
        style={{ fill: "#fffaf5", filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))" }}>
        {name}
      </text>
      <Pearls x={66} y={175} w={128} gap={10} r={2.1} prefix={prefix} />

      {/* Top tier */}
      <Tier x={86} y={88} w={88} h={42} prefix={prefix} fill="t3" drip="var(--cake-drip)" seed={2} />
      {[110, 130, 150].map((hx, i) => (
        <path key={hx} transform={`translate(${hx - 5} ${108 + (i === 1 ? -2 : 0)}) scale(0.85)`}
          d="M6 11 c0 0 -6 -4 -6 -7.4 c0 -2.2 1.9 -3.3 3.7 -2.4 c0.9 0.5 1.5 1.3 2.3 2.2 c0.8 -0.9 1.4 -1.7 2.3 -2.2 c1.8 -0.9 3.7 0.2 3.7 2.4 c0 3.4 -6 7.4 -6 7.4 Z"
          style={{ fill: i === 1 ? "var(--cake-accent)" : "var(--cake-drip)" }} />
      ))}
      <Pearls x={90} y={127} w={80} gap={9} r={1.9} prefix={prefix} />

      {/* Sprinkles */}
      {[[56,196],[78,222],[196,198],[208,222],[84,148],[176,150],[108,190],[156,190]].map(([sx, sy], i) => (
        <rect key={i} x={sx} y={sy} width="5" height="1.8" rx="0.9"
          transform={`rotate(${(i * 47) % 180} ${sx + 2.5} ${sy + 0.9})`}
          style={{ fill: ["var(--cake-gold-1)", "#fffaf2", "var(--cake-accent)"][i % 3] }} opacity="0.9" />
      ))}

      {/* Candles + flames */}
      {CANDLE_X.map((x, i) => (
        <g key={i}>
          <rect x={x - 3.2} y="54" width="6.4" height="34" rx="3" fill={`url(#${prefix}candle)`} />
          {[60, 69, 78].map((ry) => (
            <rect key={ry} x={x - 3.2} y={ry} width="6.4" height="2.2" fill={`url(#${prefix}gold)`} opacity="0.85" />
          ))}
          <rect x={x - 0.6} y="49" width="1.2" height="6" rx="0.6" fill="#3b2412" />
          <g style={{ opacity: flamesLit ? 1 : 0, transition: `opacity 0.5s ease ${flamesLit ? i * 0.12 : 0}s` }}>
            <circle cx={x} cy={FLAME_Y} r="13" fill={`url(#${prefix}halo)`} />
            <ellipse cx={x} cy={FLAME_Y} rx="4" ry="8" fill={`url(#${prefix}fl)`}
              style={{ animation: `candle-flicker ${0.55 + i * 0.17}s ease-in-out infinite`, transformOrigin: `${x}px ${FLAME_Y + 6}px` }} />
            <ellipse cx={x} cy={FLAME_Y + 2} rx="1.5" ry="3" fill="rgba(255,255,255,0.85)" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/* Knife that slices through the middle */
function Knife() {
  return (
    <svg width="44" height="120" viewBox="0 0 44 120" style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.55))" }}>
      <defs>
        <linearGradient id="knife-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f8fafc" /><stop offset="55%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <rect x="14" y="0" width="16" height="30" rx="7" style={{ fill: "var(--cake-gold-2)" }} />
      <rect x="14" y="11" width="16" height="3" fill="rgba(255,255,255,0.35)" />
      <path d="M16 30 L28 30 L23.5 108 L20 108 Z" fill="url(#knife-blade)" />
    </svg>
  );
}

/**
 * The cake-cutting moment — the emotional climax of the whole experience.
 * Three-step ritual (tap-only): light the candles → make a wish and blow →
 * cut. Custom cake photos (useImage) skip the candle ritual.
 * Every colour follows the active theme.
 */
type Stage = "unlit" | "lit" | "blown" | "cut";
const STEPS: { stage: Stage; label: string; icon: string }[] = [
  { stage: "unlit", label: "Light", icon: "🕯️" },
  { stage: "lit", label: "Wish", icon: "✨" },
  { stage: "blown", label: "Cut", icon: "🔪" },
];
const STAGE_INDEX: Record<Stage, number> = { unlit: 0, lit: 1, blown: 2, cut: 3 };

export default function PageCake({ onNext, playCakeSong }: CakePageProps) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "cake");
  const useImageCfg = (config.cake as { useImage?: boolean }).useImage === true;
  const [imgError, setImgError] = useState(false);
  const useImage = useImageCfg && !imgError;

  const [stage, setStage] = useState<Stage>(useImageCfg ? "blown" : "unlit");
  const [cutting, setCutting] = useState(false);
  const [knife, setKnife] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [sparkling, setSparkling] = useState(false);
  const [burst, setBurst] = useState(false);
  const [flash, setFlash] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const cakeSrc = config.images?.cake ?? "/assets/cake.png";
  const cut = stage === "cut";

  const lightCandles = () => {
    try { navigator.vibrate?.(20); } catch { /* haptics unsupported */ }
    playIgniteSfx();
    setStage("lit");
  };

  const blowCandles = () => {
    try { navigator.vibrate?.([15, 30]); } catch { /* haptics unsupported */ }
    playBlowSfx();
    setStage("blown");
  };

  const cutCake = () => {
    if (cutting) return;
    try { navigator.vibrate?.([30, 40, 60]); } catch { /* haptics unsupported */ }
    setCutting(true);
    setKnife(true);
    playSliceSfx();

    setTimeout(() => {
      setStage("cut");
      setShaking(true);
      setSparkling(true);
      setBurst(true);
      setFlash(true);
      playCelebrateSfx();
      playCakeSong?.();
    }, 620);

    setTimeout(() => setKnife(false), 1150);
    setTimeout(() => setShaking(false), 1350);
    setTimeout(() => setSparkling(false), 1900);
    setTimeout(() => setFlash(false), 2200);
    setTimeout(() => setShowMessage(true), 1250);
    setTimeout(() => setShowButton(true), 2600);
  };

  const handleTap = () => {
    if (cut || cutting) return;
    if (!useImage && stage === "unlit") { lightCandles(); return; }
    if (!useImage && stage === "lit")   { blowCandles(); return; }
    cutCake();
  };

  const hint =
    !useImage && stage === "unlit"
      ? "Tap the cake to light the candles ✨"
      : !useImage && stage === "lit"
      ? "Close your eyes, make a wish… then tap to blow 🌬️"
      : config.cake.tapHint;

  const ariaLabel =
    !useImage && stage === "unlit" ? "Light the candles"
    : !useImage && stage === "lit" ? "Blow out the candles"
    : "Cut the cake";

  const halfStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute", inset: 0,
    clipPath: side === "left" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
    transform: cut
      ? side === "left" ? "translateX(-14px) rotate(-2.5deg)" : "translateX(14px) rotate(2.5deg)"
      : "none",
    transformOrigin: "50% 100%",
    transition: "transform 0.75s var(--ease-luxe)",
    willChange: "transform",
  });

  const current = STAGE_INDEX[stage];

  return (
    <div className="min-h-screen-dvh cake-page" data-stage={stage}>
      <style>{LOCAL_KEYFRAMES}</style>
      <BackgroundEffectsLayer accent="rose" density="medium" zIndex={1} />
      <CelebrationBurst active={burst} intensity="grand" origin={{ x: 0.5, y: 0.5 }} />

      {flash && <div aria-hidden="true" className="cake-flash" />}

      <GlassCard enter className="cake-card">
        <p className="chip" style={{ marginBottom: "12px" }}>🎂 Birthday Wishes</p>
        <StaggeredText
          as="h1"
          text={config.cake.title}
          delay={0.2}
          className="font-script hero-gradient-text pm-title"
          style={{ fontSize: "clamp(1.8rem, 5.4vw, 2.6rem)", lineHeight: "var(--leading-tight)", marginBottom: "6px" }}
        />
        <p className="blur-in pm-subtitle" style={{ fontFamily: bodyFont, marginBottom: "16px", animationDelay: "0.5s" }}>
          {config.cake.subtitle}
        </p>

        {/* Ritual progress: Light → Wish → Cut */}
        {!useImage && (
          <ol className="cake-steps" aria-label="Cake ritual progress">
            {STEPS.map((step, i) => (
              <li key={step.stage}
                className={`cake-step${i === current ? " is-current" : ""}${i < current ? " is-done" : ""}`}
                aria-current={i === current ? "step" : undefined}>
                <span className="cake-step-dot" aria-hidden="true">{i < current ? "✓" : step.icon}</span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Cake stage */}
        <div className="cake-stage">
          {!cut && <div className="cake-invite-glow" aria-hidden="true" />}
          <div className="cake-rays-wrap" aria-hidden="true">
            <div className="cake-rays" style={{ opacity: cut ? 0.6 : stage === "lit" ? 0.45 : 0.28 }} />
          </div>
          <div className="cake-spotlight" aria-hidden="true" />

          {cut && ["🎉", "🎈", "💖", "✨", "🎊", "💝"].map((e, i) => (
            <span key={i} aria-hidden="true" className="cake-party" style={{
              left: `${10 + i * 15}%`,
              fontSize: `${18 + (i % 3) * 7}px`,
              animation: `fun-heart-rise ${2.6 + (i % 3) * 0.7}s ease-out ${i * 0.25}s infinite`,
            }}>{e}</span>
          ))}

          <SparkleParticles active={sparkling} />

          <div
            onClick={handleTap}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleTap(); } }}
            role="button"
            tabIndex={cut ? -1 : 0}
            aria-label={ariaLabel}
            className={`cake-hit${cut ? " is-cut" : ""}`}
            style={{
              aspectRatio: useImage ? "1" : `${VIEW_W} / ${VIEW_H}`,
              animation: shaking ? "screen-shake 0.55s ease" : undefined,
            }}
          >
            <div style={halfStyle("left")}>
              {useImage
                ? <img src={cakeSrc} alt="Birthday cake" onError={() => setImgError(true)} className="cake-photo" />
                : <CakeArt flamesLit={stage === "lit"} prefix="cl" />}
            </div>
            <div style={halfStyle("right")}>
              {useImage
                ? <img src={cakeSrc} alt="" aria-hidden="true" className="cake-photo" />
                : <CakeArt flamesLit={stage === "lit"} prefix="cr" />}
            </div>

            {knife && (
              <div className="cake-knife">
                <Knife />
              </div>
            )}

            {(stage === "blown" || cut) && !useImage && CANDLE_X.map((x, i) => (
              <div key={i} className="cake-smoke" style={{
                left: `${(x / VIEW_W) * 100}%`,
                top: `${(FLAME_Y / VIEW_H) * 100}%`,
                animationDelay: `${i * 0.13}s`,
              }} />
            ))}
          </div>
        </div>

        {!cut && (
          <div key={stage} className={`cake-hint${stage === "lit" ? " is-wish" : ""}`}>
            {hint}
          </div>
        )}

        {showMessage && (
          <div className="section-enter cake-wish-card">
            <span className="chip">✨ Wish granted ✨</span>
            <p className="font-script cake-wish-title">Happy Birthday {config.name}! 🎂</p>
            <p className="cake-wish-message" style={{ fontFamily: bodyFont }}>{config.cake.message}</p>
          </div>
        )}

        <GlowButton onClick={onNext} style={{
          opacity: showButton ? 1 : 0,
          transform: showButton ? "translateY(0)" : "translateY(12px)",
          pointerEvents: showButton ? "all" : "none",
          transition: "opacity var(--dur-slow) var(--ease-entrance), transform var(--dur-slow) var(--ease-entrance)",
        }}>
          {config.cake.buttonText}
        </GlowButton>
      </GlassCard>
    </div>
  );
}
