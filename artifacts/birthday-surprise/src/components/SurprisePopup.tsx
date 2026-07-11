import { useState } from "react";

export default function SurprisePopup({ message = "You are my favorite person in this entire world. ❤️" }: { message?: string }) {
  const [open, setOpen] = useState(false);
  const [sparkles, setSparkles] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setSparkles(true);
    setTimeout(() => setSparkles(false), 2000);
  };

  return (
    <>
      {/* Hidden heart trigger */}
      <div
        onClick={handleOpen}
        title="✦"
        style={{
          position: "fixed",
          bottom: "22px", left: "22px",
          zIndex: 400,
          width: "36px", height: "36px",
          borderRadius: "50%",
          background: "rgba(10,3,28,0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(236,72,153,0.12)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px",
          color: "rgba(236,72,153,0.3)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.color = "rgba(236,72,153,0.8)";
          el.style.borderColor = "rgba(236,72,153,0.4)";
          el.style.boxShadow = "0 0 16px rgba(236,72,153,0.3)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.color = "rgba(236,72,153,0.3)";
          el.style.borderColor = "rgba(236,72,153,0.12)";
          el.style.boxShadow = "none";
        }}
      >
        ♥
      </div>

      {/* Popup overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 900,
            background: "rgba(6,1,24,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
            animation: "fade-in-up 0.4s ease",
          }}
        >
          {/* Sparkles */}
          {sparkles && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${30 + (i * 5.5) % 40}%`,
              top: `${20 + (i * 7) % 50}%`,
              fontSize: `${12 + (i * 3) % 10}px`,
              color: ["#f472b6","#c084fc","#f9a8d4","#a78bfa"][i % 4],
              animation: `sparkle-twinkle ${0.5 + i * 0.2}s ease-in-out ${i * 0.1}s both`,
              pointerEvents: "none",
            }}>✦</div>
          ))}

          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(10,3,28,0.92)",
              border: "1px solid rgba(236,72,153,0.3)",
              borderRadius: "24px",
              padding: "40px 32px",
              maxWidth: "340px", width: "100%",
              textAlign: "center",
              boxShadow: "0 0 60px rgba(236,72,153,0.25), 0 20px 60px rgba(0,0,0,0.8)",
              animation: "page-enter 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div style={{
              fontSize: "42px", marginBottom: "20px",
              animation: "premium-heart-pulse 1.5s ease-in-out infinite",
              display: "inline-block",
              filter: "drop-shadow(0 0 16px rgba(236,72,153,0.7))",
            }}>💗</div>

            <p style={{
              fontSize: "11px", letterSpacing: "0.2em",
              color: "rgba(240,180,255,0.4)", textTransform: "uppercase",
              marginBottom: "16px",
            }}>
              A Secret Just For You
            </p>

            <p className="font-serif" style={{
              fontSize: "1.3rem", lineHeight: 1.8,
              color: "rgba(249,168,212,0.9)",
              marginBottom: "28px",
            }}>
              {message}
            </p>

            <button
              onClick={() => setOpen(false)}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #be185d)",
                border: "none", borderRadius: "30px",
                color: "rgba(255,255,255,0.9)",
                padding: "10px 28px", cursor: "pointer",
                fontFamily: "'Dancing Script', cursive",
                fontSize: "1rem",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              Close ✦
            </button>
          </div>
        </div>
      )}
    </>
  );
}
