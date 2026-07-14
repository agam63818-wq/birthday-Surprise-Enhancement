import { useState, useEffect } from "react";
import PremiumHeart from "@/components/PremiumHeart";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

export default function PageCutenessMeter({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "cutenessMeter");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"scanning" | "result">("scanning");

  useEffect(() => {
    let v = 0;
    const iv = setInterval(() => {
      v += 1.4;
      setProgress(Math.min(v, 100));
      if (v >= 100) { clearInterval(iv); setTimeout(() => setPhase("result"), 500); }
    }, 35);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "24px",
      position: "relative", zIndex: 5,
    }}>
      <div className="glass-card-dark page-enter" style={{
        maxWidth: "390px", width: "100%", padding: "40px 28px", textAlign: "center",
      }}>
        {phase === "scanning" ? (
          <>
            <p style={{ fontSize: "11px", letterSpacing: "0.18em", color: "rgba(240,180,255,0.4)", textTransform: "uppercase", marginBottom: "12px" }}>
              Analyzing
            </p>
            <h2 className="font-serif" style={{
              fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.2, marginBottom: "8px",
              background: "linear-gradient(135deg, #f9a8d4, #c084fc, #a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              {config.cutenessMeter.title}
            </h2>
            <p style={{ color: "rgba(220,185,255,0.5)", fontSize: "13px", fontFamily: bodyFont, marginBottom: "32px" }}>
              {config.cutenessMeter.subtitle}
            </p>

            {/* Scanning animation ring */}
            <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 28px" }}>
              <svg width="120" height="120" style={{ position: "absolute", inset: 0 }}>
                <circle cx="60" cy="60" r="54" stroke="rgba(167,139,250,0.1)" strokeWidth="6" fill="none" />
                <circle cx="60" cy="60" r="54" stroke="url(#scanGrad)" strokeWidth="6" fill="none"
                  strokeDasharray={`${2 * Math.PI * 54 * progress / 100} ${2 * Math.PI * 54}`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dasharray 0.05s linear" }}
                />
                <defs>
                  <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: "2rem", fontWeight: "700",
                  background: "linear-gradient(135deg, #f9a8d4, #c084fc)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            <p style={{ color: "rgba(200,160,255,0.55)", fontSize: "12px", fontStyle: "italic", letterSpacing: "0.06em" }}>
              {config.cutenessMeter.scanningText}
            </p>
          </>
        ) : (
          <div className="page-enter">
            <PremiumHeart size={88} style={{ margin: "0 auto 20px" }} />

            <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "rgba(240,180,255,0.5)", textTransform: "uppercase", marginBottom: "12px" }}>
              {config.cutenessMeter.resultText}
            </p>

            <h2 className="font-serif" style={{
              fontSize: "3.2rem", lineHeight: 1.1, marginBottom: "12px",
              background: "linear-gradient(135deg, #f9a8d4, #e879f9, #a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 0 24px rgba(232,121,249,0.5))",
            }}>
              {config.cutenessMeter.resultHeadline}
            </h2>

            <p style={{
              color: "rgba(220,185,255,0.7)", fontSize: "14px", lineHeight: 1.8,
              fontFamily: bodyFont, marginBottom: "28px",
            }}>
              {config.cutenessMeter.resultMessage}
            </p>

            <button className="btn-primary" onClick={onNext}
              style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)" }}>
              {config.cutenessMeter.buttonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
