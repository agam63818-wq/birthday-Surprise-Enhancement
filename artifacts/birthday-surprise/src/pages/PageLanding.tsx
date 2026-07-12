import { useState } from "react";
import PremiumHeart from "@/components/PremiumHeart";
import { useConfig } from "@/contexts/ConfigContext";

export default function PageLanding({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    setTimeout(onNext, 700);
  };

  return (
    <div className="min-h-screen-dvh" style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      padding: "calc(24px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px))",
      position: "relative", zIndex: 5,
    }}>
      <div className="glass-card-dark page-enter" style={{
        maxWidth: "380px", width: "100%",
        padding: "clamp(36px, 9vw, 48px) clamp(24px, 7vw, 36px)",
        textAlign: "center",
        opacity: pressed ? 0 : 1,
        transform: pressed ? "scale(1.05) translateY(-10px)" : "scale(1)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <PremiumHeart size={96} style={{ margin: "0 auto 26px" }} />

        <p className="chip" style={{ marginBottom: "18px" }}>
          ✦ A Special Surprise ✦
        </p>

        <h1 className="font-serif" style={{
          fontSize: "clamp(1.9rem, 6vw, 2.8rem)",
          background: "linear-gradient(135deg, #f9a8d4, #e879f9, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1.25, marginBottom: "14px",
          filter: "drop-shadow(0 0 30px rgba(236,72,153,0.4))",
        }}>
          {config.landing.title}
        </h1>

        <p style={{
          color: "rgba(220,185,255,0.68)", fontSize: "1.05rem",
          lineHeight: 1.8, marginBottom: "34px",
          fontFamily: "'Dancing Script', cursive",
        }}>
          {config.landing.subtitle}
        </p>

        <button className="btn-primary" onClick={handleClick}
          style={{ background: "linear-gradient(135deg, #7c1d6f, #9d174d, #be185d, #7c3aed)" }}>
          {config.landing.buttonText}
        </button>
      </div>
    </div>
  );
}
