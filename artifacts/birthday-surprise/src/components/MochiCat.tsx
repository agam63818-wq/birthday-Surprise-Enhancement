interface MochiCatProps {
  size?: number;
  variant?: "heart" | "happy" | "normal";
  style?: React.CSSProperties;
}

export default function MochiCat({ size = 120, variant = "heart", style = {} }: MochiCatProps) {
  return (
    <div
      className="mochi-anim"
      style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", ...style }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <ellipse cx="60" cy="75" rx="38" ry="35" fill="#f9f0e0" />
        {/* Head */}
        <ellipse cx="60" cy="45" rx="35" ry="32" fill="#f9f0e0" />
        {/* Left ear */}
        <ellipse cx="30" cy="20" rx="12" ry="14" fill="#f9f0e0" transform="rotate(-15 30 20)" />
        <ellipse cx="30" cy="21" rx="7" ry="9" fill="#f4c5cf" transform="rotate(-15 30 21)" />
        {/* Right ear */}
        <ellipse cx="90" cy="20" rx="12" ry="14" fill="#f9f0e0" transform="rotate(15 90 20)" />
        <ellipse cx="90" cy="21" rx="7" ry="9" fill="#f4c5cf" transform="rotate(15 90 21)" />
        {/* Eyes */}
        <ellipse cx="46" cy="42" rx="5" ry="6" fill="#2d1060" />
        <ellipse cx="74" cy="42" rx="5" ry="6" fill="#2d1060" />
        {/* Eye shine */}
        <ellipse cx="48" cy="40" rx="2" ry="2" fill="white" />
        <ellipse cx="76" cy="40" rx="2" ry="2" fill="white" />
        {/* Nose */}
        <ellipse cx="60" cy="50" rx="4" ry="3" fill="#f4a0b0" />
        {/* Mouth */}
        <path d="M54 54 Q60 60 66 54" stroke="#d080a0" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {/* Cheek blush */}
        <ellipse cx="38" cy="53" rx="8" ry="5" fill="rgba(255,150,180,0.35)" />
        <ellipse cx="82" cy="53" rx="8" ry="5" fill="rgba(255,150,180,0.35)" />
        {/* Arms */}
        <ellipse cx="28" cy="78" rx="10" ry="8" fill="#f9f0e0" transform="rotate(-20 28 78)" />
        <ellipse cx="92" cy="78" rx="10" ry="8" fill="#f9f0e0" transform="rotate(20 92 78)" />

        {/* Heart held by cat */}
        {variant === "heart" && (
          <g transform="translate(44, 78) scale(0.9)">
            <path d="M16 4C16 4 28 0 28 12C28 20 16 28 16 28C16 28 4 20 4 12C4 0 16 4 16 4Z"
              fill="#e83a6c" opacity="0.95"/>
            <path d="M16 6C16 6 24 3 24 11C24 17 16 23 16 23C16 23 8 17 8 11C8 3 16 6 16 6Z"
              fill="#ff6090" opacity="0.6"/>
          </g>
        )}
        {variant === "happy" && (
          <g>
            {/* Stars around */}
            <text x="15" y="90" fontSize="12" fill="#f4c542">⭐</text>
            <text x="90" y="90" fontSize="12" fill="#f4c542">⭐</text>
          </g>
        )}
        {/* Feet */}
        <ellipse cx="47" cy="105" rx="12" ry="8" fill="#f0e0cc" />
        <ellipse cx="73" cy="105" rx="12" ry="8" fill="#f0e0cc" />
      </svg>
    </div>
  );
}
