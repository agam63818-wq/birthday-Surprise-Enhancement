import { useState } from "react";
import Confetti from "@/components/Confetti";
import { useConfig } from "@/contexts/ConfigContext";

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

/* ── Radial sparkle particles that burst on cut ───────────────── */
function SparkleParticles({ active }: { active: boolean }) {
  if (!active) return null;
  const sparks = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * 360;
    const dist = 85 + (i % 3) * 38;
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist,
      color: ["#f9a8d4","#c084fc","#fde68a","#a78bfa","#fbcfe8","#e879f9","#fcd34d"][i % 7],
      size: 5 + (i % 4) * 3,
      delay: `${i * 0.03}s`,
    };
  });
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
    }}>
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

/* ── Hand-crafted celebration cake with the name written on it ─── */
const CANDLE_X = [98, 114, 130, 146, 162];
const CANDLE_COLORS = ["#f9a8d4", "#c084fc", "#a78bfa", "#f472b6", "#818cf8"];

function CakeArt({ flameOut, prefix }: { flameOut: boolean; prefix: string }) {
  const config = useConfig();
  const name = config.name;
  const nameSize = name.length > 9 ? 15 : 19;
  return (
    <svg viewBox="0 0 260 250" width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`${prefix}t1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#be185d"/><stop offset="100%" stopColor="#7e1544"/>
        </linearGradient>
        <linearGradient id={`${prefix}t2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#be185d"/>
        </linearGradient>
        <linearGradient id={`${prefix}t3`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf2f8"/><stop offset="100%" stopColor="#fbcfe8"/>
        </linearGradient>
        <radialGradient id={`${prefix}fl`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fefce8"/><stop offset="55%" stopColor="#fde047"/><stop offset="100%" stopColor="#f97316"/>
        </radialGradient>
        <linearGradient id={`${prefix}pl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(196,181,253,0.5)"/><stop offset="100%" stopColor="rgba(124,58,237,0.25)"/>
        </linearGradient>
      </defs>

      {/* Plate */}
      <ellipse cx="130" cy="231" rx="104" ry="13" fill={`url(#${prefix}pl)`}/>
      <ellipse cx="130" cy="229" rx="96" ry="10" fill="rgba(255,255,255,0.12)"/>

      {/* Bottom tier */}
      <rect x="40" y="166" width="180" height="58" rx="10" fill={`url(#${prefix}t1)`}/>
      <rect x="40" y="166" width="180" height="12" rx="6" fill="rgba(255,255,255,0.12)"/>
      <path d="M40 170 h180 v6 q-10 14 -20 0 q-10 16 -20 0 q-10 12 -20 0 q-10 18 -20 0 q-10 12 -20 0 q-10 16 -20 0 q-10 12 -20 0 q-10 16 -20 0 q-10 14 -20 0 Z" fill="#fdf2f8" opacity="0.92"/>
      <text x="130" y="206" textAnchor="middle" fontSize="10.5" letterSpacing="2.5"
        fontFamily="Inter, sans-serif" fontWeight="600" fill="rgba(255,255,255,0.72)">
        HAPPY BIRTHDAY
      </text>

      {/* Middle tier */}
      <rect x="62" y="122" width="136" height="48" rx="8" fill={`url(#${prefix}t2)`}/>
      <rect x="62" y="122" width="136" height="10" rx="5" fill="rgba(255,255,255,0.14)"/>
      <path d="M62 126 h136 v5 q-8.5 12 -17 0 q-8.5 14 -17 0 q-8.5 10 -17 0 q-8.5 15 -17 0 q-8.5 10 -17 0 q-8.5 14 -17 0 q-8.5 10 -17 0 q-8.5 13 -17 0 Z" fill="#fdf2f8" opacity="0.9"/>
      {/* The name — written on the cake */}
      <text x="130" y="158" textAnchor="middle" fontSize={nameSize}
        fontFamily="'Dancing Script', cursive" fontWeight="700" fill="#fff8fc"
        style={{ filter: "drop-shadow(0 1px 2px rgba(131,24,67,0.9))" }}>
        {name}
      </text>
      {/* Cherries on middle tier edges */}
      <circle cx="74" cy="122" r="4.5" fill="#f43f5e"/>
      <circle cx="72.5" cy="120.5" r="1.4" fill="rgba(255,255,255,0.65)"/>
      <circle cx="186" cy="122" r="4.5" fill="#f43f5e"/>
      <circle cx="184.5" cy="120.5" r="1.4" fill="rgba(255,255,255,0.65)"/>

      {/* Top tier */}
      <rect x="84" y="82" width="92" height="42" rx="7" fill={`url(#${prefix}t3)`}/>
      <path d="M84 86 h92 v4 q-7.6 10 -15.3 0 q-7.6 12 -15.3 0 q-7.6 9 -15.3 0 q-7.6 12 -15.3 0 q-7.6 9 -15.4 0 q-7.7 11 -15.4 0 Z" fill="#ec4899" opacity="0.55"/>
      <path d="M118 108 c0 0 -5 -3.6 -5 -6.6 c0 -2 1.7 -2.9 3.3 -2.1 c0.8 0.4 1.3 1.2 1.7 2 c0.4 -0.8 0.9 -1.6 1.7 -2 c1.6 -0.8 3.3 0.1 3.3 2.1 c0 3 -5 6.6 -5 6.6 Z" fill="rgba(236,72,153,0.75)"/>
      <path d="M142 108 c0 0 -5 -3.6 -5 -6.6 c0 -2 1.7 -2.9 3.3 -2.1 c0.8 0.4 1.3 1.2 1.7 2 c0.4 -0.8 0.9 -1.6 1.7 -2 c1.6 -0.8 3.3 0.1 3.3 2.1 c0 3 -5 6.6 -5 6.6 Z" fill="rgba(192,132,252,0.75)"/>

      {/* Sprinkles */}
      {[[55,192],[85,214],[120,190],[152,212],[182,192],[206,208],[70,146],[100,166],[160,166],[190,148]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="2" fill={["#fde68a","#fbcfe8","#c4b5fd","#a5f3fc"][i%4]} opacity="0.85"/>
      ))}

      {/* Candles + flames */}
      {CANDLE_X.map((x, i) => (
        <g key={i}>
          <rect x={x-3} y="58" width="6" height="25" rx="3" fill={CANDLE_COLORS[i]}/>
          <rect x={x-3} y="63" width="6" height="3" fill="rgba(255,255,255,0.45)"/>
          <rect x={x-3} y="72" width="6" height="3" fill="rgba(255,255,255,0.45)"/>
          <rect x={x-0.6} y="53" width="1.2" height="6" fill="#78350f"/>
          <g style={{
            opacity: flameOut ? 0 : 1,
            transition: "opacity 0.45s ease",
          }}>
            <circle cx={x} cy="48" r="9" fill="rgba(253,224,71,0.18)"/>
            <ellipse cx={x} cy="48" rx="4" ry="7.5" fill={`url(#${prefix}fl)`}
              style={{
                animation: `candle-flicker ${0.55 + i * 0.17}s ease-in-out infinite`,
                transformOrigin: `${x}px 54px`,
              }}/>
          </g>
        </g>
      ))}
    </svg>
  );
}

/* Knife that slices through the middle */
function Knife() {
  return (
    <svg width="44" height="116" viewBox="0 0 44 116" style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" }}>
      <rect x="15" y="0" width="14" height="28" rx="6" fill="#6d28d9"/>
      <rect x="15" y="10" width="14" height="3" fill="rgba(255,255,255,0.25)"/>
      <path d="M16 28 L28 28 L23 104 L20 104 Z" fill="#e2e8f0"/>
      <path d="M22 28 L28 28 L23.5 104 L22 104 Z" fill="#cbd5e1"/>
    </svg>
  );
}

export default function PageCake({ onNext, playCakeSong }: CakePageProps) {
  const config = useConfig();
  const [cut, setCut] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [knife, setKnife] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [sparkling, setSparkling] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [imgError, setImgError] = useState(false);

  const useImage = (config.cake as { useImage?: boolean }).useImage === true && !imgError;
  const cakeSrc = config.images?.cake ?? "/assets/cake.png";

  const handleTap = () => {
    if (cut || cutting) return;
    try { navigator.vibrate?.([30, 40, 60]); } catch { /* haptics unsupported */ }
    setCutting(true);

    // 1. Knife slices down
    setKnife(true);
    playSliceSfx();

    // 2. Cake splits, candles blow out, celebration begins
    setTimeout(() => {
      setCut(true);
      playBlowSfx();
      setShaking(true);
      setSparkling(true);
      setConfetti(true);
      playCelebrateSfx();
      playCakeSong?.();
    }, 620);

    setTimeout(() => setKnife(false), 1150);
    setTimeout(() => setShaking(false), 1350);
    setTimeout(() => setSparkling(false), 1900);
    setTimeout(() => setShowMessage(true), 1250);
    setTimeout(() => setShowButton(true), 2600);
    setTimeout(() => setConfetti(false), 8000);
  };

  const halfStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute", inset: 0,
    clipPath: side === "left" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
    transform: cut
      ? side === "left"
        ? "translateX(-13px) rotate(-2.5deg)"
        : "translateX(13px) rotate(2.5deg)"
      : "none",
    transformOrigin: "50% 100%",
    transition: "transform 0.75s cubic-bezier(0.22,1,0.36,1)",
    willChange: "transform",
  });

  return (
    <div className="min-h-screen-dvh" style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      padding: "calc(56px + env(safe-area-inset-top, 0px)) 20px calc(28px + env(safe-area-inset-bottom, 0px))",
      position: "relative", zIndex: 5,
    }}>
      <Confetti active={confetti} />

      <div className="glass-card-dark page-enter" style={{
        maxWidth: "430px", width: "100%", padding: "32px 26px", textAlign: "center",
      }}>
        <p className="chip" style={{ marginBottom: "12px" }}>🎂 Birthday Wishes</p>
        <h1 className="font-serif" style={{
          fontSize: "clamp(1.7rem,5vw,2.5rem)", lineHeight: 1.25, marginBottom: "6px",
          background: "linear-gradient(135deg,#f9a8d4,#e879f9,#c084fc)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 20px rgba(236,72,153,0.35))",
        }}>
          {config.cake.title}
        </h1>
        <p style={{ color: "rgba(220,185,255,0.5)", fontSize: "13px", fontFamily: "'Dancing Script',cursive", marginBottom: "20px" }}>
          {config.cake.subtitle}
        </p>

        {/* Cake stage */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          {/* Rotating golden celebration rays behind the cake */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute", inset: "-14%", zIndex: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none", overflow: "hidden",
            }}
          >
            <div style={{
              width: "125%", aspectRatio: "1", borderRadius: "50%",
              opacity: cut ? 0.55 : 0.3,
              transition: "opacity 0.8s ease",
              background: "repeating-conic-gradient(rgba(253,224,71,0.16) 0deg 9deg, transparent 9deg 32deg)",
              WebkitMaskImage: "radial-gradient(circle, black 26%, transparent 68%)",
              maskImage: "radial-gradient(circle, black 26%, transparent 68%)",
              animation: "ray-spin 28s linear infinite",
            }} />
          </div>

          {/* Party emojis rising after the cut */}
          {cut && ["🎉", "🎈", "💖", "✨", "🎊", "💝"].map((e, i) => (
            <span key={i} style={{
              position: "absolute", bottom: "6%", left: `${10 + i * 15}%`,
              fontSize: `${18 + (i % 3) * 7}px`, zIndex: 11, pointerEvents: "none",
              animation: `fun-heart-rise ${2.6 + (i % 3) * 0.7}s ease-out ${i * 0.25}s infinite`,
            }}>{e}</span>
          ))}

          <SparkleParticles active={sparkling} />

          <div
            onClick={handleTap}
            role="button"
            aria-label="Cut the cake"
            style={{
              cursor: cut ? "default" : "pointer",
              userSelect: "none",
              position: "relative",
              width: "min(72vw, 280px)",
              aspectRatio: useImage ? "1" : "260 / 250",
              animation: shaking ? "screen-shake 0.55s ease" : undefined,
              filter: cut
                ? "drop-shadow(0 16px 48px rgba(236,72,153,0.65)) drop-shadow(0 0 60px rgba(192,132,252,0.35))"
                : "drop-shadow(0 12px 34px rgba(236,72,153,0.4))",
              transition: "filter 0.5s ease",
            }}
          >
            {/* Two halves — they separate when the knife cuts through */}
            <div style={halfStyle("left")}>
              {useImage
                ? <img src={cakeSrc} alt="Birthday cake" onError={() => setImgError(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "18px", display: "block" }}/>
                : <CakeArt flameOut={cut} prefix="cl" />}
            </div>
            <div style={halfStyle("right")}>
              {useImage
                ? <img src={cakeSrc} alt="" aria-hidden="true"
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "18px", display: "block" }}/>
                : <CakeArt flameOut={cut} prefix="cr" />}
            </div>

            {/* Knife slice */}
            {knife && (
              <div style={{
                position: "absolute", left: "50%", top: "-6%", zIndex: 6,
                animation: "knife-cut 1.1s cubic-bezier(0.4,0,0.2,1) forwards",
                pointerEvents: "none",
              }}>
                <Knife />
              </div>
            )}

            {/* Candle smoke after blow-out */}
            {cut && !useImage && CANDLE_X.map((x, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${(x / 260) * 100}%`, top: "17%",
                width: "9px", height: "9px", borderRadius: "50%",
                background: "rgba(203,213,225,0.55)",
                filter: "blur(2px)",
                animation: `smoke-rise 1.7s ease-out ${i * 0.13}s both`,
                pointerEvents: "none",
              }} />
            ))}
          </div>
        </div>

        {/* Tap hint */}
        {!cut && (
          <div style={{
            marginBottom: "18px", padding: "9px 22px",
            borderRadius: "20px", display: "inline-block",
            background: "rgba(236,72,153,0.07)",
            border: "1px solid rgba(236,72,153,0.22)",
            color: "rgba(249,168,212,0.7)", fontSize: "12.5px",
            letterSpacing: "0.05em",
            animation: "pulse-glow 2.4s ease-in-out infinite",
          }}>
            {config.cake.tapHint}
          </div>
        )}

        {showMessage && (
          <div className="page-enter" style={{
            background: "linear-gradient(165deg, rgba(236,72,153,0.1), rgba(124,58,237,0.08))",
            border: "1px solid rgba(236,72,153,0.28)",
            borderRadius: "18px", padding: "18px", marginBottom: "22px",
            boxShadow: "0 14px 40px rgba(236,72,153,0.12), 0 0 0 1px rgba(255,255,255,0.03) inset",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
              <span aria-hidden="true" style={{ fontSize: "1.5rem", display: "inline-block", animation: "teddy-bounce 1.3s ease-in-out infinite" }}>🧸</span>
              <span className="chip">✨ Wish granted ✨</span>
              <span aria-hidden="true" style={{ fontSize: "1.5rem", display: "inline-block", animation: "teddy-bounce 1.3s ease-in-out 0.35s infinite" }}>🐻</span>
            </div>
            <p className="shimmer-text font-serif" style={{ fontSize: "1.45rem", marginBottom: "8px" }}>
              Happy Birthday {config.name}! 🎂
            </p>
            <p className="font-serif" style={{
              color: "rgba(249,168,212,0.92)", fontSize: "1.05rem", lineHeight: 1.85,
            }}>
              {config.cake.message}
            </p>
          </div>
        )}

        <button className="btn-primary" onClick={onNext} style={{
          background: "linear-gradient(135deg,#7c1d6f,#be185d,#7c3aed)",
          opacity: showButton ? 1 : 0,
          transform: showButton ? "translateY(0)" : "translateY(12px)",
          pointerEvents: showButton ? "all" : "none",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          {config.cake.buttonText}
        </button>
      </div>
    </div>
  );
}
