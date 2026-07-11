import { useState, useEffect } from "react";
import Confetti from "@/components/Confetti";
import { useConfig } from "@/contexts/ConfigContext";

export default function PageLastNote() {
  const config = useConfig();
  const { lines, finalLine1, finalLine2, footerText } = config.lastNote;
  const [visible, setVisible] = useState<number[]>([]);
  const [showEnding, setShowEnding] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    lines.forEach((_, i) => {
      setTimeout(() => setVisible(v => [...v, i]), 300 + i * 620);
    });
    const endAt = 300 + lines.length * 620 + 500;
    setTimeout(() => { setShowEnding(true); setConfetti(true); }, endAt);
    setTimeout(() => setConfetti(false), endAt + 6000);
    const blink = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(blink);
  }, []);

  const lastVisible = visible.length < lines.length ? visible.length : -1;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "24px",
      position: "relative", zIndex: 5,
    }}>
      <Confetti active={confetti} />

      <div className="glass-card-dark page-enter" style={{
        maxWidth: "410px", width: "100%", overflow: "hidden",
      }}>
        {/* Header bar */}
        <div style={{
          padding: "12px 28px",
          background: "linear-gradient(90deg, rgba(124,58,237,0.5), rgba(190,24,93,0.35))",
          borderBottom: "1px solid rgba(167,139,250,0.15)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div style={{ display: "flex", gap: "5px" }}>
            {["rgba(255,100,100,0.5)","rgba(255,180,0,0.5)","rgba(100,200,100,0.5)"].map((c,i)=>(
              <div key={i} style={{ width:"8px",height:"8px",borderRadius:"50%",background:c }} />
            ))}
          </div>
          <span style={{ color:"rgba(220,185,255,0.6)", fontSize:"11px", letterSpacing:"0.15em", marginLeft:"6px" }}>
            LAST NOTE 💌
          </span>
        </div>

        {/* Letter body */}
        <div style={{ padding: "28px 28px 32px", overflowY: "auto", maxHeight: "70vh" }}>
          {lines.map((line, i) => {
            const isLast = i === visible[visible.length - 1] && lastVisible !== -1;
            return (
              <p
                key={i}
                className="font-serif"
                style={{
                  fontSize: "1.05rem", lineHeight: 1.85, marginBottom: "2px",
                  color: "rgba(235,210,255,0.9)",
                  opacity: visible.includes(i) ? 1 : 0,
                  transform: visible.includes(i) ? "translateY(0)" : "translateY(14px)",
                  transition: "opacity 0.55s ease, transform 0.55s ease",
                  display: "inline",
                }}
              >
                {line}
                {isLast && (
                  <span style={{
                    display: "inline-block", width: "2px", height: "1.1em",
                    background: "rgba(236,72,153,0.9)", marginLeft: "2px",
                    verticalAlign: "text-bottom",
                    opacity: cursor ? 1 : 0,
                    transition: "opacity 0.1s",
                  }} />
                )}
                {visible.includes(i) && <br />}
              </p>
            );
          })}

          {showEnding && (
            <div className="page-enter" style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(167,139,250,0.12)" }}>
              <p className="font-serif" style={{ color: "#f472b6", fontSize: "1.15rem", fontWeight: "700", marginBottom: "4px" }}>
                {finalLine1}
              </p>
              <p className="font-serif" style={{ color: "#a78bfa", fontSize: "1.05rem", fontWeight: "700" }}>
                {finalLine2}
              </p>
            </div>
          )}
        </div>
      </div>

      {showEnding && (
        <div className="page-enter" style={{ marginTop: "24px", textAlign: "center" }}>
          <h2 className="font-serif" style={{
            fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
            background: "linear-gradient(135deg, #f9a8d4, #e879f9)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            filter: "drop-shadow(0 0 20px rgba(236,72,153,0.5))",
            marginBottom: "6px",
          }}>
            Happy Birthday, {config.name} 🎂
          </h2>
          <p style={{ color: "rgba(200,170,255,0.5)", fontSize: "12px", fontStyle: "italic" }}>
            {footerText}
          </p>
        </div>
      )}
    </div>
  );
}
