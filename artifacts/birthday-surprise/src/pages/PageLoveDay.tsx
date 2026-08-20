import { useEffect, useRef, useState } from "react";
import CelebrationBurst from "@/components/CelebrationBurst";
import GlassCard from "@/components/GlassCard";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";
import { getOccasionContent } from "@/lib/occasions";
import { prefersReducedMotion } from "@/lib/motion";

interface LoveDayPageProps {
  onNext: () => void;
  playCakeSong?: () => void;
}

/* ── Web Audio — module-level context (same pattern as PageCake) ─────── */
let sfxCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!sfxCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      sfxCtx = new AC();
    }
    if (sfxCtx.state === "suspended") sfxCtx.resume();
    return sfxCtx;
  } catch {
    return null;
  }
}

// Soft mechanical click + rising two-note shimmer
function playUnlockSfx() {
  const c = getCtx();
  if (!c) return;
  try {
    // Mechanical click — short noise burst
    const clickDur = 0.06;
    const clickBuf = c.createBuffer(
      1,
      Math.floor(c.sampleRate * clickDur),
      c.sampleRate,
    );
    const cd = clickBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++)
      cd[i] = (Math.random() * 2 - 1) * (1 - i / cd.length) * 0.8;
    const clickSrc = c.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickHp = c.createBiquadFilter();
    clickHp.type = "highpass";
    clickHp.frequency.value = 800;
    const clickG = c.createGain();
    clickG.gain.value = 0.25;
    clickSrc.connect(clickHp);
    clickHp.connect(clickG);
    clickG.connect(c.destination);
    clickSrc.start();

    // Rising two-note shimmer (E5 → G#5)
    [659.25, 830.61].forEach((freq, i) => {
      const t = c.currentTime + 0.08 + i * 0.2;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.6);
    });

    // Soft sparkle tail
    const o3 = c.createOscillator();
    const g3 = c.createGain();
    o3.type = "sine";
    o3.frequency.value = 1046.5;
    g3.gain.setValueAtTime(0.08, c.currentTime + 0.45);
    g3.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
    o3.connect(g3);
    g3.connect(c.destination);
    o3.start(c.currentTime + 0.45);
    o3.stop(c.currentTime + 0.95);
  } catch {
    /* blocked AudioContext */
  }
}

/* ── Local keyframes ─────────────────────────────────────────────────── */
const LOCAL_KEYFRAMES = `
@keyframes heart-breathe {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(236,72,153,0.55)); }
  50%       { transform: scale(1.07); filter: drop-shadow(0 0 28px rgba(236,72,153,0.85)); }
}
@keyframes shackle-open {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(-55deg); }
}
@keyframes lock-split {
  0%   { transform: translateY(0); }
  100% { transform: translateY(4px); }
}
@keyframes lock-glow-spike {
  0%   { opacity: 0; transform: scale(0.8); }
  40%  { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0.5; transform: scale(1); }
}
@keyframes lock-bounce {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.12); }
  55%  { transform: scale(0.94); }
  75%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}
@keyframes love-shimmer {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
`;

/* ── Heart-shaped padlock SVG ────────────────────────────────────────── */
type LockPhase = "idle" | "animating" | "revealed";

function HeartLock({ phase }: { phase: LockPhase }) {
  const reduced = prefersReducedMotion();
  const unlocked = phase === "animating" || phase === "revealed";

  return (
    <svg
      viewBox="0 0 200 220"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="ld-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#be185d" />
        </linearGradient>
        <linearGradient id="ld-lock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id="ld-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(236,72,153,0.7)" />
          <stop offset="100%" stopColor="rgba(236,72,153,0)" />
        </radialGradient>
        <filter id="ld-blur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="ld-glow-filter">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow bloom on unlock */}
      {unlocked && (
        <circle
          cx="100"
          cy="130"
          r="80"
          fill="url(#ld-glow)"
          filter="url(#ld-blur)"
          style={{
            animation: reduced ? "none" : "lock-glow-spike 0.7s ease-out forwards",
          }}
        />
      )}

      {/* ── Shackle (rotates up on unlock) ──────────────────── */}
      <g
        style={{
          transformOrigin: "70px 100px",
          animation:
            unlocked && !reduced
              ? "shackle-open 0.45s cubic-bezier(0.22,1,0.36,1) 0.1s forwards"
              : "none",
        }}
      >
        <path
          d="M 70 100 L 70 72 Q 70 48 100 48 Q 130 48 130 72 L 130 100"
          fill="none"
          stroke="url(#ld-lock)"
          strokeWidth="14"
          strokeLinecap="round"
          filter="url(#ld-glow-filter)"
        />
      </g>

      {/* ── Lock body — heart shape ──────────────────────────── */}
      <g
        style={{
          animation:
            unlocked && !reduced
              ? "lock-split 0.35s cubic-bezier(0.22,1,0.36,1) 0.3s forwards"
              : "none",
        }}
      >
        {/* Heart path */}
        <path
          d="M 100 190
             C 60 165 30 140 30 110
             C 30 85 50 72 70 72
             C 82 72 92 78 100 88
             C 108 78 118 72 130 72
             C 150 72 170 85 170 110
             C 170 140 140 165 100 190 Z"
          fill="url(#ld-heart)"
          filter="url(#ld-glow-filter)"
        />
        {/* Highlight */}
        <ellipse
          cx="85"
          cy="95"
          rx="18"
          ry="12"
          fill="rgba(255,255,255,0.18)"
          transform="rotate(-20, 85, 95)"
        />

        {/* Keyhole */}
        <circle cx="100" cy="128" r="10" fill="rgba(0,0,0,0.35)" />
        <rect
          x="96"
          y="128"
          width="8"
          height="14"
          rx="3"
          fill="rgba(0,0,0,0.35)"
        />
      </g>

      {/* Bounce wrapper on unlock */}
      {unlocked && (
        <g
          style={{
            transformOrigin: "100px 130px",
            animation: reduced
              ? "none"
              : "lock-bounce 0.6s cubic-bezier(0.22,1,0.36,1) 0.35s both",
          }}
        >
          {/* Sparkle dots */}
          {[
            [60, 80],
            [140, 80],
            [50, 140],
            [150, 140],
            [100, 60],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={["#f9a8d4", "#c084fc", "#fde68a", "#a78bfa", "#fbcfe8"][i]}
              opacity="0.9"
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/* ── Main page component ─────────────────────────────────────────────── */
export default function PageLoveDay({ onNext, playCakeSong }: LoveDayPageProps) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "cake");
  const content = getOccasionContent(config, "loveday");
  const reduced = prefersReducedMotion();

  const [phase, setPhase] = useState<LockPhase>("idle");
  const [burst, setBurst] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const handleTap = () => {
    if (phase !== "idle") return;
    setPhase("animating");

    try {
      navigator.vibrate?.([15, 20, 40]);
    } catch {
      /* haptics unsupported */
    }

    // Audio inside user gesture
    playUnlockSfx();
    playCakeSong?.();

    if (reduced) {
      setPhase("revealed");
      setBurst(true);
      setShowMessage(true);
      schedule(() => setShowButton(true), 400);
      return;
    }

    // ~1s animation then reveal
    schedule(() => {
      setPhase("revealed");
      setBurst(true);
    }, 1000);
    schedule(() => setShowMessage(true), 1200);
    schedule(() => setShowButton(true), 2000);
  };

  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "calc(56px + env(safe-area-inset-top, 0px)) 20px calc(28px + env(safe-area-inset-bottom, 0px))",
        position: "relative",
        zIndex: 5,
      }}
    >
      <style>{LOCAL_KEYFRAMES}</style>
      <BackgroundEffectsLayer accent="pink" density="medium" zIndex={1} />
      <CelebrationBurst
        active={burst}
        intensity="grand"
        origin={{ x: 0.5, y: 0.5 }}
      />

      <GlassCard
        enter
        style={{
          maxWidth: "430px",
          width: "100%",
          padding: "32px 26px",
          textAlign: "center",
          position: "relative",
          zIndex: 5,
        }}
      >
        <p className="chip" style={{ marginBottom: "12px" }}>
          ❤️ Love Day
        </p>

        <StaggeredText
          as="h1"
          text={content.title}
          delay={0.2}
          className="font-script hero-gradient-text"
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.5rem)",
            lineHeight: "var(--leading-tight)",
            marginBottom: "6px",
            filter: "drop-shadow(0 0 20px rgba(236,72,153,0.45))",
          }}
        />

        {/* Tap target — heart padlock */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
            marginTop: "12px",
          }}
        >
          {/* Breathing glow */}
          {phase === "idle" && !reduced && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "5%",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)",
                animation: "heart-breathe 2.2s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          <button
            type="button"
            onClick={handleTap}
            disabled={phase !== "idle"}
            aria-label={
              phase === "idle"
                ? "Tap to unlock the heart"
                : "Unlocking the heart"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTap();
              }
            }}
            style={{
              background: "none",
              border: "none",
              cursor: phase === "idle" ? "pointer" : "default",
              padding: 0,
              width: "min(72vw, 240px)",
              aspectRatio: "200 / 220",
              display: "block",
              minHeight: "44px",
            }}
          >
            <HeartLock phase={phase} />
          </button>
        </div>

        {/* Tap hint */}
        {phase === "idle" && (
          <div
            style={{
              marginBottom: "18px",
              padding: "9px 22px",
              borderRadius: "var(--rad-pill)",
              display: "inline-block",
              background: "rgba(236,72,153,0.07)",
              border: "1px solid rgba(236,72,153,0.25)",
              color: "rgba(249,168,212,0.8)",
              fontSize: "12.5px",
              letterSpacing: "0.05em",
              animation: reduced
                ? "none"
                : "love-shimmer 2.4s ease-in-out infinite",
            }}
          >
            Tap to unlock the heart 🔓
          </div>
        )}

        {/* Message reveal */}
        {showMessage && (
          <div
            className="section-enter"
            style={{
              background:
                "linear-gradient(165deg, rgba(236,72,153,0.1), rgba(124,58,237,0.08))",
              border: "1px solid rgba(236,72,153,0.28)",
              borderRadius: "var(--rad-lg)",
              padding: "18px",
              marginBottom: "22px",
              boxShadow:
                "0 0 24px rgba(236,72,153,0.18), 0 0 0 1px rgba(255,255,255,0.03) inset",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: "1.5rem",
                  display: "inline-block",
                  animation: reduced
                    ? "none"
                    : "teddy-bounce 1.3s ease-in-out infinite",
                }}
              >
                ❤️
              </span>
              <span className="chip">✨ Unlocked with love ✨</span>
              <span
                aria-hidden="true"
                style={{
                  fontSize: "1.5rem",
                  display: "inline-block",
                  animation: reduced
                    ? "none"
                    : "teddy-bounce 1.3s ease-in-out 0.35s infinite",
                }}
              >
                💕
              </span>
            </div>
            <p
              style={{
                color: "rgba(249,168,212,0.92)",
                fontSize: "1.05rem",
                lineHeight: "var(--leading-relaxed)",
                fontFamily: bodyFont,
              }}
            >
              {content.message}
            </p>
          </div>
        )}

        <GlowButton
          onClick={onNext}
          style={{
            background:
              "linear-gradient(135deg, #9d174d, #ec4899, #7c3aed)",
            opacity: showButton ? 1 : 0,
            transform: showButton ? "translateY(0)" : "translateY(12px)",
            pointerEvents: showButton ? "all" : "none",
            transition:
              "opacity var(--dur-slow) var(--ease-entrance), transform var(--dur-slow) var(--ease-entrance)",
          }}
        >
          {content.buttonText}
        </GlowButton>
      </GlassCard>
    </div>
  );
}
