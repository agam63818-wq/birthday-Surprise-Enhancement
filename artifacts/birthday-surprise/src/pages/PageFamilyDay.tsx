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

interface FamilyDayPageProps {
  onNext: () => void;
  playCakeSong?: () => void;
  occasion: "fathersday" | "mothersday";
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

// Father's Day: gentle warm lantern glow chime
function playGlowSfx() {
  const c = getCtx();
  if (!c) return;
  try {
    // Warm amber hum
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(330, c.currentTime + 0.3);
    g.gain.setValueAtTime(0.14, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.75);

    // Warm overtone shimmer
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = "sine";
    o2.frequency.value = 440;
    g2.gain.setValueAtTime(0.08, c.currentTime + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
    o2.connect(g2);
    g2.connect(c.destination);
    o2.start(c.currentTime + 0.15);
    o2.stop(c.currentTime + 0.85);
  } catch {
    /* blocked AudioContext */
  }
}

// Mother's Day: soft flower-bloom shimmer
function playBloomSfx() {
  const c = getCtx();
  if (!c) return;
  try {
    // Rising petal shimmer — ascending arpeggio
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const t = c.currentTime + i * 0.14;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.13, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.6);
    });

    // Soft noise bloom
    const dur = 0.4;
    const buf = c.createBuffer(
      1,
      Math.floor(c.sampleRate * dur),
      c.sampleRate,
    );
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] =
        (Math.random() * 2 - 1) *
        Math.sin((i / d.length) * Math.PI) *
        0.4;
    const src = c.createBufferSource();
    src.buffer = buf;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;
    const g = c.createGain();
    g.gain.value = 0.1;
    src.connect(lp);
    lp.connect(g);
    g.connect(c.destination);
    src.start(c.currentTime + 0.05);
  } catch {
    /* blocked AudioContext */
  }
}

/* ── Local keyframes ─────────────────────────────────────────────────── */
const LOCAL_KEYFRAMES = `
@keyframes frame-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(255,180,50,0.5)); }
  50%       { transform: scale(1.04); filter: drop-shadow(0 0 28px rgba(255,180,50,0.8)); }
}
@keyframes frame-reveal {
  0%   { transform: scale(0.85) rotate(-3deg); opacity: 0; }
  60%  { transform: scale(1.04) rotate(1deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes flame-flicker {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  25%       { transform: scaleY(1.08) scaleX(0.94); }
  50%       { transform: scaleY(0.94) scaleX(1.06); }
  75%       { transform: scaleY(1.06) scaleX(0.96); }
}
@keyframes amber-bloom {
  0%   { opacity: 0; transform: scale(0.6); }
  50%  { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 0.45; transform: scale(1); }
}
@keyframes petal-open {
  0%   { transform: scale(0) rotate(-60deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes family-shimmer {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
`;

/* ── Father's Day: Lantern / candle-light frame ──────────────────────── */
function FatherFrame({ revealed }: { revealed: boolean }) {
  const reduced = prefersReducedMotion();
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="fd-amber" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        <radialGradient id="fd-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(251,191,36,0.6)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
        <filter id="fd-blur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Amber bloom glow behind frame */}
      {revealed && (
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="url(#fd-glow)"
          filter="url(#fd-blur)"
          style={{
            animation: reduced ? "none" : "amber-bloom 0.8s ease-out forwards",
          }}
        />
      )}

      {/* Decorative frame */}
      <rect
        x="28"
        y="28"
        width="144"
        height="144"
        rx="16"
        fill="none"
        stroke="url(#fd-amber)"
        strokeWidth="5"
      />
      <rect
        x="36"
        y="36"
        width="128"
        height="128"
        rx="12"
        fill="rgba(251,191,36,0.06)"
        stroke="rgba(251,191,36,0.3)"
        strokeWidth="1.5"
      />

      {/* Corner ornaments */}
      {[
        [28, 28],
        [172, 28],
        [28, 172],
        [172, 172],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="6"
          fill="#fbbf24"
          opacity="0.85"
        />
      ))}

      {/* Candle flame (Father's Day) */}
      <g transform="translate(100, 100)">
        {/* Flame glow */}
        <ellipse
          cx="0"
          cy="-8"
          rx="18"
          ry="22"
          fill="rgba(251,191,36,0.2)"
          filter="url(#fd-blur)"
        />
        {/* Flame body */}
        <path
          d="M0 10 C-8 0 -10 -12 0 -22 C10 -12 8 0 0 10 Z"
          fill="url(#fd-amber)"
          style={{
            animation:
              !reduced ? "flame-flicker 0.8s ease-in-out infinite" : "none",
            transformOrigin: "0px 10px",
          }}
        />
        {/* Candle body */}
        <rect x="-6" y="10" width="12" height="28" rx="3" fill="#fef3c7" />
        <rect x="-6" y="10" width="12" height="5" rx="2" fill="rgba(251,191,36,0.4)" />
        {/* Wick */}
        <line x1="0" y1="10" x2="0" y2="-2" stroke="#78350f" strokeWidth="1.5" />
      </g>

      {/* Dad emoji */}
      <text x="100" y="168" textAnchor="middle" fontSize="22">
        👨‍👧
      </text>
    </svg>
  );
}

/* ── Mother's Day: Flower-bloom frame ───────────────────────────────── */
function MotherFrame({ revealed }: { revealed: boolean }) {
  const reduced = prefersReducedMotion();
  const petalAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const petalColors = [
    "#f9a8d4",
    "#f472b6",
    "#ec4899",
    "#f9a8d4",
    "#f472b6",
    "#ec4899",
    "#f9a8d4",
    "#f472b6",
  ];

  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="md-pink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fce7f3" />
          <stop offset="100%" stopColor="#f9a8d4" />
        </radialGradient>
        <radialGradient id="md-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(249,168,212,0.5)" />
          <stop offset="100%" stopColor="rgba(249,168,212,0)" />
        </radialGradient>
        <filter id="md-blur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Soft pink bloom glow */}
      {revealed && (
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="url(#md-bloom)"
          filter="url(#md-blur)"
          style={{
            animation: reduced ? "none" : "amber-bloom 0.8s ease-out forwards",
          }}
        />
      )}

      {/* Decorative frame */}
      <rect
        x="28"
        y="28"
        width="144"
        height="144"
        rx="16"
        fill="none"
        stroke="url(#md-pink)"
        strokeWidth="5"
      />
      <rect
        x="36"
        y="36"
        width="128"
        height="128"
        rx="12"
        fill="rgba(249,168,212,0.06)"
        stroke="rgba(249,168,212,0.3)"
        strokeWidth="1.5"
      />

      {/* Flower petals (bloom open on reveal) */}
      {petalAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const px = 100 + Math.cos(rad) * 52;
        const py = 100 + Math.sin(rad) * 52;
        return (
          <ellipse
            key={i}
            cx={px}
            cy={py}
            rx="10"
            ry="6"
            fill={petalColors[i]}
            opacity="0.85"
            transform={`rotate(${deg + 90}, ${px}, ${py})`}
            style={{
              animation:
                revealed && !reduced
                  ? `petal-open 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s both`
                  : "none",
            }}
          />
        );
      })}

      {/* Centre flower */}
      <circle cx="100" cy="100" r="14" fill="#fce7f3" />
      <circle cx="100" cy="100" r="8" fill="#f9a8d4" />
      <circle cx="100" cy="100" r="4" fill="#ec4899" />

      {/* Mum emoji */}
      <text x="100" y="168" textAnchor="middle" fontSize="22">
        👩‍👧
      </text>
    </svg>
  );
}

/* ── Photo frame with fallback ───────────────────────────────────────── */
function PhotoFrame({
  photoSrc,
  occasion,
  revealed,
}: {
  photoSrc: string | null;
  occasion: "fathersday" | "mothersday";
  revealed: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const showPhoto = photoSrc && !imgError;

  return (
    <div
      style={{
        position: "relative",
        width: "min(72vw, 240px)",
        aspectRatio: "1",
        margin: "0 auto",
      }}
    >
      {showPhoto ? (
        <>
          {/* Decorative frame border */}
          <div
            style={{
              position: "absolute",
              inset: "-8px",
              borderRadius: "20px",
              border: `3px solid ${occasion === "fathersday" ? "rgba(251,191,36,0.6)" : "rgba(249,168,212,0.6)"}`,
              boxShadow:
                occasion === "fathersday"
                  ? "0 0 24px rgba(251,191,36,0.3)"
                  : "0 0 24px rgba(249,168,212,0.3)",
              pointerEvents: "none",
            }}
          />
          <img
            src={photoSrc}
            alt={
              occasion === "fathersday"
                ? "Father's Day photo"
                : "Mother's Day photo"
            }
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "14px",
              display: "block",
            }}
          />
        </>
      ) : (
        /* Tasteful decorative placeholder when no photo */
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {occasion === "fathersday" ? (
            <FatherFrame revealed={revealed} />
          ) : (
            <MotherFrame revealed={revealed} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page component ─────────────────────────────────────────────── */
export default function PageFamilyDay({
  onNext,
  playCakeSong,
  occasion,
}: FamilyDayPageProps) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "cake");
  const content = getOccasionContent(config, occasion);
  const reduced = prefersReducedMotion();

  const [phase, setPhase] = useState<"idle" | "animating" | "revealed">(
    "idle",
  );
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

  // Get first available photo from memoryWall photos
  const firstPhoto =
    config.memoryWall?.photos?.find((p) => p.src && p.src.trim().length > 0)
      ?.src ?? null;

  const handleTap = () => {
    if (phase !== "idle") return;
    setPhase("animating");

    try {
      navigator.vibrate?.([20, 30, 20]);
    } catch {
      /* haptics unsupported */
    }

    // Play occasion-specific SFX inside user gesture
    if (occasion === "fathersday") {
      playGlowSfx();
    } else {
      playBloomSfx();
    }
    playCakeSong?.();

    if (reduced) {
      setPhase("revealed");
      setBurst(true);
      setShowMessage(true);
      schedule(() => setShowButton(true), 400);
      return;
    }

    schedule(() => {
      setPhase("revealed");
      setBurst(true);
    }, 1000);
    schedule(() => setShowMessage(true), 1200);
    schedule(() => setShowButton(true), 2000);
  };

  const isFather = occasion === "fathersday";
  const accentColor = isFather ? "rgba(251,191,36,0.7)" : "rgba(249,168,212,0.7)";
  const accentBg = isFather ? "rgba(251,191,36,0.08)" : "rgba(249,168,212,0.08)";
  const accentBorder = isFather ? "rgba(251,191,36,0.3)" : "rgba(249,168,212,0.3)";
  const chipLabel = isFather ? "👨‍👧 Father's Day" : "👩‍👧 Mother's Day";

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
      <BackgroundEffectsLayer
        accent={isFather ? "rose" : "pink"}
        density="medium"
        zIndex={1}
      />
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
          {chipLabel}
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
            filter: `drop-shadow(0 0 20px ${accentColor})`,
          }}
        />

        {/* Tap target — photo frame or decorative art */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
            marginTop: "12px",
          }}
        >
          {/* Invite glow */}
          {phase === "idle" && !reduced && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "5%",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${accentColor.replace("0.7", "0.15")} 0%, transparent 70%)`,
                animation: "frame-pulse 2.2s ease-in-out infinite",
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
                ? `Tap to reveal your ${isFather ? "Father's Day" : "Mother's Day"} surprise`
                : "Revealing your surprise"
            }
            style={{
              background: "none",
              border: "none",
              cursor: phase === "idle" ? "pointer" : "default",
              padding: 0,
              width: "min(72vw, 260px)",
              aspectRatio: "1",
              display: "block",
              minHeight: "44px",
              animation:
                phase === "animating" && !reduced
                  ? "frame-reveal 0.8s cubic-bezier(0.22,1,0.36,1) forwards"
                  : "none",
            }}
          >
            <PhotoFrame
              photoSrc={firstPhoto}
              occasion={occasion}
              revealed={phase !== "idle"}
            />
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
              background: accentBg,
              border: `1px solid ${accentBorder}`,
              color: accentColor,
              fontSize: "12.5px",
              letterSpacing: "0.05em",
              animation: reduced
                ? "none"
                : "family-shimmer 2.4s ease-in-out infinite",
            }}
          >
            {isFather
              ? "Tap to light the lantern 🕯️"
              : "Tap to bloom the flowers 🌸"}
          </div>
        )}

        {/* Message reveal */}
        {showMessage && (
          <div
            className="section-enter"
            style={{
              background: `linear-gradient(165deg, ${accentBg}, rgba(124,58,237,0.06))`,
              border: `1px solid ${accentBorder}`,
              borderRadius: "var(--rad-lg)",
              padding: "18px",
              marginBottom: "22px",
              boxShadow: `0 0 24px ${accentColor.replace("0.7", "0.15")}, 0 0 0 1px rgba(255,255,255,0.03) inset`,
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
                {isFather ? "🕯️" : "🌸"}
              </span>
              <span className="chip">
                {isFather ? "✨ With love ✨" : "✨ With love ✨"}
              </span>
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
                {isFather ? "👨‍👧" : "👩‍👧"}
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
            background: isFather
              ? "linear-gradient(135deg, #92400e, #d97706, #fbbf24)"
              : "linear-gradient(135deg, #9d174d, #ec4899, #f9a8d4)",
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
