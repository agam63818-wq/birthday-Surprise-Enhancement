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

// ── Hero photography ─────────────────────────────────────────────────────
// Two real reference images drive the whole interaction — the thali (rakhi
// resting on the puja plate) and the tied state (hands tying it onto the
// wrist). Both are 768×440 and already match the app's purple/gold look, so
// they are used as-is instead of being redrawn in SVG.
const THALI_SRC = "/assets/rakhi-thali.jpg";
const TIED_SRC = "/assets/rakhi-tied.jpg";
const HERO_RATIO = "768 / 440";

// Where the rakhi sits on the wrist in rakhi-tied.jpg (fraction of the
// image box) — the golden glow pulse is centred here on the final tap.
const WRIST_GLOW = { x: "52%", y: "26%", size: "46%" };

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

// Soft "pick up" chime — a single light, short bell for lifting the rakhi
// off the thali. Deliberately quieter/shorter than playTieSfx so the second
// tap still feels like the bigger moment.
function playPickupSfx() {
  const c = getCtx();
  if (!c) return;
  try {
    const t = c.currentTime + 0.01;
    // Airy two-note lift (G5 → C6), sine, gain <= 0.14
    [783.99, 1046.5].forEach((freq, i) => {
      const start = t + i * 0.09;
      const o = c.createOscillator();
      const og = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      og.gain.setValueAtTime(0.0001, start);
      og.gain.exponentialRampToValueAtTime(0.13, start + 0.02);
      og.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      o.connect(og);
      og.connect(c.destination);
      o.start(start);
      o.stop(start + 0.4);
    });
  } catch {
    /* blocked AudioContext — silently ignore */
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
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50%       { transform: scale(1.06); opacity: 1; }
}
@keyframes rakhi-shimmer {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
/* Golden glow over the wrist at the moment the rakhi is tied */
@keyframes rakhi-wrist-glow {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
  45%  { opacity: 0.6; transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
}
`;

/* ── Interaction phases ──────────────────────────────────────────────── */
// "thali"     — rakhi-thali.jpg, waiting for the first tap
// "tied"      — crossfaded to rakhi-tied.jpg, waiting for the second tap
// "celebrated"— rakhi-tied.jpg + burst / glow / message reveal
type RakhiPhase = "thali" | "tied" | "celebrated";

/* ── Main page component ─────────────────────────────────────────────── */
export default function PageRakhi({ onNext, playCakeSong }: RakhiPageProps) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "cake");
  const content = getOccasionContent(config, "rakshabandhan");
  const reduced = prefersReducedMotion();

  const [phase, setPhase] = useState<RakhiPhase>("thali");
  const [burst, setBurst] = useState(false);
  const [glow, setGlow] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);
  // Both images failing to load must not leave an empty hero — fall back to
  // a warm gold panel with the rakhi emoji.
  const [imgError, setImgError] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Preload both frames on mount so the crossfade on the first tap has no
  // loading delay (the hidden <img> pair below is the belt-and-braces path
  // for browsers that ignore detached Image() requests).
  useEffect(() => {
    [THALI_SRC, TIED_SRC].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

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

  // First tap — pick the rakhi up off the thali (crossfade to the tied art)
  const pickUpRakhi = () => {
    try {
      navigator.vibrate?.(20);
    } catch {
      /* haptics unsupported */
    }
    playPickupSfx();
    setPhase("tied");
  };

  // Second tap — tie it: sound, confetti burst, wrist glow, then the message
  const tieRakhi = () => {
    try {
      navigator.vibrate?.([20, 30, 20]);
    } catch {
      /* haptics unsupported */
    }
    playTieSfx();
    playCakeSong?.();

    setPhase("celebrated");
    setBurst(true);
    setGlow(true);

    if (reduced) {
      setShowMessage(true);
      schedule(() => setShowButton(true), 400);
      return;
    }

    schedule(() => setGlow(false), 1100);
    schedule(() => setShowMessage(true), 800);
    schedule(() => setShowButton(true), 1600);
  };

  const handleTap = () => {
    if (phase === "thali") {
      pickUpRakhi();
      return;
    }
    if (phase === "tied") {
      tieRakhi();
    }
    // "celebrated" — sequence finished, further taps are ignored
  };

  const hint =
    phase === "thali"
      ? "✨ Tap the rakhi to pick it up 👉"
      : phase === "tied"
      ? "✨ Tap again to tie the rakhi 👉"
      : null;

  const ariaLabel =
    phase === "thali"
      ? "Tap to pick up the rakhi"
      : phase === "tied"
      ? "Tap again to tie the rakhi"
      : "Rakhi tied";

  // Build title — weave siblingName in naturally if set
  const siblingName = content.siblingName;
  const displayTitle =
    siblingName && siblingName.trim().length > 0
      ? content.title.replace(/!/, `, ${siblingName.trim()}!`)
      : content.title;

  const showTied = phase === "tied" || phase === "celebrated";
  // Both frames stack exactly on top of each other and are clipped by the
  // button's rounded overflow, so the crossfade never shows a seam.
  const frameStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
    // 300–400ms crossfade, not a hard cut
    transition: reduced ? "none" : "opacity 360ms ease-in-out",
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

        {/* Tap target — the real rakhi photography */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            marginBottom: "16px",
            marginTop: "14px",
          }}
        >
          {/* Invite glow behind the frame while a tap is still pending */}
          {phase !== "celebrated" && !reduced && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "-6%",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${GOLD}26 0%, transparent 70%)`,
                animation: "rakhi-pulse 2.2s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          <button
            type="button"
            onClick={handleTap}
            disabled={phase === "celebrated"}
            aria-label={ariaLabel}
            style={{
              position: "relative",
              background: "none",
              // The gold rim is an inset ring rather than a real border so it
              // sits ON the image edge instead of insetting it by 1px (which
              // left a hairline seam at the frame corners).
              border: "none",
              borderRadius: "var(--rad-lg)",
              cursor: phase === "celebrated" ? "default" : "pointer",
              padding: 0,
              width: "100%",
              maxWidth: "360px",
              aspectRatio: HERO_RATIO,
              // Tap target stays comfortably above 44px at every width
              minHeight: "44px",
              overflow: "hidden",
              display: "block",
              WebkitTapHighlightColor: "transparent",
              boxShadow: `inset 0 0 0 1px ${GOLD}3d, 0 12px 34px rgba(0,0,0,0.42), 0 0 26px ${GOLD}22`,
              transition: "box-shadow 0.5s ease",
            }}
          >
            {imgError ? (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "3.4rem",
                  background: `linear-gradient(165deg, ${GOLD}22, ${MAROON}1f)`,
                }}
              >
                🪢
              </span>
            ) : (
              <>
                {/* State 1 — rakhi resting on the thali */}
                <img
                  src={THALI_SRC}
                  alt="A golden puja thali with a diya, kumkum, rice and the rakhi"
                  onError={() => setImgError(true)}
                  draggable={false}
                  style={{ ...frameStyle, opacity: showTied ? 0 : 1 }}
                />
                {/* State 2 — the rakhi being tied onto the wrist */}
                <img
                  src={TIED_SRC}
                  alt={showTied ? "The rakhi tied onto a wrist" : ""}
                  aria-hidden={showTied ? undefined : true}
                  onError={() => setImgError(true)}
                  draggable={false}
                  style={{ ...frameStyle, opacity: showTied ? 1 : 0 }}
                />
              </>
            )}

            {/* Golden glow pulse over the wrist on the tying tap */}
            {glow && !reduced && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: WRIST_GLOW.x,
                  top: WRIST_GLOW.y,
                  width: WRIST_GLOW.size,
                  aspectRatio: "1",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${GOLD_LIGHT}cc 0%, ${GOLD}66 42%, transparent 72%)`,
                  mixBlendMode: "screen",
                  pointerEvents: "none",
                  animation: "rakhi-wrist-glow 1s ease-out forwards",
                }}
              />
            )}
          </button>
        </div>

        {/* Tap hint — same pill badge style as the "Rakhi Wishes" chip */}
        {hint && (
          <p
            className="chip"
            style={{
              marginBottom: "18px",
              animation: reduced
                ? "none"
                : "rakhi-shimmer 2.4s ease-in-out infinite",
            }}
          >
            {hint}
          </p>
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
            <StaggeredText
              as="p"
              text={content.message}
              delay={0.15}
              stagger={0.045}
              style={{
                color: "rgba(249,168,212,0.92)",
                fontSize: "1.05rem",
                lineHeight: "var(--leading-relaxed)",
                fontFamily: bodyFont,
              }}
            />
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
