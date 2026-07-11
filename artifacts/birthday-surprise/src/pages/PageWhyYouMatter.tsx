import { useConfig } from "@/contexts/ConfigContext";

export default function PageWhyYouMatter({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const { cards, title, subtitle, buttonText } = config.whyYouMatter;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "24px",
      position: "relative", zIndex: 5,
    }}>
      <div className="glass-card-dark page-enter" style={{
        maxWidth: "430px", width: "100%", padding: "40px 24px", textAlign: "center",
      }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.18em", color: "rgba(240,180,255,0.4)", textTransform: "uppercase", marginBottom: "10px" }}>
          Why You Matter
        </p>
        <h1 className="font-serif" style={{
          fontSize: "clamp(1.9rem, 5.5vw, 2.8rem)", lineHeight: 1.2, marginBottom: "10px",
          background: "linear-gradient(135deg, #f9a8d4, #c084fc, #818cf8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 18px rgba(196,132,252,0.4))",
        }}>
          {title}
        </h1>
        <p style={{ color: "rgba(220,185,255,0.55)", fontSize: "13px", lineHeight: 1.7, marginBottom: "28px", maxWidth: "300px", margin: "0 auto 28px" }}>
          {subtitle}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>
          {cards.map((card, i) => (
            <div
              key={i}
              className="card-enter"
              style={{
                padding: "20px 14px", textAlign: "left",
                background: "rgba(30,6,60,0.7)",
                border: "1px solid rgba(167,139,250,0.15)",
                borderRadius: "16px",
                transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
                cursor: "default",
                animationDelay: `${i * 0.1}s`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(-8px)";
                el.style.boxShadow = "0 12px 36px rgba(124,58,237,0.4)";
                el.style.borderColor = "rgba(236,72,153,0.4)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = ""; el.style.boxShadow = ""; el.style.borderColor = "";
              }}
            >
              <div style={{ fontSize: "22px", marginBottom: "10px" }}>{card.icon}</div>
              <div style={{ fontFamily: "'Dancing Script', cursive", color: "rgba(235,205,255,0.9)", fontSize: "1rem", fontWeight: "700", marginBottom: "6px" }}>
                {card.title}
              </div>
              <div style={{ color: "rgba(200,170,255,0.65)", fontSize: "11.5px", lineHeight: 1.6 }}>
                {card.desc}
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={onNext}
          style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)" }}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}
