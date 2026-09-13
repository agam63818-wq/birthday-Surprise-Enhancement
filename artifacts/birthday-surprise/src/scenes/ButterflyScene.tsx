/**
 * ButterflyScene — Romantic butterfly swarm with heart formation.
 *
 * Adapted from animation_code.zip/romantic_butterfly/
 * Original character preserved: canvas-based butterfly choreography,
 * heart formation, particle trails, falling petals, whisper texts.
 *
 * Changes from original:
 * - Converted from standalone HTML to React component
 * - Demo branding/navigation removed
 * - Text content configurable via props (no leaked demo names)
 * - Tap/click start with keyboard accessibility
 * - Global mute respected (no audio in this scene)
 * - Reduced motion: static simplified view
 * - Proper RAF/timer cleanup on unmount (Strict Mode safe)
 * - No global DOM mutations or CSS leakage (scoped styles)
 * - onNext called after animation completes
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";

// ── Palette ──────────────────────────────────────────────────────────────
const PAL = [
  { p: "#00f0ff", m: "#3b82f6", d: "#03071e", g: "rgba(0,240,255,0.55)" },
  { p: "#ff2d75", m: "#a855f7", d: "#1f042e", g: "rgba(255,45,117,0.55)" },
  { p: "#ffd700", m: "#f97316", d: "#2e0e02", g: "rgba(255,215,0,0.55)" },
  { p: "#10b981", m: "#06b6d4", d: "#022c22", g: "rgba(16,185,129,0.55)" },
  { p: "#c084fc", m: "#ec4899", d: "#1e0533", g: "rgba(192,132,252,0.55)" },
];

function heartPoint(t: number) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x, y };
}

const HEART_SLOTS: { x: number; y: number }[] = [];
for (let i = 0; i < 18; i++) {
  const t = (i / 18) * Math.PI * 2;
  HEART_SLOTS.push(heartPoint(t));
}

interface Butterfly {
  id: number; x: number; y: number; sz: number;
  vx: number; vy: number; hd: number;
  fp: number; fs: number;
  pal: typeof PAL[0];
  oR: number; oA: number; oS: number;
  hero: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  s: number; l: number; dc: number; c: string; h: boolean;
}

interface Petal {
  x: number; y: number; s: number;
  vx: number; vy: number;
  sw: number; swP: number;
  a: number; aS: number;
  fl: number; fS: number;
  c: string;
}

interface Whisper {
  x: number; y: number; vy: number; vx: number;
  alpha: number; size: number; text: string;
  color: string; life: number; decay: number;
}

interface Firefly {
  x: number; y: number; s: number;
  vx: number; vy: number;
  a: number; ph: number; c: string;
}

const WHISPER_TEXTS = [
  "I love you", "i love you", "love you", "♡",
  "always", "forever", "i love you so much", "my love", "💕",
];

export default function ButterflyScene({ onNext, isActive, reducedMotion }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const [started, setStarted] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const message = normalized.butterfly.message ?? "You still give me Butterflies";
  const subMessage = normalized.butterfly.subMessage ?? "In a world of 8 billion souls, my heart chose yours.";

  const startAnimation = useCallback(() => {
    if (startedRef.current || !canvasRef.current) return;
    startedRef.current = true;
    setStarted(true);

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) { setShowNext(true); return; }
    const ctx: CanvasRenderingContext2D = context;
    let W = canvas.width;
    let H = canvas.height;

    const resize = () => {
      if (!canvasRef.current) return;
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const T0 = performance.now();

    // Init butterflies
    const bflies: Butterfly[] = [];
    for (let i = 0; i < 18; i++) {
      const pal = PAL[i % PAL.length];
      bflies.push({
        id: i, x: Math.random() * W, y: Math.random() * H,
        sz: i < 2 ? 26 : Math.random() * 9 + 13,
        vx: (Math.random() - 0.5) * 3.6, vy: (Math.random() - 0.5) * 3.6,
        hd: Math.random() * 6.28,
        fp: Math.random() * 6.28, fs: Math.random() * 0.13 + 0.18,
        pal,
        oR: Math.random() * 130 + 90, oA: Math.random() * 6.28, oS: (Math.random() - 0.5) * 0.025,
        hero: i < 2,
      });
    }

    const MAX_P = 100;
    const parts: Particle[] = [];
    const petals: Petal[] = [];
    const whispers: Whisper[] = [];

    const flies: Firefly[] = [];
    for (let i = 0; i < 25; i++) {
      flies.push({
        x: Math.random() * W, y: Math.random() * H,
        s: Math.random() * 1.6 + 0.7,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        a: Math.random() * 0.5 + 0.3, ph: Math.random() * 6.28,
        c: Math.random() > 0.4 ? "#00f0ff" : "#ff2d75",
      });
    }

    function addTrail(x: number, y: number, c: string) {
      if (parts.length >= MAX_P) return;
      parts.push({
        x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 0.7, vy: (Math.random() - 0.5) * 0.7 + 0.15,
        s: Math.random() * 2 + 0.8, l: 1, dc: Math.random() * 0.025 + 0.02,
        c, h: Math.random() > 0.85,
      });
    }

    function burst(x: number, y: number, n: number) {
      const room = MAX_P - parts.length;
      for (let i = 0; i < Math.min(n, room); i++) {
        const a = Math.random() * 6.28, sp = Math.random() * 4.5 + 1.2;
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6,
          s: Math.random() * 2.5 + 1, l: 1, dc: Math.random() * 0.02 + 0.012,
          c: Math.random() > 0.5 ? "#ffd700" : "#00f0ff", h: Math.random() > 0.7,
        });
      }
    }

    function addPetal() {
      if (petals.length > 15) return;
      petals.push({
        x: Math.random() * W, y: -25, s: Math.random() * 6 + 9,
        vx: (Math.random() - 0.5) * 0.6, vy: Math.random() * 0.55 + 0.4,
        sw: Math.random() * 0.015 + 0.007, swP: Math.random() * 6.28,
        a: Math.random() * 6.28, aS: (Math.random() - 0.5) * 0.015,
        fl: Math.random() * 6.28, fS: Math.random() * 0.02 + 0.008,
        c: Math.random() > 0.4 ? "#ff2d75" : "#881337",
      });
    }

    function addWhisper() {
      if (whispers.length > 8) return;
      whispers.push({
        x: Math.random() * W * 0.7 + W * 0.15,
        y: H + 10,
        vy: -(Math.random() * 0.4 + 0.25),
        vx: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.3 + 0.15,
        size: Math.random() * 5 + 11,
        text: WHISPER_TEXTS[Math.floor(Math.random() * WHISPER_TEXTS.length)],
        color: Math.random() > 0.5 ? "rgba(0,240,255," : "rgba(255,45,117,",
        life: 1,
        decay: Math.random() * 0.002 + 0.001,
      });
    }

    function drawHeart(x: number, y: number, sz: number, col: string, al: number) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, al);
      ctx.fillStyle = col;
      ctx.beginPath();
      const t = sz * 0.3;
      ctx.moveTo(x, y + t);
      ctx.bezierCurveTo(x, y, x - sz / 2, y, x - sz / 2, y + t);
      ctx.bezierCurveTo(x - sz / 2, y + (sz + t) / 2, x, y + sz, x, y + sz);
      ctx.bezierCurveTo(x, y + sz, x + sz / 2, y + (sz + t) / 2, x + sz / 2, y + t);
      ctx.bezierCurveTo(x + sz / 2, y, x, y, x, y + t);
      ctx.fill();
      ctx.restore();
    }

    function drawPetal(p: Petal) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.scale(Math.cos(p.fl), 1);
      ctx.globalAlpha = 0.8;
      const g = ctx.createRadialGradient(0, -p.s * 0.2, p.s * 0.1, 0, 0, p.s * 0.9);
      g.addColorStop(0, "#fbcfe8");
      g.addColorStop(0.35, p.c);
      g.addColorStop(1, "#4c0519");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -p.s * 0.9);
      ctx.bezierCurveTo(p.s * 0.75, -p.s * 0.8, p.s * 0.85, p.s * 0.35, 0, p.s * 0.9);
      ctx.bezierCurveTo(-p.s * 0.85, p.s * 0.35, -p.s * 0.75, -p.s * 0.8, 0, -p.s * 0.9);
      ctx.fill();
      ctx.restore();
    }

    function drawBfly(b: Butterfly) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.hd + Math.PI / 2);
      const w = Math.cos(b.fp), s = b.sz;

      ctx.shadowColor = b.pal.g;
      ctx.shadowBlur = 8;

      const gF = ctx.createLinearGradient(0, 0, -s * 1.5, -s * 0.6);
      gF.addColorStop(0, "#fff");
      gF.addColorStop(0.2, b.pal.p);
      gF.addColorStop(0.7, b.pal.m);
      gF.addColorStop(1, b.pal.d);

      const gH = ctx.createLinearGradient(0, 0, -s, s);
      gH.addColorStop(0, b.pal.p);
      gH.addColorStop(0.6, b.pal.m);
      gH.addColorStop(1, b.pal.d);

      ctx.save(); ctx.scale(w, 1);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s * 0.6, -s * 0.4, -s * 1.4, -s * 1.1, -s * 1.6, -s * 0.6);
      ctx.bezierCurveTo(-s * 1.7, 0, -s * 0.9, s * 0.4, 0, 0);
      ctx.fillStyle = gF; ctx.fill();
      ctx.strokeStyle = "#060212"; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.1);
      ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * 1.2, s * 0.6, -s, s * 1.1);
      ctx.bezierCurveTo(-s * 0.6, s * 1.3, -s * 0.2, s * 0.8, 0, s * 0.3);
      ctx.fillStyle = gH; ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.save(); ctx.scale(-w, 1);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s * 0.6, -s * 0.4, -s * 1.4, -s * 1.1, -s * 1.6, -s * 0.6);
      ctx.bezierCurveTo(-s * 1.7, 0, -s * 0.9, s * 0.4, 0, 0);
      ctx.fillStyle = gF; ctx.fill();
      ctx.strokeStyle = "#060212"; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.1);
      ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * 1.2, s * 0.6, -s, s * 1.1);
      ctx.bezierCurveTo(-s * 0.6, s * 1.3, -s * 0.2, s * 0.8, 0, s * 0.3);
      ctx.fillStyle = gH; ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0f0728";
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.08, s * 0.38, 0, 0, 6.28); ctx.fill();

      ctx.strokeStyle = b.pal.p; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.33);
      ctx.quadraticCurveTo(-s * 0.16, -s * 0.6, -s * 0.25, -s * 0.55);
      ctx.moveTo(s * 0.04, -s * 0.33);
      ctx.quadraticCurveTo(s * 0.16, -s * 0.6, s * 0.25, -s * 0.55);
      ctx.stroke();

      ctx.restore();
    }

    let step = 0;
    let phase = 0;
    let heartStartTime = 0;
    let nextShown = false;

    function loop(now: number) {
      if (!mountedRef.current) return;
      ctx.clearRect(0, 0, W, H);
      const t = (now - T0) / 1000;
      const cx = W / 2, cy = H / 2;

      // Fireflies
      for (const f of flies) {
        f.ph += 0.016;
        f.x += f.vx + Math.sin(f.ph) * 0.2;
        f.y += f.vy + Math.cos(f.ph) * 0.2;
        if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
        if (f.y < 0) f.y = H; if (f.y > H) f.y = 0;
        ctx.save();
        ctx.globalAlpha = f.a * (Math.sin(f.ph) * 0.3 + 0.7);
        ctx.fillStyle = f.c;
        ctx.shadowColor = f.c; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.s, 0, 6.28); ctx.fill();
        ctx.restore();
      }

      // Whispers
      if (t > 3) {
        if (Math.random() > 0.97) addWhisper();
        for (let i = whispers.length - 1; i >= 0; i--) {
          const w = whispers[i];
          w.x += w.vx; w.y += w.vy; w.life -= w.decay;
          if (w.life <= 0 || w.y < -30) { whispers.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = w.alpha * w.life;
          ctx.font = `${w.size}px 'Dancing Script', cursive`;
          ctx.fillStyle = w.color + (w.alpha * w.life).toFixed(2) + ")";
          ctx.textAlign = "center";
          ctx.fillText(w.text, w.x, w.y);
          ctx.restore();
        }
      }

      // Butterflies
      const heartScale = Math.min(W, H) * 0.018;

      for (const b of bflies) {
        b.fp += b.fs;

        if (phase === 0) {
          b.x += b.vx; b.y += b.vy;
          if (b.x < 30) b.vx = Math.abs(b.vx);
          if (b.x > W - 30) b.vx = -Math.abs(b.vx);
          if (b.y < 30) b.vy = Math.abs(b.vy);
          if (b.y > H - 30) b.vy = -Math.abs(b.vy);
          b.hd = Math.atan2(b.vy, b.vx);
          if (Math.random() > 0.6) addTrail(b.x, b.y, b.pal.p);
        } else if (phase === 1) {
          if (b.hero) {
            const tx = b.id === 0 ? cx - 120 : cx + 120;
            const ty = cy - 130;
            b.x += (tx - b.x) * 0.04; b.y += (ty - b.y) * 0.04;
            b.hd += (0 - b.hd) * 0.06; b.fs = 0.065;
          } else {
            b.oA += b.oS;
            const tx = cx + Math.cos(b.oA) * (b.oR + 35);
            const ty = cy + Math.sin(b.oA) * (b.oR * 0.6 + 35);
            b.x += (tx - b.x) * 0.04; b.y += (ty - b.y) * 0.04;
            b.hd = Math.atan2(ty - b.y, tx - b.x);
          }
          if (Math.random() > 0.72) addTrail(b.x, b.y, b.pal.p);
        } else {
          const heartT = t - heartStartTime;
          const ease = Math.min(1, heartT / 3);
          const slot = HEART_SLOTS[b.id % HEART_SLOTS.length];
          const tx = cx + slot.x * heartScale;
          const ty = cy - 40 + slot.y * heartScale;
          const lerp = ease * 0.06;
          b.x += (tx - b.x) * lerp; b.y += (ty - b.y) * lerp;
          b.hd += (0 - b.hd) * 0.04;
          b.fs = 0.1 + Math.sin(t * 2) * 0.03;
          if (Math.random() > 0.8) addTrail(b.x, b.y, b.pal.p);
        }

        drawBfly(b);
      }

      // Phase transitions
      if (t < 2.5) phase = 0;
      else if (t < 12) {
        if (phase === 0) phase = 1;
      } else {
        if (phase !== 2) { phase = 2; heartStartTime = t; }
      }

      // Burst events
      if (t > 2.5 && step === 0) { burst(cx, cy - 110, 16); step = 1; }
      if (t > 3.2 && step === 1) { burst(cx, cy - 50, 28); step = 2; }
      if (t > 4.0 && step === 2) { burst(cx, cy, 14); step = 3; }
      if (t > 5.0 && step === 3) { burst(cx, cy + 15, 14); step = 4; }
      if (t > 6.2 && step === 4) { burst(cx, cy + 40, 16); step = 5; }
      if (t > 7.5 && step === 5) { burst(cx, cy + 70, 20); step = 6; }
      if (t > 8.8 && step === 6) { burst(cx, cy + 110, 25); step = 7; }

      // Particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.l -= p.dc;
        if (p.l <= 0) { parts.splice(i, 1); continue; }
        if (p.h) { drawHeart(p.x, p.y, p.s * p.l, p.c, p.l); }
        else {
          ctx.save();
          ctx.globalAlpha = p.l;
          ctx.fillStyle = p.c;
          ctx.shadowColor = p.c; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s * p.l, 0, 6.28); ctx.fill();
          ctx.restore();
        }
      }

      // Petals
      if (t > 5) {
        if (Math.random() > 0.92) addPetal();
        for (let i = petals.length - 1; i >= 0; i--) {
          const p = petals[i];
          p.swP += p.sw; p.a += p.aS; p.fl += p.fS;
          p.x += p.vx + Math.sin(p.swP) * 0.6; p.y += p.vy;
          if (p.y > H + 30) { petals.splice(i, 1); continue; }
          drawPetal(p);
        }
      }

      // Show "Continue" after heart formation
      if (t > 16 && !nextShown && mountedRef.current) {
        nextShown = true;
        setShowNext(true);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    cleanupRef.current = () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupRef.current?.();
      startedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  // Reduced motion: static view
  if (reducedMotion) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "linear-gradient(180deg, #020108 0%, #0f0728 100%)",
        textAlign: "center",
        gap: "24px",
      }}>
        <div style={{ fontSize: "clamp(2rem, 8vw, 4rem)" }}>🦋</div>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.4rem, 5vw, 2.2rem)",
          color: "#fff",
          lineHeight: 1.3,
        }}>{message}</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(0.9rem, 3vw, 1.1rem)", maxWidth: "480px", lineHeight: 1.6 }}>
          {subMessage}
        </p>
        <button
          onClick={onNext}
          style={{
            marginTop: "16px",
            padding: "14px 32px",
            borderRadius: "999px",
            border: "1px solid rgba(255,45,117,0.5)",
            background: "linear-gradient(135deg, rgba(255,45,117,0.2), rgba(168,85,247,0.2))",
            color: "#fff",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Continue ✨
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100dvh",
      background: "#020108",
      overflow: "hidden",
    }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: started ? "block" : "none",
        }}
      />

      {/* Intro overlay — tap to start */}
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2,1,8,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            gap: "20px",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "clamp(2.5rem, 10vw, 5rem)", animation: "butterfly-pulse 2s ease-in-out infinite" }}>🦋</div>
          <p style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: "clamp(1.1rem, 4vw, 1.6rem)",
            color: "rgba(255,255,255,0.8)",
            letterSpacing: "0.05em",
          }}>
            I have something to tell you...
          </p>
          <button
            onClick={startAnimation}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") startAnimation(); }}
            aria-label="Tap to open your heart"
            style={{
              marginTop: "8px",
              padding: "16px 36px",
              borderRadius: "999px",
              border: "1px solid rgba(255,45,117,0.6)",
              background: "linear-gradient(135deg, rgba(255,45,117,0.25), rgba(168,85,247,0.2))",
              color: "#fff",
              fontSize: "clamp(0.9rem, 3vw, 1.1rem)",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 0 30px rgba(255,45,117,0.2)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            💗 tap to open your heart
          </button>
        </div>
      )}

      {/* Message overlay — shown after animation starts */}
      {started && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          padding: "24px",
          textAlign: "center",
          gap: "12px",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: 0,
            animation: "butterfly-fadeInUp 0.8s ease 2.5s forwards",
          }}>
            <span>💖</span>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>
              TO MY FAVORITE PERSON
            </span>
            <span>💖</span>
          </div>

          <div style={{
            opacity: 0,
            animation: "butterfly-fadeInUp 0.8s ease 3.2s forwards",
          }}>
            <div style={{ fontSize: "clamp(0.8rem, 2.5vw, 1rem)", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
              you still give me
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.8rem, 6vw, 3rem)",
              color: "#fff",
              textShadow: "0 0 30px rgba(255,45,117,0.6)",
            }}>
              {message} 🦋
            </div>
          </div>

          <div style={{
            maxWidth: "480px",
            opacity: 0,
            animation: "butterfly-fadeInUp 0.8s ease 4.5s forwards",
          }}>
            <p style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
              lineHeight: 1.7,
            }}>
              {subMessage}
            </p>
          </div>
        </div>
      )}

      {/* Continue button */}
      {showNext && (
        <div style={{
          position: "absolute",
          bottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          animation: "butterfly-fadeInUp 0.6s ease forwards",
        }}>
          <button
            onClick={onNext}
            style={{
              padding: "14px 36px",
              borderRadius: "999px",
              border: "1px solid rgba(255,45,117,0.5)",
              background: "linear-gradient(135deg, rgba(255,45,117,0.25), rgba(168,85,247,0.2))",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 0 30px rgba(255,45,117,0.25)",
              whiteSpace: "nowrap",
            }}
          >
            Continue ✨
          </button>
        </div>
      )}

      <style>{`
        @keyframes butterfly-fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes butterfly-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
