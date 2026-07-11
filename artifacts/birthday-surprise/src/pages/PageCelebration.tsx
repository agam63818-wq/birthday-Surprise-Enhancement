import PremiumHeart from "@/components/PremiumHeart";
import TypewriterText from "@/components/TypewriterText";
import config from "@/config";

export default function PageCelebration({ onNext }: { onNext: () => void }) {
  const { title, subtitle1, subtitle2, badge, message, buttonText } = config.celebration;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "24px",
      position: "relative", zIndex: 5,
    }}>
      <div className="glass-card-dark page-enter" style={{
        maxWidth: "390px", width: "100%", padding: "40px 30px", textAlign: "center",
      }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.18em", color: "rgba(240,180,255,0.4)", textTransform: "uppercase", marginBottom: "10px" }}>
          Birthday Vibes
        </p>
        <h1 className="font-serif" style={{
          fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.2, marginBottom: "10px",
          background: "linear-gradient(135deg, #f9a8d4, #e879f9, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 20px rgba(232,121,249,0.35))",
        }}>
          {title}
        </h1>
        <p style={{ color: "rgba(220,185,255,0.65)", fontSize: "14px", fontFamily: "'Dancing Script', cursive", marginBottom: "2px" }}>{subtitle1}</p>
        <p style={{ color: "rgba(220,185,255,0.5)", fontSize: "13px", fontFamily: "'Dancing Script', cursive", marginBottom: "20px" }}>{subtitle2}</p>

        <div style={{
          display: "inline-block", padding: "5px 16px", borderRadius: "30px",
          background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)",
          color: "rgba(220,185,255,0.55)", fontSize: "10px", letterSpacing: "0.15em", marginBottom: "28px",
        }}>
          {badge}
        </div>

        <PremiumHeart size={100} style={{ margin: "0 auto 24px" }} />

        <p className="font-serif" style={{
          color: "rgba(235,210,255,0.85)", fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "32px",
        }}>
          <TypewriterText text={message} speed={40} delay={0.3} />
        </p>

        <button className="btn-primary" onClick={onNext}
          style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)" }}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}
