import { useState, useEffect } from "react";
import PremiumHeart from "@/components/PremiumHeart";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
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

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="min-h-screen-dvh" style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "calc(56px + env(safe-area-inset-top, 0px)) 20px 24px",
      position: "relative", zIndex: 5,
    }}>
      <BackgroundEffectsLayer accent="pink" density="low" zIndex={1} />
      <div className="glass-card-dark page-enter" style={{
        maxWidth: "400px", width: "100%", padding: "40px 28px", textAlign: "center", position: "relative", zIndex: 5,
      }}>
        {phase === "scanning" ? (
          <>
            <p className="chip" style={{ marginBottom: "14px" }}>Analyzing</p>
            <h2 className="font-script hero-gradient-text" style={{
              fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.2, marginBottom: "8px",
            }}>
              {config.cutenessMeter.title}
            </h2>
            <p className="pm-faint" style={{ fontSize: "13px", fontFamily: bodyFont, marginBottom: "30px" }}>
              {config.cutenessMeter.subtitle}
            </p>

            <div className="pm-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
                <defs>
                  <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" className="pm-stop-a" />
                    <stop offset="100%" className="pm-stop-b" />
                  </linearGradient>
                </defs>
                <circle cx="70" cy="70" r={R + 10} className="pm-ring-orbit" fill="none" />
                <circle cx="70" cy="70" r={R} className="pm-ring-track" strokeWidth="7" fill="none" />
                <circle cx="70" cy="70" r={R} stroke="url(#scanGrad)" strokeWidth="7" fill="none"
                  strokeDasharray={`${(C * progress) / 100} ${C}`} strokeLinecap="round"
                  transform="rotate(-90 70 70)" className="pm-ring-value" />
              </svg>
              <span className="pm-ring-label pm-gradient-text">{Math.round(progress)}%</span>
            </div>

            <p className="pm-faint" style={{ fontSize: "12px", fontStyle: "italic", letterSpacing: "0.06em" }}>
              {config.cutenessMeter.scanningText}
            </p>
          </>
        ) : (
          <div className="page-enter">
            <PremiumHeart size={88} style={{ margin: "0 auto 20px" }} />
            <p className="pm-eyebrow">{config.cutenessMeter.resultText}</p>
            <h2 className="font-script hero-gradient-text" style={{ fontSize: "clamp(2.4rem, 9vw, 3.2rem)", lineHeight: 1.1, marginBottom: "12px" }}>
              {config.cutenessMeter.resultHeadline}
            </h2>
            <p className="pm-soft" style={{ fontSize: "14px", lineHeight: 1.8, fontFamily: bodyFont, marginBottom: "28px" }}>
              {config.cutenessMeter.resultMessage}
            </p>
            <button type="button" className="btn-primary glow-btn" onClick={onNext}>
              {config.cutenessMeter.buttonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
