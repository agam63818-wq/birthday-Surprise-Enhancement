/**
 * ButterflyScene — Romantic butterfly swarm with heart formation.
 *
 * Adapted from animation_code.zip/romantic_butterfly/
 * Canvas is sized before the loop starts so butterflies appear immediately,
 * not after a late resize. Occasion copy is config-driven.
 */

import { useEffect, useRef, useState } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import { butterflyIntro, butterflyWhispers } from "@/lib/v2/cinematicCopy";

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
for (let i = 0; i < 18; i++) HEART_SLOTS.push(heartPoint((i / 18) * Math.PI * 2));

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

export default function ButterflyScene({ onNext, isActive, reducedMotion }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const mountedRef = useRef(true);
  const overlayGone = useRef(false);
  const [started, setStarted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(!reducedMotion);
  const [showNext, setShowNext] = useState(false);

  const message = normalized.butterfly.message ?? "You still give me Butterflies";
  const subMessage = normalized.butterfly.subMessage ?? "In a world of 8 billion souls, my heart chose yours.";
  const messageIsLong = message.length > 90 || message.split("\n").length > 4;
  const intro = butterflyIntro(normalized.occasion);
  const whisperPool = butterflyWhispers(normalized.occasion);

  const dismissOverlay = () => {
    if (overlayGone.current) return;
    overlayGone.current = true;
    setShowOverlay(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!isActive || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) {
      setShowNext(true);
      return;
    }
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) {
      setShowNext(true);
      return;
    }
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let W = 0;
    let H = 0;
    let cancelled = false;
    let T0 = 0;
    let step = 0;
    let phase = 0;
    let heartStartTime = 0;
    let nextShown = false;
    const bflies: Butterfly[] = [];
    const parts: Particle[] = [];
    const petals: Petal[] = [];
    const whispers: Whisper[] = [];
    const flies: Firefly[] = [];
    const MAX_P = 100;

    const resize = () => {
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW < 8 || cssH < 8) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = cssW;
      H = cssH;
      return true;
    };

    const seed = () => {
      bflies.length = 0;
      flies.length = 0;
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
      for (let i = 0; i < 25; i++) {
        flies.push({
          x: Math.random() * W, y: Math.random() * H,
          s: Math.random() * 1.6 + 0.7,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          a: Math.random() * 0.5 + 0.3, ph: Math.random() * 6.28,
          c: Math.random() > 0.4 ? "#00f0ff" : "#ff2d75",
        });
      }
    };

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
        text: whisperPool[Math.floor(Math.random() * whisperPool.length)],
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

    function loop(now: number) {
      if (cancelled || !mountedRef.current) return;
      ctx.clearRect(0, 0, W, H);
      const t = (now - T0) / 1000;
      const cx = W / 2, cy = H / 2;

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

      if (t > 1.8) {
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
          const ease = Math.min(1, heartT / 2.2);
          const slot = HEART_SLOTS[b.id % HEART_SLOTS.length];
          const tx = cx + slot.x * heartScale;
          const ty = cy - 40 + slot.y * heartScale;
          const lerp = ease * 0.08;
          b.x += (tx - b.x) * lerp; b.y += (ty - b.y) * lerp;
          b.hd += (0 - b.hd) * 0.04;
          b.fs = 0.1 + Math.sin(t * 2) * 0.03;
          if (Math.random() > 0.8) addTrail(b.x, b.y, b.pal.p);
        }
        drawBfly(b);
      }

      if (t < 1.5) phase = 0;
      else if (t < 6) { if (phase === 0) phase = 1; }
      else if (phase !== 2) { phase = 2; heartStartTime = t; }

      if (t > 1.4 && step === 0) { burst(cx, cy - 110, 16); step = 1; }
      if (t > 2.1 && step === 1) { burst(cx, cy - 50, 28); step = 2; }
      if (t > 2.8 && step === 2) { burst(cx, cy, 14); step = 3; }
      if (t > 3.6 && step === 3) { burst(cx, cy + 15, 14); step = 4; }
      if (t > 4.5 && step === 4) { burst(cx, cy + 40, 16); step = 5; }
      if (t > 5.4 && step === 5) { burst(cx, cy + 70, 20); step = 6; }
      if (t > 6.4 && step === 6) { burst(cx, cy + 110, 25); step = 7; }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.l -= p.dc;
        if (p.l <= 0) { parts.splice(i, 1); continue; }
        if (p.h) drawHeart(p.x, p.y, p.s * p.l, p.c, p.l);
        else {
          ctx.save();
          ctx.globalAlpha = p.l;
          ctx.fillStyle = p.c;
          ctx.shadowColor = p.c; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s * p.l, 0, 6.28); ctx.fill();
          ctx.restore();
        }
      }

      if (t > 3) {
        if (Math.random() > 0.92) addPetal();
        for (let i = petals.length - 1; i >= 0; i--) {
          const p = petals[i];
          p.swP += p.sw; p.a += p.aS; p.fl += p.fS;
          p.x += p.vx + Math.sin(p.swP) * 0.6; p.y += p.vy;
          if (p.y > H + 30) { petals.splice(i, 1); continue; }
          drawPetal(p);
        }
      }

      if (t > 8.2 && !nextShown && mountedRef.current) {
        nextShown = true;
        setShowNext(true);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    const onResize = () => { resize(); };
    window.addEventListener("resize", onResize);

    const kickoff = () => {
      if (cancelled) return;
      if (!resize()) {
        rafRef.current = requestAnimationFrame(kickoff);
        return;
      }
      seed();
      T0 = performance.now();
      setStarted(true);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(kickoff);

    const overlayTimer = window.setTimeout(() => {
      if (mountedRef.current) dismissOverlay();
    }, 380);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.clearTimeout(overlayTimer);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // whisper pool is derived from occasion and is stable per config
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, reducedMotion, normalized.occasion]);

  return (
    <div data-butterfly-scene className={`butterfly-scene ${reducedMotion ? "is-reduced" : ""}`}>
      {!reducedMotion && <canvas ref={canvasRef} data-butterfly-canvas className="butterfly-canvas" />}

      {!reducedMotion && showOverlay && (
        <button type="button" onClick={dismissOverlay} aria-label={intro.cta} className="butterfly-intro">
          <span className="butterfly-intro-icon" aria-hidden="true">🦋</span>
          <span className="butterfly-intro-whisper">{intro.whisper}</span>
          <span className="butterfly-intro-cta">{intro.cta}</span>
        </button>
      )}

      {(started || reducedMotion || showNext) && (
        <div className="butterfly-content">
          <div className="butterfly-content-inner">
            <article className="butterfly-message-card">
              <p className="butterfly-badge">{intro.badge}</p>
              <h1 className={`butterfly-message ${messageIsLong ? "is-long" : ""}`}>{message}</h1>
              <p className="butterfly-submessage">{subMessage}</p>
            </article>
            {(showNext || reducedMotion) && (
              <div className="butterfly-actions">
                <button type="button" onClick={onNext} className="butterfly-continue">Continue <span aria-hidden="true">✨</span></button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .butterfly-scene {
          position: relative;
          width: 100%;
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          color: #fff;
          background:
            radial-gradient(circle at 50% 40%, rgba(117,34,105,.22), transparent 48%),
            linear-gradient(180deg, #020108, #090316);
          isolation: isolate;
        }
        .butterfly-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .butterfly-intro {
          position: absolute; inset: 0; z-index: 5;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 16px; padding: calc(72px + env(safe-area-inset-top, 0px)) 24px calc(88px + env(safe-area-inset-bottom, 0px));
          border: 0; color: #fff; text-align: center; cursor: pointer;
          background: rgba(2,1,8,.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        }
        .butterfly-intro-icon { font-size: clamp(2.5rem, 10vw, 5rem); animation: butterfly-pulse 2s ease-in-out infinite; }
        .butterfly-intro-whisper { max-width: 34rem; font: clamp(1.1rem, 4vw, 1.6rem)/1.5 'Dancing Script', cursive; letter-spacing: .05em; color: rgba(255,255,255,.86); }
        .butterfly-intro-cta, .butterfly-continue {
          min-height: 48px; padding: 13px 30px; border: 1px solid rgba(255,112,157,.58); border-radius: 999px;
          color: #fff; background: linear-gradient(135deg, rgba(255,45,117,.34), rgba(168,85,247,.28));
          box-shadow: 0 12px 36px rgba(255,45,117,.16), inset 0 1px rgba(255,255,255,.14);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          font: 600 clamp(.85rem, 3vw, 1rem)/1.3 Inter, system-ui, sans-serif;
        }
        .butterfly-content {
          position: absolute; inset: 0; z-index: 2; display: flex;
          overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
          scrollbar-width: thin; scrollbar-color: rgba(255,112,157,.36) transparent;
        }
        .butterfly-content-inner {
          box-sizing: border-box; width: 100%; margin: auto;
          display: flex; flex-direction: column; align-items: center; gap: clamp(16px, 2.5vh, 24px);
          padding: calc(76px + env(safe-area-inset-top, 0px)) clamp(16px, 4vw, 36px) calc(92px + env(safe-area-inset-bottom, 0px));
        }
        .butterfly-message-card {
          box-sizing: border-box; width: min(100%, 820px); padding: clamp(22px, 4vw, 42px);
          border: 1px solid rgba(255,177,211,.16); border-radius: clamp(22px, 4vw, 34px);
          background: linear-gradient(145deg, rgba(22,8,35,.7), rgba(5,2,15,.48));
          box-shadow: 0 26px 90px rgba(0,0,0,.34), inset 0 1px rgba(255,255,255,.07);
          backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px);
          text-align: center;
        }
        .butterfly-badge {
          margin: 0 0 16px; color: rgba(255,210,229,.76); font: 600 .68rem/1.5 Inter, system-ui, sans-serif;
          letter-spacing: .18em; text-transform: uppercase; opacity: 0; animation: butterfly-fadeInUp .8s ease 1.1s forwards;
        }
        .butterfly-message {
          max-width: 25ch; margin: 0 auto; color: #fff; white-space: pre-wrap; overflow-wrap: anywhere;
          font: 500 clamp(1.65rem, 4.2vw, 3.2rem)/1.2 'Playfair Display', Georgia, serif;
          text-shadow: 0 0 30px rgba(255,45,117,.42); opacity: 0; animation: butterfly-fadeInUp .8s ease 1.7s forwards;
        }
        .butterfly-message.is-long { max-width: 31ch; font-size: clamp(1.35rem, 2.8vw, 2.35rem); line-height: 1.24; }
        .butterfly-submessage {
          max-width: 620px; margin: 20px auto 0; color: rgba(255,239,246,.78); white-space: pre-wrap; overflow-wrap: anywhere;
          font: clamp(.88rem, 2.2vw, 1.02rem)/1.72 Inter, system-ui, sans-serif;
          opacity: 0; animation: butterfly-fadeInUp .8s ease 2.4s forwards;
        }
        .butterfly-actions { display: flex; justify-content: center; animation: butterfly-actionIn .55s ease both; }
        .butterfly-continue { cursor: pointer; white-space: nowrap; }
        .butterfly-continue:hover { border-color: rgba(255,177,211,.85); box-shadow: 0 14px 42px rgba(255,45,117,.25); }
        .butterfly-intro:focus-visible, .butterfly-continue:focus-visible { outline: 3px solid #ffd1e3; outline-offset: 4px; }
        .butterfly-scene.is-reduced .butterfly-badge, .butterfly-scene.is-reduced .butterfly-message,
        .butterfly-scene.is-reduced .butterfly-submessage { opacity: 1; animation: none; }
        @keyframes butterfly-fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes butterfly-actionIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes butterfly-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @media (max-width: 520px) {
          .butterfly-message-card { padding: 22px 17px; border-radius: 22px; }
          .butterfly-badge { margin-bottom: 12px; letter-spacing: .13em; }
          .butterfly-submessage { margin-top: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .butterfly-scene *, .butterfly-scene *::before, .butterfly-scene *::after { animation: none !important; transition: none !important; }
          .butterfly-badge, .butterfly-message, .butterfly-submessage { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
