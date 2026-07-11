import { useState } from "react";
import config from "@/config";

interface Props {
  size?: number;
  style?: React.CSSProperties;
  animate?: "float" | "bounce" | "wave" | "none";
}

// Reliable SVG teddy — always renders, zero network dependency
function TeddySVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="28" cy="28" r="13" fill="#c8a882"/>
      <circle cx="28" cy="28" r="8"  fill="#d4b896"/>
      <circle cx="72" cy="28" r="13" fill="#c8a882"/>
      <circle cx="72" cy="28" r="8"  fill="#d4b896"/>
      <circle cx="50" cy="42" r="26" fill="#d4b896"/>
      <circle cx="28" cy="28" r="5"  fill="#e8c8a8" opacity="0.6"/>
      <circle cx="72" cy="28" r="5"  fill="#e8c8a8" opacity="0.6"/>
      <circle cx="41" cy="37" r="4"  fill="#2d1a0e"/>
      <circle cx="59" cy="37" r="4"  fill="#2d1a0e"/>
      <circle cx="42.5" cy="35.5" r="1.5" fill="rgba(255,255,255,0.7)"/>
      <circle cx="60.5" cy="35.5" r="1.5" fill="rgba(255,255,255,0.7)"/>
      <ellipse cx="50" cy="48" rx="9" ry="7" fill="#c8a882"/>
      <ellipse cx="50" cy="45" rx="3.5" ry="2.5" fill="#2d1a0e"/>
      <path d="M44 50 Q50 55 56 50" stroke="#2d1a0e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="34" cy="48" r="5" fill="rgba(255,150,180,0.38)"/>
      <circle cx="66" cy="48" r="5" fill="rgba(255,150,180,0.38)"/>
      <ellipse cx="50" cy="75" rx="22" ry="20" fill="#d4b896"/>
      <ellipse cx="50" cy="76" rx="13" ry="11" fill="#e8c8a8" opacity="0.7"/>
      <ellipse cx="28" cy="68" rx="8" ry="12" fill="#c8a882" transform="rotate(-20 28 68)"/>
      <ellipse cx="72" cy="68" rx="8" ry="12" fill="#c8a882" transform="rotate(20 72 68)"/>
      <ellipse cx="38" cy="90" rx="8" ry="10" fill="#c8a882"/>
      <ellipse cx="62" cy="90" rx="8" ry="10" fill="#c8a882"/>
      <path d="M50 73 C50 73 44 69 44 65.5 C44 63 46 62 48 63 C49 63.5 49.5 64.5 50 65.5 C50.5 64.5 51 63.5 52 63 C54 62 56 63 56 65.5 C56 69 50 73 50 73Z"
        fill="rgba(236,72,153,0.85)"/>
    </svg>
  );
}

const animMap: Record<NonNullable<Props["animate"]>, string | undefined> = {
  float:  "teddy-float 3.8s ease-in-out infinite",
  bounce: "teddy-bounce 1.25s ease-in-out infinite",
  wave:   "mochi-wiggle 2.6s ease-in-out infinite",
  none:   undefined,
};

// Twinkling sparkles floating around the teddy
function Sparkles({ size }: { size: number }) {
  const spots = [
    { top: "6%",  left: "4%",   fs: size * 0.12, delay: "0s"   },
    { top: "12%", left: "88%",  fs: size * 0.09, delay: "0.9s" },
    { top: "72%", left: "-4%",  fs: size * 0.08, delay: "1.7s" },
    { top: "80%", left: "94%",  fs: size * 0.11, delay: "2.4s" },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <span key={i} style={{
          position: "absolute", top: s.top, left: s.left,
          fontSize: `${s.fs}px`, lineHeight: 1,
          color: i % 2 === 0 ? "rgba(249,168,212,0.9)" : "rgba(196,181,253,0.9)",
          animation: `sparkle-twinkle 2.8s ease-in-out ${s.delay} infinite`,
          pointerEvents: "none", zIndex: 2,
          textShadow: "0 0 12px rgba(236,72,153,0.6)",
        }}>✦</span>
      ))}
    </>
  );
}

export default function Teddy({ size = 120, style, animate = "float" }: Props) {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const src = config.images?.teddy ?? "/assets/teddy.png";

  return (
    <div style={{
      position: "relative", display: "inline-flex",
      alignItems: "center", justifyContent: "center",
      ...style,
    }}>
      {/* Layered pink-violet glow behind teddy */}
      <div style={{
        position: "absolute",
        width: size * 1.6, height: size * 1.6,
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(236,72,153,0.25) 0%, rgba(192,132,252,0.12) 45%, transparent 70%)",
        filter: "blur(18px)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <Sparkles size={size} />

      {/* Image / SVG — float animation on wrapper */}
      <div style={{
        position: "relative", zIndex: 1,
        animation: animMap[animate ?? "float"],
        opacity: (visible || failed) ? 1 : 0,
        transform: (visible || failed) ? "scale(1)" : "scale(0.82)",
        transition: "opacity 0.55s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)",
        filter: "drop-shadow(0 10px 22px rgba(212,184,150,0.3)) drop-shadow(0 0 32px rgba(236,72,153,0.24))",
        width: size, height: size,
        display: "flex",
      }}>
        {!failed ? (
          <img
            src={src}
            alt="Teddy"
            width={size} height={size}
            loading="lazy"
            style={{ objectFit: "contain", display: "block", borderRadius: "12px" }}
            onLoad={() => setVisible(true)}
            onError={() => setFailed(true)}
          />
        ) : (
          <TeddySVG size={size} />
        )}
      </div>

      {/* Soft ground shadow that breathes with the float animation */}
      <div style={{
        position: "absolute",
        bottom: -size * 0.06,
        left: "50%",
        width: size * 0.62, height: size * 0.12,
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, transparent 70%)",
        filter: "blur(5px)",
        animation: animate === "none" ? undefined : "teddy-shadow 3.8s ease-in-out infinite",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
    </div>
  );
}

// Always SVG — no network, instant render
export function TeddySVGOnly({ size = 120, style, animate = "float" }: Props) {
  return (
    <div style={{ position: "relative", display: "inline-flex", ...style }}>
      <div style={{
        position: "absolute",
        width: size * 1.5, height: size * 1.5,
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(236,72,153,0.18) 0%, transparent 70%)",
        filter: "blur(12px)", pointerEvents: "none",
      }} />
      <div style={{
        position: "relative",
        animation: animMap[animate ?? "float"],
        filter: "drop-shadow(0 8px 18px rgba(212,184,150,0.28)) drop-shadow(0 0 24px rgba(236,72,153,0.15))",
      }}>
        <TeddySVG size={size} />
      </div>
    </div>
  );
}
