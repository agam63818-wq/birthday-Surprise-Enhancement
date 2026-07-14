import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

export default function PageOurStory({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "ourStory");
  const { cards, title, subtitle, buttonText } = config.ourStory;

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
          Our Journey
        </p>
        <h1 className="font-serif" style={{
          fontSize: "clamp(1.9rem, 5.5vw, 2.8rem)", lineHeight: 1.2, marginBottom: "10px",
          background: "linear-gradient(135deg, #f9a8d4, #e879f9)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 18px rgba(232,121,249,0.35))",
        }}>
          {title}
        </h1>
        <p style={{ color: "rgba(220,185,255,0.5)", fontSize: "13px", fontFamily: bodyFont, marginBottom: "28px" }}>
          {subtitle}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>
          {cards.map((card, i) => (
            <div
              key={i}
              className="card-enter"
              style={{
                padding: "20px 14px", textAlign: "left",
                background: "rgba(30,6,60,0.65)",
                border: "1px solid rgba(167,139,250,0.12)",
                borderRadius: "16px",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                cursor: "default",
                animationDelay: `${i * 0.12}s`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(-8px)";
                el.style.boxShadow = "0 12px 36px rgba(124,58,237,0.35)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = ""; el.style.boxShadow = "";
              }}
            >
              <div style={{ fontSize: "22px", marginBottom: "10px" }}>{card.icon}</div>
              <div style={{ fontFamily: bodyFont, color: "rgba(235,205,255,0.9)", fontSize: "1rem", fontWeight: "700", marginBottom: "6px" }}>
                {card.title}
              </div>
              <div style={{ color: "rgba(200,170,255,0.65)", fontSize: "11.5px", lineHeight: 1.6, fontFamily: bodyFont }}>
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
