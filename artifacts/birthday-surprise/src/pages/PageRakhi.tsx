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

interface RakhiPageProps {
  onNext: () => void;
  playCakeSong?: () => void;
}

// ── Rakhi-specific accent colours (warm gold + maroon) ───────────────────
// These stay warm regardless of the active themeId. Page background / card
// chrome still come from the existing theme CSS vars.
const GOLD = "#E8B44A";
const GOLD_LIGHT = "#F5D07A";
const MAROON = "#8C1D28";
const MAROON_LIGHT = "#C0394A";

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

// Soft silk-slide filtered-noise whoosh + warm two-note temple-bell chime
function playTieSfx() {
  const c = getCtx();
  if (!c) return;
  try {
    // Silk whoosh — filtered noise sweep
    const dur = 0.55;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.6;
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(2200, c.currentTime);
    bp.frequency.exponentialRampToValueAtTime(600, c.currentTime + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(c.destination);
    src.start();

    // Warm two-note temple bell chime (gentle, ~0.6s, gain <= 0.2)
    const notes = [523.25, 659.25]; // C5 + E5
    notes.forEach((freq, i) => {
      const t = c.currentTime + 0.18 + i * 0.18;
      const o = c.createOscillator();
      const og = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      og.gain.setValueAtTime(0.18, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(og);
      og.connect(c.destination);
      o.start(t);
      o.stop(t + 0.6);
    });
  } catch {
    /* blocked AudioContext — silently ignore */
  }
}

/* ── Local keyframes ─────────────────────────────────────────────────── */
const LOCAL_KEYFRAMES = `
@keyframes rakhi-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px ${GOLD}88); }
  50%       { transform: scale(1.06); filter: drop-shadow(0 0 24px ${GOLD}cc); }
}
@keyframes rakhi-slide-on {
  0%   { transform: translateX(60px) rotate(-8deg); opacity: 0.4; }
  60%  { transform: translateX(-4px) rotate(2deg); opacity: 1; }
  80%  { transform: translateX(3px) rotate(-1deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
@keyframes knot-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.18); }
  80%  { transform: scale(0.94); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes flower-settle {
  0%   { transform: scale(0.3) rotate(-30deg); opacity: 0; }
  70%  { transform: scale(1.12) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes thread-tighten {
  0%   { stroke-dashoffset: 120; }
  100% { stroke-dashoffset: 0; }
}
@keyframes rakhi-shimmer {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
`;

/* ── Rakhi SVG art ───────────────────────────────────────────────────── */
type RakhiPhase = "idle" | "animating" | "revealed";

function RakhiArt({ phase }: { phase: RakhiPhase }) {
  const tied = phase === "animating" || phase === "revealed";
  const reduced = prefersReducedMotion();

  return (
    <svg
      viewBox="0 0 280 200"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="rk-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c5a3" />
          <stop offset="100%" stopColor="#e8a882" />
        </linearGradient>
        <linearGradient id="rk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={GOLD_LIGHT} />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
        <linearGradient id="rk-maroon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={MAROON_LIGHT} />
          <stop offset="100%" stopColor={MAROON} />
        </linearGradient>
        <filter id="rk-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Forearm / wrist ─────────────────────────────────── */}
      {/* Forearm — soft rounded rectangle */}
      <rect x="60" y="90" width="160" height="68" rx="34" fill="url(#rk-skin)" />
      {/* Wrist highlight */}
      <ellipse cx="140" cy="90" rx="80" ry="10" fill="rgba(255,255,255,0.18)" />
      {/* Knuckle hint */}
      <ellipse cx="218" cy="124" rx="12" ry="9" fill="#e8a882" />
      <ellipse cx="218" cy="124" rx="7" ry="5" fill="rgba(255,255,255,0.12)" />

      {/* ── Thread on wrist (animates in when tied) ──────────── */}
      {tied && (
        <path
          d="M 90 108 Q 140 96 190 108 Q 200 116 190 124 Q 140 136 90 124 Q 80 116 90 108 Z"
          fill="none"
          stroke={GOLD}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="120"
          strokeDashoffset="0"
          style={{
            animation: reduced
              ? "none"
              : "thread-tighten 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
          filter="url(#rk-glow)"
        />
      )}

      {/* ── Rakhi charm (slides on when tied, pulses when idle) ─ */}
      <g
        style={{
          animation:
            !tied && !reduced
              ? "rakhi-pulse 2.2s ease-in-out infinite"
              : tied && !reduced
              ? "rakhi-slide-on 0.7s cubic-bezier(0.22,1,0.36,1) forwards"
              : "none",
          transformOrigin: "140px 116px",
        }}
      >
        {/* Charm disc */}
        <circle cx="140" cy="116" r="22" fill="url(#rk-maroon)" filter="url(#rk-glow)" />
        <circle cx="140" cy="116" r="18" fill="url(#rk-gold)" />
        <circle cx="140" cy="116" r="12" fill={MAROON} />
        <circle cx="140" cy="116" r="7" fill={GOLD_LIGHT} />
        {/* Om / decorative centre dot */}
        <circle cx="140" cy="116" r="3" fill={MAROON} />

        {/* Flower petals around the charm */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const px = 140 + Math.cos(rad) * 14;
          const py = 116 + Math.sin(rad) * 14;
          return (
            <ellipse
              key={i}
              cx={px}
              cy={py}
              rx="5"
              ry="3"
              fill={i % 2 === 0 ? GOLD_LIGHT : MAROON_LIGHT}
              transform={`rotate(${deg}, ${px}, ${py})`}
              style={{
                animation:
                  tied && !reduced
                    ? `flower-settle 0.6s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.04}s both`
                    : "none",
              }}
            />
          );
        })}
      </g>

      {/* ── Knot (appears after slide) ───────────────────────── */}
      {tied && (
        <g
          style={{
            animation: reduced
              ? "none"
              : "knot-pop 0.45s cubic-bezier(0.22,1,0.36,1) 0.55s both",
          }}
        >
          <ellipse cx="162" cy="108" rx="7" ry="5" fill={GOLD} opacity="0.9" />
          <ellipse cx="162" cy="124" rx="7" ry="5" fill={GOLD} opacity="0.9" />
          <path
            d="M 162 108 Q 168 116 162 124"
            fill="none"
            stroke={GOLD_LIGHT}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

/* ── Main page component ─────────────────────────────────────────────── */
export default function PageRakhi({ onNext, playCakeSong }: RakhiPageProps) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "cake");
  const content = getOccasionContent(config, "rakshabandhan");
  const reduced = prefersReducedMotion();

  const [phase, setPhase] = useState<RakhiPhase>("idle");
  const [burst, setBurst] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup all timers on unmount to prevent setState-after-unmount
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

    // Start audio inside the user-gesture handler
    try {
      navigator.vibrate?.([20, 30, 20]);
    } catch {
      /* haptics unsupported */
    }
    playTieSfx();
    playCakeSong?.();

    if (reduced) {
      // Skip animation, go straight to revealed
      setPhase("revealed");
      setBurst(true);
      setShowMessage(true);
      schedule(() => setShowButton(true), 400);
      return;
    }

    // ~1.2s animation then reveal
    schedule(() => {
      setPhase("revealed");
      setBurst(true);
    }, 1200);
    schedule(() => setShowMessage(true), 1400);
    schedule(() => setShowButton(true), 2200);
  };

  // Build title — weave siblingName in naturally if set
  const siblingName = content.siblingName;
  const displayTitle =
    siblingName && siblingName.trim().length > 0
      ? content.title.replace(/!/, `, ${siblingName.trim()}!`)
      : content.title;

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
      <BackgroundEffectsLayer accent="rose" density="medium" zIndex={1} />
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
          🪢 Rakhi Wishes
        </p>

        <StaggeredText
          as="h1"
          text={displayTitle}
          delay={0.2}
          className="font-script hero-gradient-text"
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.5rem)",
            lineHeight: "var(--leading-tight)",
            marginBottom: "6px",
            filter: `drop-shadow(0 0 20px ${GOLD}55)`,
          }}
        />

        {/* Tap target — the rakhi art */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
            marginTop: "12px",
          }}
        >
          {/* Invite glow behind the art */}
          {phase === "idle" && !reduced && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "10%",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`,
                animation: "rakhi-pulse 2.2s ease-in-out infinite",
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
                ? "Tap to tie the rakhi"
                : "Rakhi is being tied"
            }
            style={{
              background: "none",
              border: "none",
              cursor: phase === "idle" ? "pointer" : "default",
              padding: 0,
              width: "min(72vw, 280px)",
              aspectRatio: "280 / 200",
              display: "block",
              // Ensure tap target >= 44px (the SVG is much larger)
              minHeight: "44px",
            }}
          >
            <RakhiArt phase={phase} />
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
              background: `rgba(232,180,74,0.08)`,
              border: `1px solid ${GOLD}44`,
              color: `${GOLD_LIGHT}cc`,
              fontSize: "12.5px",
              letterSpacing: "0.05em",
              animation: reduced
                ? "none"
                : "rakhi-shimmer 2.4s ease-in-out infinite",
            }}
          >
            Tap to tie the rakhi 🪢
          </div>
        )}

        {/* Message reveal */}
        {showMessage && (
          <div
            className="section-enter"
            style={{
              background: `linear-gradient(165deg, ${GOLD}18, ${MAROON}12)`,
              border: `1px solid ${GOLD}44`,
              borderRadius: "var(--rad-lg)",
              padding: "18px",
              marginBottom: "22px",
              boxShadow: `0 0 24px ${GOLD}22, 0 0 0 1px rgba(255,255,255,0.03) inset`,
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
                🪢
              </span>
              <span className="chip">✨ Rakhi tied with love ✨</span>
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
                💛
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
            background: `linear-gradient(135deg, ${MAROON}, ${GOLD}, ${MAROON_LIGHT})`,
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
