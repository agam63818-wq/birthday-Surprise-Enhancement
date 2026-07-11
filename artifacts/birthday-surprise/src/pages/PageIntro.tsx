import { useState, useEffect } from "react";
import { TeddySVGOnly } from "@/components/Teddy";
import TypewriterText from "@/components/TypewriterText";
import { useConfig } from "@/contexts/ConfigContext";

export default function PageIntro({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const [progress, setProgress] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      let p = 0;
      const iv = setInterval(() => {
        p += 1.1;
        setProgress(Math.min(p, 100));
        if (p >= 100) { clearInterval(iv); setTimeout(() => setShowButton(true), 600); }
      }, 30);
      return () => clearInterval(iv);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "24px",
      position: "relative", zIndex: 5,
    }}>
      <div className="glass-card-dark page-enter" style={{
        maxWidth: "390px", width: "100%", padding: "40px 32px", textAlign: "center",
      }}>
        {/* Teddy with float animation */}
        <TeddySVGOnly size={110} animate="float" style={{ margin: "0 auto 20px" }} />

        <h1 className="font-serif" style={{
          fontSize: "clamp(1.8rem, 5.5vw, 2.6rem)", lineHeight: 1.25, marginBottom: "18px",
          background: "linear-gradient(135deg, #f9a8d4 20%, #c084fc 60%, #a78bfa 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 20px rgba(196,132,252,0.4))",
        }}>
          {config.intro.heading}
        </h1>

        <p style={{
          color: "rgba(220,190,255,0.8)", fontSize: "1rem", lineHeight: 1.8,
          fontFamily: "'Dancing Script', cursive", marginBottom: "28px", minHeight: "3.2rem",
        }}>
          <TypewriterText text={config.intro.message} speed={36} delay={0.5} />
        </p>

        {/* Progress bar */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{
            height: "3px", background: "rgba(167,139,250,0.12)",
            borderRadius: "4px", overflow: "hidden", marginBottom: "10px",
          }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "linear-gradient(90deg, #7c3aed, #ec4899, #f9a8d4)",
              borderRadius: "4px", transition: "width 0.04s linear",
              boxShadow: "0 0 12px rgba(236,72,153,0.5)",
            }} />
          </div>
          <p style={{ color: "rgba(200,160,255,0.4)", fontSize: "11px", letterSpacing: "0.1em", fontStyle: "italic" }}>
            {progress < 100 ? config.intro.loadingText : "Ready ✦"}
          </p>
        </div>

        <button className="btn-primary" onClick={onNext}
          style={{
            opacity: showButton ? 1 : 0,
            transform: showButton ? "translateY(0)" : "translateY(10px)",
            pointerEvents: showButton ? "all" : "none",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}>
          {config.intro.buttonText}
        </button>
      </div>
    </div>
  );
}
