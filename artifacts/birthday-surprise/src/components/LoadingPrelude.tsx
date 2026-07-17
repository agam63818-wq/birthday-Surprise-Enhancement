import { useEffect, useMemo, useState } from "react";

/**
 * LoadingPrelude — cinematic themed prelude for the public surprise page.
 *
 * Replaces the old bare spinner with an intentional, magical moment:
 * a glowing pulsing heart, blurred glow orbs, floating sparkles, a
 * shimmering progress bar and rotating anticipation copy.
 *
 * Also renders the premium \"not-found\" and \"error\" states so every
 * pre-experience screen shares the same dark-purple magical identity.
 *
 * Performance: transform/opacity-only CSS animations, a handful of
 * particles, and honors prefers-reduced-motion.
 */

const LOADING_MESSAGES = [
  "Psst… something magical is loading…",
  "Preparing your surprise with love…",
  "Sprinkling stardust on every page…",
  "Almost there — hold your heart…",
];

const KEYFRAMES = `
@keyframes prelude-heart-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 18px rgba(236,72,153,0.55)); }
  50%      { transform: scale(1.12); filter: drop-shadow(0 0 34px rgba(236,72,153,0.85)); }
}
@keyframes prelude-orb-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(4vw, -3vh, 0) scale(1.15); }
}
@keyframes prelude-sparkle-float {
  0%   { transform: translate3d(0, 10vh, 0) scale(0.6); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 0.85; }
  100% { transform: translate3d(0, -80vh, 0) scale(1); opacity: 0; }
}
@keyframes prelude-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
@keyframes prelude-msg-in {
  from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@media (prefers-reduced-motion: reduce) {
  .prelude-anim { animation: none !important; }
}
`;

const shellStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "18px",
  padding: "32px 24px",
  textAlign: "center",
  overflow: "hidden",
  background:
    "radial-gradient(120% 90% at 50% 0%, #1b0a3f 0%, #0d0326 55%, #07011a 100%)",
  color: "#ede9fe",
};

function GlowOrbs() {
  return (
    <>
      <div
        className="prelude-anim"
        style={{
          position: "absolute", top: "12%", left: "14%",
          width: "38vmin", height: "38vmin", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.32), transparent 70%)",
          filter: "blur(30px)", pointerEvents: "none",
          animation: "prelude-orb-drift 11s ease-in-out infinite",
        }}
      />
      <div
        className="prelude-anim"
        style={{
          position: "absolute", bottom: "10%", right: "10%",
          width: "44vmin", height: "44vmin", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.22), transparent 70%)",
          filter: "blur(34px)", pointerEvents: "none",
          animation: "prelude-orb-drift 14s ease-in-out 2s infinite reverse",
        }}
      />
    </>
  );
}

function Sparkles() {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: `${(i * 8.3 + 5) % 94}%`,
        delay: `${(i * 1.4) % 9}s`,
        duration: `${9 + (i * 1.7) % 7}s`,
        size: 8 + (i * 3) % 8,
        glyph: ["✦", "✧", "·", "✩"][i % 4],
        color: [
          "rgba(249,168,212,0.8)",
          "rgba(196,181,253,0.75)",
          "rgba(253,224,71,0.5)",
          "rgba(232,121,249,0.7)",
        ][i % 4],
      })),
    [],
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="prelude-anim"
          style={{
            position: "absolute", bottom: "-4vh", left: s.left,
            fontSize: `${s.size}px`, lineHeight: 1, color: s.color,
            animation: `prelude-sparkle-float ${s.duration} linear ${s.delay} infinite`,
            willChange: "transform, opacity",
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}

function RotatingMessage() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <p
      key={idx}
      className="prelude-anim"
      style={{
        margin: 0,
        fontFamily: "'Dancing Script', cursive",
        fontSize: "clamp(1.35rem, 4.5vw, 1.8rem)",
        color: "#f5d0fe",
        textShadow: "0 0 24px rgba(232,121,249,0.35)",
        animation: "prelude-msg-in 0.7s ease both",
        minHeight: "2.2em",
      }}
    >
      {LOADING_MESSAGES[idx]}
    </p>
  );
}

export type PreludeState = "loading" | "not-found" | "error";

export default function LoadingPrelude({
  state = "loading",
  onRetry,
}: {
  state?: PreludeState;
  onRetry?: () => void;
}) {
  return (
    <div style={shellStyle}>
      <style>{KEYFRAMES}</style>
      <GlowOrbs />
      <Sparkles />

      {state === "loading" && (
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "22px" }}>
          <div
            className="prelude-anim"
            style={{ fontSize: "clamp(3rem, 10vw, 4.2rem)", lineHeight: 1, animation: "prelude-heart-pulse 1.9s ease-in-out infinite" }}
            aria-hidden
          >
            💜
          </div>
          <RotatingMessage />
          {/* Shimmer progress bar */}
          <div
            role="progressbar"
            aria-label="Loading your surprise"
            style={{
              width: "min(220px, 60vw)", height: "4px", borderRadius: "999px",
              background: "rgba(167,139,250,0.15)", overflow: "hidden",
              border: "1px solid rgba(167,139,250,0.12)",
            }}
          >
            <div
              className="prelude-anim"
              style={{
                width: "40%", height: "100%", borderRadius: "999px",
                background: "linear-gradient(90deg, transparent, #ec4899, #a855f7, transparent)",
                animation: "prelude-shimmer 1.6s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      )}

      {state === "not-found" && (
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", maxWidth: "340px" }}>
          <p style={{ fontSize: "2.6rem", margin: 0 }} aria-hidden>🎈</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", margin: 0 }}>
            This surprise doesn't exist
          </h1>
          <p style={{ color: "rgba(221,214,254,0.75)", lineHeight: 1.6, margin: 0 }}>
            The link might be mistyped, or the surprise may no longer be available.
          </p>
        </div>
      )}

      {state === "error" && (
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", maxWidth: "360px" }}>
          <p style={{ fontSize: "2.6rem", margin: 0 }} aria-hidden>🌙</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", margin: 0 }}>
            The magic hit a small snag
          </h1>
          <p style={{ color: "rgba(221,214,254,0.75)", lineHeight: 1.6, margin: 0 }}>
            We couldn't load the surprise right now. Check your connection and try again — it's worth it, promise.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                marginTop: "6px", padding: "12px 28px", borderRadius: "999px",
                border: "1px solid rgba(236,72,153,0.5)",
                background: "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(168,85,247,0.25))",
                color: "#fdf4ff", fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 0 24px rgba(236,72,153,0.25)",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 34px rgba(236,72,153,0.45)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(236,72,153,0.25)";
              }}
            >
              Try again ✨
            </button>
          )}
        </div>
      )}
    </div>
  );
}
