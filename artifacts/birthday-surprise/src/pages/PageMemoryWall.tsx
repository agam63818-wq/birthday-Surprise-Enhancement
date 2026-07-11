import { useState } from "react";
import { TeddySVGOnly } from "@/components/Teddy";
import { useConfig } from "@/contexts/ConfigContext";

/* Soft camera-shutter tick on photo change */
let albumCtx: AudioContext | null = null;
function playTick() {
  try {
    if (!albumCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      albumCtx = new AC();
    }
    if (albumCtx.state === "suspended") albumCtx.resume();
    const c = albumCtx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(680, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(980, c.currentTime + 0.05);
    g.gain.setValueAtTime(0.07, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.16);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.18);
  } catch {}
}

interface HeartBurst { id: number; x: number; y: number; }

export default function PageMemoryWall({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const { photos, title, subtitle, buttonText } = config.memoryWall;
  const total = photos.length;

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [swapKey, setSwapKey] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [hearts, setHearts] = useState<HeartBurst[]>([]);
  const seenAll = maxSeen >= total - 1;

  const go = (d: number, target?: number) => {
    const nxt = target !== undefined ? target : (idx + d + total) % total;
    if (nxt === idx) return;
    setDir(target !== undefined ? (target > idx ? 1 : -1) : d);
    setIdx(nxt);
    setSwapKey(k => k + 1);
    setMaxSeen(m => Math.max(m, nxt));
    playTick();
  };

  const onPhotoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setHearts(h => [...h.slice(-4), { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setHearts(h => h.filter(x => x.id !== id)), 1100);
    go(1);
  };

  const photo = photos[idx];

  return (
    <div className="min-h-screen-dvh" style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start",
      padding: "calc(56px + env(safe-area-inset-top, 0px)) 20px calc(40px + env(safe-area-inset-bottom, 0px))",
      position: "relative", zIndex: 5,
    }}>
      {/* Header */}
      <div className="page-enter" style={{ textAlign: "center", maxWidth: "460px", width: "100%", marginBottom: "18px" }}>
        <p className="chip" style={{ marginBottom: "12px" }}>📸 Memories</p>
        <h1 className="font-serif" style={{
          fontSize: "clamp(1.9rem, 5.5vw, 2.8rem)", lineHeight: 1.25, marginBottom: "6px",
          background: "linear-gradient(135deg, #f9a8d4, #c084fc)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 18px rgba(196,132,252,0.4))",
        }}>
          {title}
        </h1>
        <p style={{ color: "rgba(220,185,255,0.55)", fontSize: "13px", fontFamily: "'Dancing Script', cursive" }}>
          {subtitle}
        </p>
      </div>

      {/* Story card — one big photo at a time, tap to reveal the next */}
      <div
        key={swapKey}
        className="glass-card-dark"
        onClick={onPhotoTap}
        style={{
          width: "min(88vw, 400px)",
          padding: "14px",
          position: "relative",
          cursor: "pointer",
          animation: "photo-swap-in 0.55s cubic-bezier(0.22,1,0.36,1) both",
          "--dx": `${dir * 70}px`,
          "--dr": `${dir * 4}deg`,
          marginBottom: "18px",
        } as React.CSSProperties}
      >
        <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative" }}>
          <img
            src={photo.src}
            alt={photo.caption}
            style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", display: "block" }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
          />
          {/* Cinematic bottom gradient + caption */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(8,2,24,0.82) 0%, transparent 42%)",
            pointerEvents: "none",
          }} />
          <p className="font-serif" style={{
            position: "absolute", left: "16px", right: "16px", bottom: "14px",
            color: "rgba(252,231,243,0.95)", fontSize: "1.3rem", lineHeight: 1.4,
            textShadow: "0 2px 12px rgba(0,0,0,0.7)",
            pointerEvents: "none",
          }}>
            {photo.caption}
          </p>
          {/* Counter chip */}
          <span style={{
            position: "absolute", top: "12px", right: "12px",
            padding: "5px 12px", borderRadius: "999px",
            background: "rgba(8,2,24,0.6)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(167,139,250,0.25)",
            color: "rgba(240,200,255,0.9)", fontSize: "11.5px", fontWeight: 600,
            letterSpacing: "0.1em", pointerEvents: "none",
          }}>
            {idx + 1} / {total}
          </span>
        </div>

        {/* Heart bursts at tap point */}
        {hearts.map(h => (
          <span key={h.id} style={{
            position: "absolute", left: h.x, top: h.y,
            fontSize: "24px", color: "#f472b6", zIndex: 20,
            textShadow: "0 0 14px rgba(236,72,153,0.8)",
            animation: "heart-pop 1s ease-out forwards",
            pointerEvents: "none",
          }}>♥</span>
        ))}
      </div>

      {/* Prev / dots / Next */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
        <button aria-label="Previous photo" onClick={() => go(-1)} style={navBtnStyle}>‹</button>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {photos.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? "20px" : "6px", height: "6px", borderRadius: "10px",
              transition: "all 0.45s ease",
              background: i === idx
                ? "linear-gradient(90deg, #ec4899, #a855f7)"
                : i <= maxSeen ? "rgba(236,72,153,0.5)" : "rgba(167,139,250,0.18)",
              boxShadow: i === idx ? "0 0 10px rgba(236,72,153,0.6)" : "none",
            }} />
          ))}
        </div>
        <button aria-label="Next photo" onClick={() => go(1)} style={navBtnStyle}>›</button>
      </div>

      {/* Thumbnail strip */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "22px", flexWrap: "wrap", justifyContent: "center" }}>
        {photos.map((p, i) => (
          <img
            key={i}
            src={p.src}
            alt=""
            onClick={() => go(0, i)}
            style={{
              width: "42px", height: "42px", objectFit: "cover",
              borderRadius: "10px", cursor: "pointer",
              border: i === idx ? "2px solid rgba(236,72,153,0.85)" : "2px solid rgba(167,139,250,0.18)",
              opacity: i === idx ? 1 : 0.55,
              transform: i === idx ? "scale(1.12)" : "scale(1)",
              transition: "all 0.35s ease",
              boxShadow: i === idx ? "0 4px 16px rgba(236,72,153,0.4)" : "none",
            }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
          />
        ))}
      </div>

      {!seenAll && (
        <p style={{
          color: "rgba(220,185,255,0.5)", fontSize: "12.5px", marginBottom: "18px",
          letterSpacing: "0.04em", animation: "bounce-soft 2.2s ease-in-out infinite",
        }}>
          Tap the photo for the next memory ✨
        </p>
      )}

      <TeddySVGOnly size={64} animate="wave" style={{ marginBottom: "14px" }} />

      <button className="btn-primary" onClick={onNext} style={{
        background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)",
        opacity: seenAll ? 1 : 0.35,
        pointerEvents: seenAll ? "all" : "none",
        transition: "opacity 0.6s ease",
      }}>
        {buttonText}
      </button>
      {!seenAll && (
        <button
          onClick={onNext}
          style={{
            marginTop: "10px", background: "none", border: "none", cursor: "pointer",
            color: "rgba(196,181,253,0.45)", fontSize: "12px", letterSpacing: "0.06em",
            textDecoration: "underline", textUnderlineOffset: "3px",
          }}
        >
          skip album →
        </button>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: "40px", height: "40px", borderRadius: "50%",
  border: "1px solid rgba(167,139,250,0.25)",
  background: "rgba(12,3,28,0.7)", backdropFilter: "blur(12px)",
  color: "#d8b4fe", fontSize: "22px", lineHeight: 1, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.25s ease",
};
