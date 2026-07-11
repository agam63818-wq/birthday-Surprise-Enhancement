interface Props {
  size?: number;
  style?: React.CSSProperties;
  pulse?: boolean;
}

export default function PremiumHeart({ size = 120, style, pulse = true }: Props) {
  const s = size;
  return (
    <div style={{
      width: s, height: s,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: pulse ? "premium-heart-pulse 1.5s ease-in-out infinite" : undefined,
      filter: "drop-shadow(0 0 24px rgba(236,72,153,0.55)) drop-shadow(0 0 48px rgba(167,139,250,0.3))",
      ...style,
    }}>
      <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
        {/* Outer glow heart */}
        <path d="M60 100 C60 100 16 70 16 42 C16 26 28 16 42 20 C50 22 56 30 60 38 C64 30 70 22 78 20 C92 16 104 26 104 42 C104 70 60 100 60 100Z"
          fill="url(#heartGrad)" />
        <defs>
          <radialGradient id="heartGrad" cx="50%" cy="40%" r="60%" fx="50%" fy="30%">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="40%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#9d174d" />
          </radialGradient>
        </defs>

        {/* Inner highlight */}
        <ellipse cx="45" cy="40" rx="10" ry="7" fill="rgba(255,255,255,0.22)" transform="rotate(-20 45 40)" />

        {/* Sparkles */}
        {[
          { cx: 22, cy: 30, r: 2.5 },
          { cx: 98, cy: 28, r: 2 },
          { cx: 60, cy: 108, r: 2 },
        ].map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r}
            fill="rgba(255,255,255,0.9)"
            style={{ animation: `sparkle-twinkle ${1.5 + i * 0.7}s ${i * 0.4}s ease-in-out infinite` }}
          />
        ))}
      </svg>
    </div>
  );
}
