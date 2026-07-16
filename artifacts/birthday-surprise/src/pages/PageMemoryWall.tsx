import { useState } from "react";
import { TeddySVGOnly } from "@/components/Teddy";
import GlowButton from "@/components/GlowButton";
import StaggeredText from "@/components/StaggeredText";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily } from "@/lib/fontPresets";

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

/**
 * Memory Wall — polished memory gallery. Keeps the story-card flow
 * (tap for the next memory), preserves each photo's candid `rotate`,
 * adds premium frame/hover treatment, lazy images and a token-based
 * lightbox. Respects config.textStyles?.memoryWall for captions.
 */
export default function PageMemoryWall({ onNext }: { onNext: () => void }) {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "memoryWall");
  const { photos, title, subtitle, buttonText } = config.memoryWall;
  const total = photos.length;

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [swapKey, setSwapKey] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [hearts, setHearts] = useState<HeartBurst[]>([]);
  const [zoomed, setZoomed] = useState(false);
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
      <BackgroundEffectsLayer accent="violet" density="low" zIndex={1} />

      {/* Header */}
      <div className="page-enter" style={{ textAlign: "center", maxWidth: "460px", width: "100%", marginBottom: "18px", position: "relative", zIndex: 5 }}>
        <p className="chip" style={{ marginBottom: "12px" }}>📸 Memories</p>
        <StaggeredText
          as="h1"
          text={title}
          delay={0.2}
          className="font-script hero-gradient-text"
          style={{
            fontSize: "clamp(1.9rem, 5.5vw, 2.8rem)",
            lineHeight: "var(--leading-tight)",
            marginBottom: "6px",
            filter: "drop-shadow(0 0 18px rgba(196, 132, 252, 0.4))",
          }}
        />
        <p style={{ color: "var(--ink-faint)", fontSize: "13px", fontFamily: bodyFont }}>
          {subtitle}
        </p>
      </div>

      {/* Story card — one big photo at a time, tap to reveal the next.
          The candid per-photo rotation lives on the frame so the
          swap-in animation on the card doesn't override it. */}
      <div
        className="memory-frame"
        style={{ "--mrot": `${photo.rotate ?? 0}deg`, marginBottom: "18px", position: "relative", zIndex: 5 } as React.CSSProperties}
      >
        <div
          key={swapKey}
          className="glass-card-dark"
          onClick={onPhotoTap}
          style={{
            width: "min(88vw, 400px)",
            padding: "14px",
            position: "relative",
            cursor: "pointer",
            animation: "photo-swap-in 0.55s var(--ease-luxe) both",
            "--dx": `${dir * 70}px`,
            "--dr": `${dir * 4}deg`,
          } as React.CSSProperties}
        >
          <div style={{ borderRadius: "var(--rad-lg)", overflow: "hidden", position: "relative" }}>
            <img
              src={photo.src}
              alt={photo.caption}
              decoding="async"
              style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", display: "block" }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
            />
            {/* Cinematic bottom gradient + caption */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(8,2,24,0.82) 0%, transparent 42%)",
              pointerEvents: "none",
            }} />
            <p style={{
              position: "absolute", left: "16px", right: "16px", bottom: "14px",
              color: "rgba(252,231,243,0.95)", fontSize: "1.3rem", lineHeight: 1.4,
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
              pointerEvents: "none",
              fontFamily: bodyFont,
            }}>
              {photo.caption}
            </p>
            {/* Counter chip */}
            <span style={{
              position: "absolute", top: "12px", right: "12px",
              padding: "5px 12px", borderRadius: "var(--rad-pill)",
              background: "rgba(8,2,24,0.6)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(167,139,250,0.25)",
              color: "rgba(240,200,255,0.9)", fontSize: "11.5px", fontWeight: 600,
              letterSpacing: "0.1em", pointerEvents: "none",
            }}>
              {idx + 1} / {total}
            </span>
            {/* Zoom (lightbox) button */}
            <button
              aria-label="View photo fullscreen"
              onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
              style={{
                position: "absolute", top: "12px", left: "12px",
                width: "34px", height: "34px", borderRadius: "50%",
                border: "1px solid rgba(167,139,250,0.3)",
                background: "rgba(8,2,24,0.6)", backdropFilter: "blur(10px)",
                color: "rgba(240,200,255,0.9)", fontSize: "15px", lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >⤢</button>
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
      </div>

      {/* Prev / dots / Next */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px", position: "relative", zIndex: 5 }}>
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

      {/* Thumbnail strip — lazy-loaded, candid slight rotation */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "22px", flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 5 }}>
        {photos.map((p, i) => (
          <img
            key={i}
            src={p.src}
            alt=""
            loading="lazy"
            decoding="async"
            onClick={() => go(0, i)}
            style={{
              width: "42px", height: "42px", objectFit: "cover",
              borderRadius: "10px", cursor: "pointer",
              border: i === idx ? "2px solid rgba(236,72,153,0.85)" : "2px solid rgba(167,139,250,0.18)",
              opacity: i === idx ? 1 : 0.55,
              transform: i === idx ? "scale(1.12)" : `rotate(${(p.rotate ?? 0) / 2}deg)`,
              transition: "all 0.35s ease",
              boxShadow: i === idx ? "0 4px 16px rgba(236,72,153,0.4)" : "none",
            }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
          />
        ))}
      </div>

      {!seenAll && (
        <p style={{
          color: "var(--ink-faint)", fontSize: "12.5px", marginBottom: "18px",
          letterSpacing: "0.04em", animation: "bounce-soft 2.2s ease-in-out infinite",
          position: "relative", zIndex: 5,
        }}>
          Tap the photo for the next memory ✨
        </p>
      )}

      <TeddySVGOnly size={64} animate="wave" style={{ marginBottom: "14px", position: "relative", zIndex: 5 }} />

      <GlowButton onClick={onNext} style={{
        background: "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)",
        opacity: seenAll ? 1 : 0.35,
        pointerEvents: seenAll ? "all" : "none",
        transition: "opacity var(--dur-slow) var(--ease-smooth)",
        position: "relative", zIndex: 5,
      }}>
        {buttonText}
      </GlowButton>
      {!seenAll && (
        <button
          onClick={onNext}
          style={{
            marginTop: "10px", background: "none", border: "none", cursor: "pointer",
            color: "rgba(196,181,253,0.45)", fontSize: "12px", letterSpacing: "0.06em",
            textDecoration: "underline", textUnderlineOffset: "3px",
            position: "relative", zIndex: 5,
          }}
        >
          skip album →
        </button>
      )}

      {/* Fullscreen lightbox — smooth scale + fade on the motion tokens */}
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-label="Photo fullscreen"
          className="lightbox-in"
          style={{
            position: "fixed", inset: 0, zIndex: 900,
            background: "rgba(5,1,16,0.92)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
        >
          <img
            src={photo.src}
            alt={photo.caption}
            decoding="async"
            style={{
              maxWidth: "94vw", maxHeight: "72vh", objectFit: "contain",
              borderRadius: "var(--rad-md)",
              boxShadow: "var(--shadow-strong), var(--glow-subtle)",
            }}
          />
          <p style={{
            color: "rgba(252,231,243,0.95)", fontSize: "1.35rem",
            marginTop: "16px", textAlign: "center", maxWidth: "480px",
            fontFamily: bodyFont,
          }}>
            {photo.caption}
          </p>
          <div style={{ display: "flex", gap: "16px", marginTop: "18px", alignItems: "center" }}>
            <button aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); go(-1); }} style={navBtnStyle}>‹</button>
            <span style={{ color: "rgba(220,185,255,0.6)", fontSize: "12.5px", letterSpacing: "0.1em" }}>
              {idx + 1} / {total}
            </span>
            <button aria-label="Next photo" onClick={(e) => { e.stopPropagation(); go(1); }} style={navBtnStyle}>›</button>
          </div>
          <button
            aria-label="Close fullscreen"
            onClick={() => setZoomed(false)}
            style={{ position: "absolute", top: "calc(16px + env(safe-area-inset-top, 0px))", right: "16px", ...navBtnStyle }}
          >✕</button>
        </div>
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
