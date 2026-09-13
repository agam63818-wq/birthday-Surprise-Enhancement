/**
 * YouAndMeScene — Particle heart formation with sender/recipient names.
 *
 * Adapted from animation_code.zip/you_and_me/
 * Original character preserved: ECG intro, particle heart formation,
 * star field, falling petals, "WRITTEN IN THE STARS" reveal.
 *
 * Changes from original:
 * - Converted from standalone HTML to React component
 * - Demo branding/watermark removed ("Code With Anurag")
 * - Name inputs replaced by config (youAndMe.name1, youAndMe.name2)
 * - Missing/long/Unicode names handled safely (clamped to 14 chars)
 * - Reduced motion: static heart view
 * - Proper RAF cleanup on unmount (Strict Mode safe)
 * - No global DOM mutations or CSS leakage
 */

import { useEffect, useRef, useState } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";

function heartX(t: number, s: number) { return s * 16 * Math.pow(Math.sin(t), 3) / 17; }
function heartY(t: number, s: number) { return -s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17; }

function rand(a: number, b: number) { return Math.random() * (b - a) + a; }

interface Star { x: number; y: number; z: number; r: number; a: number; pa: number; ps: number; }
interface Particle {
  x: number; y: number; rx: number; ry: number; z: number; r: number;
  color: string; speed: number; progress: number;
  trail: { x: number; y: number }[]; alpha: number;
}
interface Petal {
  x: number; y: number; vx: number; vy: number; rot: number; rotS: number;
  size: number; color: string; alpha: number; swing: number; swingS: number;
}

export default function YouAndMeScene({ onNext, isActive, reducedMotion }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const [showNext, setShowNext] = useState(false);
  const [textAlpha, setTextAlpha] = useState(0);

  // Safe name clamping: max 14 chars, fallback for empty/missing
  const rawName1 = normalized.youAndMe.name1 ?? "";
  const rawName2 = normalized.youAndMe.name2 ?? normalized.recipient.name ?? "";
  const name1 = (rawName1.trim().slice(0, 14) || "YOU").toUpperCase();
  const name2 = (rawName2.trim().slice(0, 14) || "ME").toUpperCase();

  useEffect(() => {
    mountedRef.current = true;
    const canvasEl = canvasRef.current;
    if (!canvasEl || reducedMotion) return;
    const ctxOrNull = canvasEl.getContext("2d");
    if (!ctxOrNull) return;
    // Non-null aliases for use in closures
    const canvas: HTMLCanvasElement = canvasEl;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx: CanvasRenderingContext2D = ctxOrNull;
    let W = 0, H = 0;

    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      W = c.width = c.offsetWidth;
      H = c.height = c.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0, phase = 0, phaseTimer = 0;
    let particles: Particle[] = [];
    let petals: Petal[] = [];
    let stars: Star[] = [];
    let ecgPts: { x: number; y: number }[] = [];
    let ecgX = 0;
    let localTextAlpha = 0;
    let allArrived = false;
    let doneTimer = 0;

    function buildStars() {
      stars = [];
      for (let i = 0; i < 300; i++) {
        const z = rand(0.3, 1.3);
        stars.push({
          x: rand(0, W), y: rand(0, H), z,
          r: rand(0.2, 1.5) * z, a: rand(0.1, 0.8) * z,
          pa: rand(0, Math.PI * 2), ps: rand(0.01, 0.03),
        });
      }
    }

    function buildParticles() {
      const size = Math.min(W, H) * 0.32;
      const hpts: { rx: number; ry: number }[] = [];
      for (let i = 0; i < 600; i++) {
        const a = (i / 600) * Math.PI * 2;
        hpts.push({ rx: heartX(a, size), ry: heartY(a, size) - 20 });
      }
      particles = hpts.map((p) => {
        const a = rand(0, Math.PI * 2);
        const dist = rand(50, Math.max(W, H) * 0.8);
        return {
          x: W / 2 + Math.cos(a) * dist,
          y: H / 2 + Math.sin(a) * dist,
          rx: p.rx, ry: p.ry,
          z: rand(0.6, 1.5),
          r: rand(1.5, 3.5),
          color: `hsl(${rand(340, 380)},${rand(80, 100)}%,${rand(55, 80)}%)`,
          speed: rand(0.012, 0.028),
          progress: rand(-0.5, 0),
          trail: [], alpha: 0,
        };
      });
    }

    function drawStars() {
      stars.forEach((s) => {
        s.pa += s.ps;
        const a = s.a * (0.5 + 0.5 * Math.sin(s.pa));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      });
    }

    function drawECG() {
      ecgX += 3.5;
      const cx = W / 2, cy = H / 2, w = W * 0.7, startX = cx - w / 2;
      const relX = ecgX - startX;
      let y = cy;

      if (relX > w * 0.3 && relX < w * 0.32) y = cy - 5;
      else if (relX > w * 0.32 && relX < w * 0.34) y = cy + 8;
      else if (relX > w * 0.34 && relX < w * 0.42) {
        const p = (relX - w * 0.34) / (w * 0.08);
        if (p < 0.2) y = cy - H * 0.22 * p / 0.2;
        else if (p < 0.4) y = cy - H * 0.22 + (H * 0.22 + H * 0.12) * (p - 0.2) / 0.2;
        else if (p < 0.55) y = cy + H * 0.12 - (H * 0.12) * (p - 0.4) / 0.15;
        else y = cy;
      } else if (relX > w * 0.44 && relX < w * 0.46) y = cy - 8;
      else if (relX > w * 0.46 && relX < w * 0.48) y = cy + 5;

      ecgPts.push({ x: ecgX, y });
      if (ecgPts.length > 220) ecgPts.shift();

      ctx.beginPath();
      ctx.strokeStyle = "#ff4466";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ff4466";
      ctx.shadowBlur = 12;
      ecgPts.forEach((p, i) => {
        ctx.globalAlpha = i / ecgPts.length;
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(ecgX, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#ff4466";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (ecgX > W / 2 + W * 0.35) {
        phase = 1;
        ecgPts = [];
      }
    }

    function drawParticles() {
      particles.forEach((p) => {
        p.progress = Math.min(p.progress + p.speed, 1);
        if (p.progress < 0) { p.alpha = 0; return; }
        const tx = W / 2 + p.rx;
        const ty = H / 2 + p.ry;
        p.x = p.x + (tx - p.x) * 0.06;
        p.y = p.y + (ty - p.y) * 0.06;
        p.alpha = Math.min(p.alpha + 0.04, 1);
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();

        const rad = p.r * p.z;
        p.trail.forEach((tr, i) => {
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, rad * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = (i / p.trail.length) * 0.3 * p.alpha;
          ctx.fill();
        });

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * p.z;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });
    }

    function spawnPetals() {
      if (Math.random() < 0.12) {
        const z = rand(0.5, 1.4);
        petals.push({
          x: rand(0, W), y: -20,
          vx: rand(-1, 1) * z, vy: rand(1, 2.5) * z,
          rot: rand(0, Math.PI * 2), rotS: rand(-0.04, 0.04),
          size: rand(8, 18) * z,
          color: `hsl(${rand(330, 360)},${rand(70, 100)}%,${rand(55, 75)}%)`,
          alpha: rand(0.5, 1) * Math.min(z, 1),
          swing: rand(0, Math.PI * 2), swingS: rand(0.02, 0.05),
        });
      }
      petals = petals.filter((p) => p.y < H + 30);
      petals.forEach((p) => {
        p.y += p.vy; p.swing += p.swingS;
        p.x += p.vx + Math.sin(p.swing) * 1.2;
        p.rot += p.rotS;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size / 2, p.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      });
    }

    function drawGlow() {
      const g = ctx.createRadialGradient(W / 2, H / 2 - 20, 0, W / 2, H / 2 - 20, Math.min(W, H) * 0.35);
      g.addColorStop(0, "rgba(255,50,80,0.12)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    buildStars();
    buildParticles();

    function loop() {
      if (!mountedRef.current) return;
      t++; phaseTimer++;

      const tiltX = Math.sin(t * 0.0035) * 3;
      const tiltY = Math.cos(t * 0.0027) * 4;
      if (canvas.parentElement) {
        canvas.parentElement.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }

      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, W, H);
      drawStars();

      if (phase === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.fillText("♥  LOVE IS IN THE CODE  ♥", W / 2, H / 2 - H * 0.2);
        drawECG();
      }

      if (phase === 1) {
        drawParticles();
        drawGlow();
        const arrived = particles.filter((p) => p.progress >= 1).length;
        const ratio = arrived / particles.length;

        if (ratio > 0.6) {
          localTextAlpha = Math.min(localTextAlpha + 0.015, 1);
          setTextAlpha(localTextAlpha);
        }

        if (ratio >= 0.95 && !allArrived) allArrived = true;
        if (allArrived) { doneTimer++; spawnPetals(); }
        if (allArrived && doneTimer > 180 && mountedRef.current) {
          setShowNext(true);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, name1, name2]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (reducedMotion) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "#000",
        textAlign: "center",
        gap: "24px",
      }}>
        <div style={{ fontSize: "clamp(3rem, 10vw, 5rem)" }}>❤️</div>
        <h2 style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(1.4rem, 5vw, 2.2rem)",
          color: "#fff",
          letterSpacing: "0.1em",
          textShadow: "0 0 30px #ff4466",
        }}>
          {name1} & {name2}
        </h2>
        <p style={{ color: "rgba(255,180,180,0.8)", letterSpacing: "0.2em", fontSize: "0.85rem" }}>
          WRITTEN IN THE STARS
        </p>
        <button onClick={onNext} style={{
          marginTop: "16px", padding: "14px 32px", borderRadius: "999px",
          border: "1px solid rgba(255,68,102,0.5)",
          background: "rgba(255,68,102,0.15)",
          color: "#fff", fontSize: "1rem", cursor: "pointer",
        }}>Continue ✨</button>
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100dvh",
      background: "#000",
      overflow: "hidden",
      transformStyle: "preserve-3d",
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Text overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        gap: "8px",
      }}>
        <div style={{
          fontFamily: "Georgia, serif",
          color: `rgba(255,255,255,${textAlpha})`,
          fontSize: "clamp(1.2rem, 4vw, 2rem)",
          textAlign: "center",
          letterSpacing: "6px",
          textShadow: `0 0 ${30 * textAlpha}px #ff4466, 0 0 ${60 * textAlpha}px #ff4466`,
          lineHeight: 2,
          padding: "0 24px",
        }}>
          {name1} & {name2}
          <br />
          <span style={{
            fontSize: "0.5em",
            letterSpacing: "8px",
            color: `rgba(255,180,180,${textAlpha})`,
          }}>
            WRITTEN IN THE STARS
          </span>
        </div>
      </div>

      {/* Continue button */}
      {showNext && (
        <div style={{
          position: "absolute",
          bottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          animation: "fadeInUp 0.6s ease forwards",
          pointerEvents: "auto",
        }}>
          <button
            onClick={onNext}
            style={{
              padding: "14px 36px",
              borderRadius: "999px",
              border: "1px solid rgba(255,68,102,0.5)",
              background: "rgba(255,68,102,0.15)",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
            }}
          >
            Continue ✨
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
