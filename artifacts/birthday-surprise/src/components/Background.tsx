import { useEffect, useRef, useMemo } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const isSmallScreen = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

// Floating hearts layer — pure CSS for silky 60fps
function FloatingHearts() {
  const hearts = useMemo(() => {
    const count = reducedMotion() ? 0 : isSmallScreen() ? 12 : 18;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${4 + (i * 5.5) % 92}%`,
      size: 10 + (i * 7) % 18,
      delay: `${(i * 0.7) % 9}s`,
      duration: `${7 + (i * 0.9) % 8}s`,
      color: [
        "rgba(244,114,182,0.55)",
        "rgba(192,132,252,0.5)",
        "rgba(232,121,249,0.45)",
        "rgba(249,168,212,0.4)",
        "rgba(167,139,250,0.48)",
      ][i % 5],
      shape: i % 4 === 0 ? "✦" : "♥",
    }));
  }, []);

  if (hearts.length === 0) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
      {hearts.map(h => (
        <div key={h.id} className="floating-heart" style={{
          position: "absolute",
          bottom: "-30px",
          left: h.left,
          fontSize: `${h.size}px`,
          color: h.color,
          animationDuration: h.duration,
          animationDelay: h.delay,
        }}>
          {h.shape}
        </div>
      ))}
    </div>
  );
}

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth, H = window.innerHeight;
    // Crisp rendering on high-DPI (retina / mobile) screens, capped for perf
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const applySize = () => {
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    applySize();

    // Fewer particles on small screens — keeps animations at 60fps on phones
    const small = isSmallScreen();
    const STAR_COUNT = small ? 70 : 130;
    const ORB_COUNT = small ? 5 : 8;

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.3 + Math.random() * 1.4,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.003,
    }));

    const orbs = Array.from({ length: ORB_COUNT }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 90 + Math.random() * 180,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.10,
      // Purple / pink / a hint of deep blue for extra depth
      hue: i % 3 === 0 ? 270 : i % 3 === 1 ? 320 : 230,
      a: 0.02 + Math.random() * 0.03,
    }));

    let animId = 0;
    let frame = 0;
    let running = true;
    const staticOnly = reducedMotion();

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Rich deep purple background
      const bg = ctx.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.5, H * 0.5, Math.max(W, H));
      bg.addColorStop(0, "#1e0550");
      bg.addColorStop(0.4, "#0f0228");
      bg.addColorStop(1, "#060118");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Soft aurora band drifting across the top
      const auroraShift = Math.sin(frame * 0.0016) * W * 0.18;
      const aurora = ctx.createLinearGradient(auroraShift, 0, W + auroraShift, H * 0.55);
      aurora.addColorStop(0, "rgba(124,58,237,0.05)");
      aurora.addColorStop(0.5, "rgba(236,72,153,0.045)");
      aurora.addColorStop(1, "rgba(56,189,248,0.03)");
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 0, W, H * 0.6);

      // Subtle pink vignette bottom
      const vig = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H * 0.8, W * 0.7);
      vig.addColorStop(0, "rgba(190,24,93,0.06)");
      vig.addColorStop(1, "transparent");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Ambient orbs
      orbs.forEach(o => {
        o.x += o.vx; o.y += o.vy;
        if (o.x < -o.r) o.x = W + o.r;
        if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r;
        if (o.y > H + o.r) o.y = -o.r;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, `hsla(${o.hue},80%,58%,${o.a})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      });

      // Twinkle stars
      stars.forEach(s => {
        s.a = Math.max(0.05, Math.min(0.85, s.a + s.da));
        if (s.a <= 0.05 || s.a >= 0.85) s.da *= -1;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
      });

      // Shooting star every ~280 frames
      const starCycle = frame % 280;
      if (starCycle < 55) {
        const t = starCycle / 55;
        const sx0 = W * 0.85 + Math.sin(frame * 0.002) * 80;
        const sy0 = H * 0.04;
        const len = 160;
        const sx = sx0 + t * len * 1.3;
        const sy = sy0 + t * len * 0.85;
        const g2 = ctx.createLinearGradient(sx - len, sy - len * 0.65, sx, sy);
        g2.addColorStop(0, "transparent");
        g2.addColorStop(0.5, "rgba(210,190,255,0.55)");
        g2.addColorStop(1, "rgba(255,255,255,0.95)");
        ctx.beginPath();
        ctx.moveTo(sx - len, sy - len * 0.65);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = g2; ctx.lineWidth = 1.8; ctx.stroke();
      }

      if (running && !staticOnly) animId = requestAnimationFrame(draw);
    };

    draw();

    // Pause the loop when the tab is hidden — saves battery on mobile
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animId);
      } else if (!staticOnly) {
        running = true;
        animId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      applySize();
      stars.forEach(s => { s.x = Math.random() * W; s.y = Math.random() * H; });
      if (staticOnly) draw();
    };
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} style={{
        position: "fixed", inset: 0, zIndex: 0,
        width: "100%", height: "100%", pointerEvents: "none",
      }} />
      <FloatingHearts />
    </>
  );
}
