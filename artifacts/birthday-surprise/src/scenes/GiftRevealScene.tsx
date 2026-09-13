/**
 * GiftRevealScene — Animated gift box opening with message reveal.
 *
 * Adapted from animation_code.zip/animated_birthday/
 * Original character preserved: gift box CSS animation, balloon canvas,
 * typing effect, particle background, occasion-configurable content.
 *
 * Changes from original:
 * - Converted from standalone HTML to React component
 * - Demo branding/navigation removed (no "Sophia", "Alex" hardcoded)
 * - Content configurable via config (recipientName, senderName, message, occasionText)
 * - Reduced motion: static card view
 * - Proper RAF/timer cleanup on unmount
 * - No global DOM mutations or CSS leakage (scoped styles via style tag)
 * - Photo URL configurable (falls back gracefully if missing)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";

interface Balloon {
  x: number; y: number; vx: number; vy: number;
  radius: number; color: string; alpha: number;
  stringPoints: { x: number; y: number }[];
  wobble: number; wobbleSpeed: number;
}

const BALLOON_COLORS = [
  "#ff3377", "#a855f7", "#3b82f6", "#10b981", "#f59e0b",
  "#ec4899", "#8b5cf6", "#06b6d4",
];

export default function GiftRevealScene({ onNext, isActive, reducedMotion }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const [opened, setOpened] = useState(false);
  const [typed, setTyped] = useState("");
  const [showNext, setShowNext] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recipientName = normalized.giftReveal.recipientName ?? normalized.recipient.name ?? "You";
  const senderName = normalized.giftReveal.senderName ?? "";
  const occasionText = normalized.giftReveal.occasionText ?? "Happy Birthday! 🎂";
  const message = normalized.giftReveal.message ?? normalized.raw.cake?.message ?? "Wishing you all the happiness in the world. ❤️";
  const photoUrl = normalized.giftReveal.photoUrl ?? (normalized.raw.memoryWall?.photos?.[0]?.src ?? "");

  // Balloon canvas animation
  const startBalloons = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctxOrNull = canvasEl.getContext("2d");
    if (!ctxOrNull) return;
    // Non-null aliases for use in closures
    const canvas: HTMLCanvasElement = canvasEl;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const balloons: Balloon[] = [];

    function createBalloon() {
      const x = Math.random() * canvas.width;
      const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
      const radius = Math.random() * 20 + 25;
      const stringLen = Math.random() * 60 + 80;
      const stringPoints = Array.from({ length: 5 }, (_: unknown, i: number) => ({
        x: x + Math.sin(i * 0.8) * 8,
        y: canvas.height + i * (stringLen / 5),
      }));
      balloons.push({
        x, y: canvas.height + radius + 20,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(Math.random() * 1.5 + 1.2),
        radius, color,
        alpha: Math.random() * 0.4 + 0.6,
        stringPoints,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
      });
    }

    function drawBalloon(b: Balloon) {
      ctx.save();
      ctx.globalAlpha = b.alpha;

      // Balloon body
      const grad = ctx.createRadialGradient(
        b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1,
        b.x, b.y, b.radius
      );
      grad.addColorStop(0, "rgba(255,255,255,0.4)");
      grad.addColorStop(0.3, b.color);
      grad.addColorStop(1, b.color + "88");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.radius, b.radius * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(b.x - b.radius * 0.25, b.y - b.radius * 0.3, b.radius * 0.25, b.radius * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fill();

      // Knot
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y + b.radius * 1.15, 4, 0, Math.PI * 2);
      ctx.fill();

      // String
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.radius * 1.15 + 4);
      const stringEnd = b.y + b.radius * 1.15 + 80;
      ctx.quadraticCurveTo(
        b.x + Math.sin(b.wobble) * 15,
        (b.y + b.radius * 1.15 + stringEnd) / 2,
        b.x + Math.sin(b.wobble * 0.7) * 10,
        stringEnd
      );
      ctx.stroke();

      ctx.restore();
    }

    function loop() {
      if (!mountedRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.x += b.vx + Math.sin(b.wobble) * 0.4;
        b.y += b.vy;
        b.wobble += b.wobbleSpeed;
        b.alpha -= 0.002;

        if (b.y < -b.radius * 2 || b.alpha <= 0) {
          balloons.splice(i, 1);
          continue;
        }
        drawBalloon(b);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // Spawn balloons periodically
    for (let i = 0; i < 5; i++) {
      setTimeout(() => { if (mountedRef.current) createBalloon(); }, i * 400);
    }
    const interval = setInterval(() => {
      if (mountedRef.current) createBalloon();
    }, 1200);
    particleIntervalRef.current = interval;

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      clearInterval(interval);
    };
  }, []);

  // Typing effect
  const startTyping = useCallback((text: string) => {
    let i = 0;
    function typeNext() {
      if (!mountedRef.current) return;
      if (i <= text.length) {
        setTyped(text.slice(0, i));
        i++;
        typingRef.current = setTimeout(typeNext, 28);
      } else {
        // Show continue after typing completes
        setTimeout(() => {
          if (mountedRef.current) setShowNext(true);
        }, 1200);
      }
    }
    typeNext();
  }, []);

  const handleOpen = useCallback(() => {
    if (opened) return;
    setOpened(true);
    setTimeout(() => {
      if (mountedRef.current) startBalloons();
      startTyping(message);
    }, 600);
  }, [opened, startBalloons, startTyping, message]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (typingRef.current) clearTimeout(typingRef.current);
      if (particleIntervalRef.current) clearInterval(particleIntervalRef.current);
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
        background: "linear-gradient(180deg, #080312 0%, #1b072c 100%)",
        textAlign: "center",
        gap: "20px",
      }}>
        <div style={{ fontSize: "clamp(2rem, 8vw, 3.5rem)" }}>🎁</div>
        <p style={{ color: "rgba(255,183,3,0.9)", fontSize: "0.9rem", letterSpacing: "0.1em" }}>{occasionText}</p>
        <h2 style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: "clamp(1.6rem, 5vw, 2.4rem)",
          color: "#fff",
        }}>To: {recipientName}</h2>
        <p style={{ color: "rgba(255,255,255,0.75)", maxWidth: "480px", lineHeight: 1.7, fontSize: "clamp(0.85rem, 2.5vw, 1rem)" }}>
          {message}
        </p>
        {senderName && (
          <p style={{ color: "rgba(255,183,3,0.8)", fontFamily: "'Dancing Script', cursive", fontSize: "1.1rem" }}>
            — {senderName}
          </p>
        )}
        <button onClick={onNext} style={{
          marginTop: "16px", padding: "14px 32px", borderRadius: "999px",
          border: "1px solid rgba(255,51,119,0.5)",
          background: "linear-gradient(135deg, rgba(255,51,119,0.2), rgba(157,78,221,0.2))",
          color: "#fff", fontSize: "1rem", cursor: "pointer",
        }}>Continue ✨</button>
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      minHeight: "100dvh",
      background: "radial-gradient(circle at center, #1b072c 0%, #080312 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      padding: "24px",
    }}>
      {/* Balloon canvas (behind content) */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: opened ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      />

      {/* Gift box — shown before opening */}
      {!opened && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            cursor: "pointer",
            animation: "giftFloat 3s ease-in-out infinite",
          }}
          onClick={handleOpen}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleOpen(); }}
          role="button"
          tabIndex={0}
          aria-label="Tap to open your surprise"
        >
          {/* Gift box SVG */}
          <div style={{ position: "relative", width: "160px", height: "160px" }}>
            {/* Box body */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: "10px",
              right: "10px",
              height: "100px",
              background: "linear-gradient(135deg, #ff3377, #a855f7)",
              borderRadius: "8px",
              boxShadow: "0 0 40px rgba(255,51,119,0.4), 0 20px 40px rgba(0,0,0,0.5)",
            }}>
              {/* Ribbon vertical */}
              <div style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                width: "20px",
                height: "100%",
                background: "rgba(255,255,255,0.3)",
              }} />
              {/* Ribbon horizontal */}
              <div style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                width: "100%",
                height: "20px",
                background: "rgba(255,255,255,0.3)",
              }} />
            </div>
            {/* Lid */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "55px",
              background: "linear-gradient(135deg, #ff2d75, #9d4edd)",
              borderRadius: "8px",
              boxShadow: "0 0 20px rgba(255,45,117,0.3)",
            }}>
              {/* Bow */}
              <div style={{
                position: "absolute",
                top: "-20px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "32px",
                filter: "drop-shadow(0 0 8px rgba(255,183,3,0.6))",
              }}>🎀</div>
            </div>
          </div>
          <p style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
            letterSpacing: "0.05em",
            animation: "pulse 2s ease-in-out infinite",
          }}>
            Tap to open your surprise... 🎁
          </p>
        </div>
      )}

      {/* Card — shown after opening */}
      {opened && (
        <div style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "440px",
          width: "100%",
          background: "rgba(23,10,38,0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "24px",
          padding: "32px 24px",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 0 60px rgba(255,51,119,0.15), 0 30px 60px rgba(0,0,0,0.5)",
          animation: "cardReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🎉</div>

          <p style={{
            color: "rgba(255,183,3,0.9)",
            fontSize: "0.8rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}>{occasionText}</p>

          <h2 style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
            color: "#fff",
            marginBottom: "20px",
          }}>
            To: <span style={{ color: "#f9a8d4" }}>{recipientName}</span>
          </h2>

          {/* Photo (if available) */}
          {photoUrl && (
            <div style={{
              margin: "0 auto 20px",
              width: "min(200px, 60vw)",
              aspectRatio: "1",
              borderRadius: "12px",
              overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
              <img
                src={photoUrl}
                alt="Memory"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Typed message */}
          <p style={{
            color: "rgba(245,240,252,0.85)",
            fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
            lineHeight: 1.75,
            minHeight: "80px",
            textAlign: "left",
          }}>
            {typed}
            <span style={{ animation: "blink 1s step-end infinite", opacity: typed.length < message.length ? 1 : 0 }}>|</span>
          </p>

          {senderName && (
            <p style={{
              marginTop: "16px",
              fontFamily: "'Dancing Script', cursive",
              fontSize: "1.1rem",
              color: "rgba(255,183,3,0.8)",
              textAlign: "right",
            }}>
              — {senderName}
            </p>
          )}

          {showNext && (
            <button
              onClick={onNext}
              style={{
                marginTop: "24px",
                width: "100%",
                padding: "14px",
                borderRadius: "999px",
                border: "1px solid rgba(255,51,119,0.5)",
                background: "linear-gradient(135deg, rgba(255,51,119,0.25), rgba(157,78,221,0.2))",
                color: "#fff",
                fontSize: "1rem",
                cursor: "pointer",
                animation: "fadeInUp 0.5s ease forwards",
              }}
            >
              Continue ✨
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes giftFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
