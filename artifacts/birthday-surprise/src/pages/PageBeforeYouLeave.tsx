import { useState, useEffect } from "react";
import { TeddySVGOnly } from "@/components/Teddy";
import TypewriterText from "@/components/TypewriterText";
import config from "@/config";

export default function PageBeforeYouLeave({ onNext }: { onNext: () => void }) {
  const { message, buttonText } = config.beforeLeave;
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowButton(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "24px",
      position: "relative", zIndex: 5,
    }}>
      <div className="glass-card-dark page-enter" style={{
        maxWidth: "390px", width: "100%", padding: "48px 30px", textAlign: "center",
      }}>
        <TeddySVGOnly size={100} animate="bounce" style={{ margin: "0 auto 24px" }} />

        <h1 className="font-serif" style={{
          fontSize: "clamp(1.7rem, 5vw, 2.5rem)", lineHeight: 1.35, marginBottom: "36px",
          background: "linear-gradient(135deg, #f9a8d4, #c084fc)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 16px rgba(196,132,252,0.3))",
        }}>
          <TypewriterText text={message} speed={48} delay={0.3} />
        </h1>

        <button className="btn-primary" onClick={onNext}
          style={{
            background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)",
            opacity: showButton ? 1 : 0,
            transform: showButton ? "translateY(0)" : "translateY(10px)",
            pointerEvents: showButton ? "all" : "none",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}
