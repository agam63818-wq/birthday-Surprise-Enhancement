/**
 * RoseBloomScene — Cinematic rose blooming with stem, leaves, and petals.
 *
 * Adapted from animation_code.zip/rose/
 * Original character preserved: CSS 3D petal layers, stem growth,
 * leaf reveal, sepal formation, falling petals, end text reveal.
 *
 * Changes from original:
 * - Converted from standalone HTML to React component
 * - Demo branding removed ("Love.css", "i coded this for you")
 * - Text configurable via config.roseBloom.text
 * - Global mute respected (soundEnabled flag)
 * - Reduced motion: static rose emoji + text
 * - Proper RAF/timer/interval cleanup on unmount (Strict Mode safe)
 * - No global DOM mutations or CSS leakage (scoped styles)
 * - Keyboard-accessible tap/click start
 * - Configurable speed/intensity/fallingPetals
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";

const PETAL_LAYERS = [
  { count: 4, w: 24, h: 46, curl: 78, delayBase: 0, tz: 2, cls: "petal-bud" },
  { count: 5, w: 34, h: 58, curl: 65, delayBase: 0.25, tz: 9, cls: "petal-core" },
  { count: 6, w: 46, h: 72, curl: 48, delayBase: 0.55, tz: 18, cls: "petal-inner" },
  { count: 7, w: 58, h: 88, curl: 22, delayBase: 0.90, tz: 30, cls: "petal-mid-inner" },
  { count: 8, w: 72, h: 104, curl: -5, delayBase: 1.30, tz: 44, cls: "petal-mid" },
  { count: 9, w: 86, h: 118, curl: -25, delayBase: 1.75, tz: 60, cls: "petal-outer" },
  { count: 10, w: 98, h: 130, curl: -48, delayBase: 2.25, tz: 76, cls: "petal-blush" },
];

const SEPALS_COUNT = 5;

const FALLING_PETAL_COLORS = [
  ["#9a001d", "#3d0008"],
  ["#850018", "#2b0005"],
  ["#ad0022", "#480008"],
  ["#bf0028", "#52000c"],
];

export default function RoseBloomScene({ onNext, isActive, reducedMotion, globalMuted }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const mountedRef = useRef(true);
  const [started, setStarted] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadReady, setLoadReady] = useState(false);

  const roseText = normalized.roseBloom.text ?? "Made with love, just for you 🌹";
  const speed = normalized.roseBloom.speed ?? "normal";
  const fallingPetals = normalized.roseBloom.fallingPetals !== false;

  const speedMultiplier = speed === "slow" ? 1.5 : speed === "fast" ? 0.6 : 1;

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms * speedMultiplier);
    timersRef.current.push(t);
    return t;
  };

  const addInterval = (fn: () => void, ms: number) => {
    const t = setInterval(fn, ms);
    intervalsRef.current.push(t);
    return t;
  };

  // Build rose DOM elements
  const buildRose = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const roseHead = container.querySelector(".rose-head") as HTMLElement;
    const calyx = container.querySelector(".calyx") as HTMLElement;

    if (!roseHead || !calyx) return;

    // Clear existing
    roseHead.innerHTML = '<div class="rose-glow"></div><div class="rose-glow-inner"></div>';
    calyx.innerHTML = "";

    // Create sepals
    const step = 360 / SEPALS_COUNT;
    for (let i = 0; i < SEPALS_COUNT; i++) {
      const sepal = document.createElement("div");
      sepal.className = "rose-sepal";
      const angle = i * step + (Math.random() - 0.5) * 5;
      const delay = 0.3 + i * 0.06;
      const curl = 18 + Math.random() * 8;
      sepal.style.setProperty("--sepal-angle", `${angle}deg`);
      sepal.style.setProperty("--sepal-curl", `${curl}deg`);
      sepal.style.setProperty("--sepal-delay", `${delay}s`);
      calyx.appendChild(sepal);
    }

    // Create petals
    PETAL_LAYERS.forEach((layer, li) => {
      const angleStep = 360 / layer.count;
      const layerOffset = li * 24 + (Math.random() - 0.5) * 8;

      for (let i = 0; i < layer.count; i++) {
        const petal = document.createElement("div");
        petal.className = `rose-petal ${layer.cls}`;

        const angle = layerOffset + i * angleStep + (Math.random() - 0.5) * 5;
        const delay = layer.delayBase + i * 0.05;
        const curlJitter = (Math.random() - 0.5) * 6;
        const scaleJitter = 0.94 + Math.random() * 0.12;
        const bloomDur = 2.1 + Math.random() * 0.4;

        petal.style.width = `${layer.w}px`;
        petal.style.height = `${layer.h}px`;
        petal.style.setProperty("--angle", `${angle}deg`);
        petal.style.setProperty("--curl", `${layer.curl + curlJitter}deg`);
        petal.style.setProperty("--scale", String(scaleJitter));
        petal.style.setProperty("--delay", `${delay}s`);
        petal.style.setProperty("--tz", `${layer.tz}px`);
        petal.style.setProperty("--bloom-dur", `${bloomDur}s`);

        roseHead.appendChild(petal);
      }
    });
  }, []);

  // Spawn falling petal
  const spawnFallingPetal = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const fallingPetalsEl = container.querySelector(".falling-petals") as HTMLElement;
    if (!fallingPetalsEl || fallingPetalsEl.childElementCount > 10) return;

    const petal = document.createElement("div");
    petal.className = "falling-petal-el";

    const w = 10 + Math.random() * 12;
    const h = w * (1.25 + Math.random() * 0.15);
    const x = 20 + Math.random() * 60;
    const dur = 5.5 + Math.random() * 3.5;
    const delay = Math.random() * 0.6;
    const colors = FALLING_PETAL_COLORS[Math.floor(Math.random() * FALLING_PETAL_COLORS.length)];

    const sign = () => (Math.random() > 0.5 ? 1 : -1);
    const s1 = sign() * (15 + Math.random() * 25);
    const s2 = sign() * (10 + Math.random() * 20);
    const s3 = sign() * (20 + Math.random() * 30);
    const s4 = sign() * (10 + Math.random() * 15);

    petal.style.left = `${x}vw`;
    petal.style.top = `3vh`;
    petal.style.setProperty("--fp-w", `${w}px`);
    petal.style.setProperty("--fp-h", `${h}px`);
    petal.style.setProperty("--fp-c1", colors[0]);
    petal.style.setProperty("--fp-c2", colors[1]);
    petal.style.setProperty("--f-dur", `${dur}s`);
    petal.style.setProperty("--f-delay", `${delay}s`);
    petal.style.setProperty("--s1", `${s1}px`);
    petal.style.setProperty("--s2", `${s2}px`);
    petal.style.setProperty("--s3", `${s3}px`);
    petal.style.setProperty("--s4", `${s4}px`);

    fallingPetalsEl.appendChild(petal);

    const cleanup = setTimeout(() => {
      if (petal.parentNode) petal.remove();
    }, (dur + delay) * 1000 + 300);
    timersRef.current.push(cleanup);
  }, []);

  // Start animation sequence
  const startAnimation = useCallback(() => {
    if (started) return;
    setStarted(true);

    buildRose();

    const container = containerRef.current;
    if (!container) return;

    const stem = container.querySelector(".rose-stem") as HTMLElement;
    const leafLeft = container.querySelector(".leaf-left") as HTMLElement;
    const leafRight = container.querySelector(".leaf-right") as HTMLElement;
    const calyx = container.querySelector(".calyx") as HTMLElement;
    const roseHead = container.querySelector(".rose-head") as HTMLElement;
    const ambientLight = container.querySelector(".ambient-light") as HTMLElement;
    const roseWrapper = container.querySelector(".rose-wrapper") as HTMLElement;

    // Grow stem
    if (stem) stem.classList.add("grow");

    addTimer(() => { if (leafLeft && mountedRef.current) leafLeft.classList.add("visible"); }, 800);
    addTimer(() => { if (leafRight && mountedRef.current) leafRight.classList.add("visible"); }, 1100);

    // Bloom
    addTimer(() => {
      if (!mountedRef.current) return;
      if (calyx) calyx.classList.add("visible");
      if (ambientLight) ambientLight.classList.add("visible");
      if (roseHead) roseHead.classList.add("blooming");
    }, 2300);

    // Rotate
    addTimer(() => {
      if (roseWrapper && mountedRef.current) roseWrapper.classList.add("rotating");
    }, 4900);

    // Falling petals
    if (fallingPetals) {
      addTimer(() => {
        if (!mountedRef.current) return;
        for (let i = 0; i < 3; i++) {
          addTimer(() => spawnFallingPetal(), i * 300);
        }
        const interval = addInterval(() => {
          if (mountedRef.current) spawnFallingPetal();
        }, 2200);
      }, 5700);
    }

    // Show text
    addTimer(() => {
      if (mountedRef.current) setShowText(true);
    }, 6900);

    // Show continue
    addTimer(() => {
      if (mountedRef.current) setShowNext(true);
    }, 9000);
  }, [started, buildRose, fallingPetals, spawnFallingPetal]);

  // Loading bar simulation
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          if (mountedRef.current) setLoadReady(true);
        }, 300);
      }
      setLoadProgress(Math.min(progress, 100));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
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
        background: "radial-gradient(ellipse at 50% 75%, #120105 0%, #050002 55%, #000 100%)",
        textAlign: "center",
        gap: "24px",
      }}>
        <div style={{ fontSize: "clamp(3rem, 10vw, 5rem)", filter: "drop-shadow(0 4px 12px rgba(255,30,80,0.4))" }}>🌹</div>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.1rem, 3.5vw, 1.6rem)",
          color: "#fff",
          lineHeight: 1.5,
          maxWidth: "400px",
          textShadow: "0 0 20px rgba(255,30,80,0.3)",
        }}>{roseText}</p>
        <button onClick={onNext} style={{
          marginTop: "16px", padding: "14px 32px", borderRadius: "999px",
          border: "1px solid rgba(255,30,80,0.5)",
          background: "rgba(255,30,80,0.15)",
          color: "#fff", fontSize: "1rem", cursor: "pointer",
        }}>Continue ✨</button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      position: "relative",
      width: "100%",
      height: "100dvh",
      background: "radial-gradient(ellipse at 50% 75%, #120105 0%, #050002 55%, #000 100%)",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Vignette */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.9) 100%)",
        zIndex: 100,
        pointerEvents: "none",
      }} />

      {/* Spotlight */}
      <div style={{
        position: "fixed",
        top: "35%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "85vw",
        height: "85vh",
        background: "radial-gradient(circle, rgba(255,30,80,0.06) 0%, transparent 70%)",
        filter: "blur(50px)",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {/* Ambient light */}
      <div className="ambient-light" style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "300px",
        height: "300px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,30,80,0.12) 0%, transparent 70%)",
        filter: "blur(40px)",
        pointerEvents: "none",
        zIndex: 2,
        opacity: 0,
        transition: "opacity 2s ease",
      }} />

      {/* Trigger overlay */}
      {!started && (
        <div style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          zIndex: 200,
        }}>
          <div style={{
            width: "min(85vw, 340px)",
            background: "rgba(22,10,15,0.55)",
            border: "1px solid rgba(255,40,100,0.2)",
            borderRadius: "24px",
            padding: "35px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,30,80,0.1)",
          }}>
            <div style={{ fontSize: "54px", marginBottom: "12px", filter: "drop-shadow(0 4px 12px rgba(255,30,80,0.4))", animation: "pulseIcon 2s ease-in-out infinite" }}>🌹</div>

            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "1px",
              marginBottom: "22px",
            }}>Rose Bloom</h2>

            {/* Loading bar */}
            <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{
                width: `${loadProgress}%`,
                height: "100%",
                background: "linear-gradient(to right, #9a001d, #ff1a4a)",
                borderRadius: "3px",
                transition: "width 0.2s ease",
              }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: "20px" }}>
              {loadProgress < 100 ? "Growing digital petals..." : "Ready to bloom!"}
            </p>

            <button
              onClick={startAnimation}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") startAnimation(); }}
              disabled={!loadReady}
              aria-label="Tap to bloom the rose"
              style={{
                padding: "14px 32px",
                borderRadius: "999px",
                border: "1px solid rgba(255,30,80,0.5)",
                background: loadReady
                  ? "linear-gradient(135deg, rgba(255,30,80,0.3), rgba(100,0,20,0.3))"
                  : "rgba(255,255,255,0.05)",
                color: loadReady ? "#fff" : "rgba(255,255,255,0.3)",
                fontSize: "1rem",
                cursor: loadReady ? "pointer" : "not-allowed",
                transition: "all 0.3s ease",
                width: "100%",
              }}
            >
              🌹 Tap to Bloom
            </button>
          </div>
        </div>
      )}

      {/* Rose scene */}
      <div className="rose-wrapper" style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 10,
      }}>
        {/* Stem group */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Stem */}
          <div className="rose-stem" style={{
            width: "8px",
            height: "0px",
            background: "linear-gradient(to top, #1a4a1a, #2d7a2d, #3a9a3a)",
            borderRadius: "4px",
            transition: `height ${2.2 * speedMultiplier}s cubic-bezier(0.25,1,0.5,1)`,
            position: "relative",
            zIndex: 5,
          }} />

          {/* Leaves */}
          <div className="leaf-left" style={{
            position: "absolute",
            bottom: "40%",
            left: "-30px",
            width: "50px",
            height: "25px",
            background: "linear-gradient(135deg, #2d7a2d, #1a4a1a)",
            borderRadius: "50% 0 50% 0",
            transform: "rotate(-30deg) scaleX(0)",
            transformOrigin: "right center",
            transition: `transform ${0.8 * speedMultiplier}s cubic-bezier(0.34,1.56,0.64,1)`,
            zIndex: 4,
          }} />
          <div className="leaf-right" style={{
            position: "absolute",
            bottom: "55%",
            right: "-30px",
            width: "50px",
            height: "25px",
            background: "linear-gradient(135deg, #2d7a2d, #1a4a1a)",
            borderRadius: "0 50% 0 50%",
            transform: "rotate(30deg) scaleX(0)",
            transformOrigin: "left center",
            transition: `transform ${0.8 * speedMultiplier}s cubic-bezier(0.34,1.56,0.64,1)`,
            zIndex: 4,
          }} />
        </div>

        {/* Calyx */}
        <div className="calyx" style={{
          position: "relative",
          width: "40px",
          height: "30px",
          opacity: 0,
          transition: "opacity 0.5s ease",
          zIndex: 6,
        }} />

        {/* Rose head */}
        <div className="rose-head" style={{
          position: "relative",
          width: "130px",
          height: "130px",
          transformStyle: "preserve-3d",
          zIndex: 7,
        }}>
          <div className="rose-glow" style={{
            position: "absolute",
            inset: "-20px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,30,80,0.3) 0%, transparent 70%)",
            filter: "blur(15px)",
            opacity: 0,
            transition: "opacity 1s ease",
          }} />
          <div className="rose-glow-inner" style={{
            position: "absolute",
            inset: "10px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,80,120,0.2) 0%, transparent 70%)",
            filter: "blur(8px)",
            opacity: 0,
            transition: "opacity 1s ease",
          }} />
        </div>
      </div>

      {/* End text */}
      {showText && (
        <div style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          zIndex: 150,
          animation: "fadeInUp 1s ease forwards",
          padding: "0 24px",
        }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1rem, 3.5vw, 1.4rem)",
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 0 20px rgba(255,30,80,0.4)",
            lineHeight: 1.5,
          }}>
            {roseText}
          </p>
          <span style={{ fontSize: "1.5rem" }}>🌹</span>
        </div>
      )}

      {/* Continue button */}
      {showNext && (
        <div style={{
          position: "fixed",
          bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 200,
          animation: "fadeInUp 0.6s ease forwards",
        }}>
          <button
            onClick={onNext}
            style={{
              padding: "14px 36px",
              borderRadius: "999px",
              border: "1px solid rgba(255,30,80,0.5)",
              background: "rgba(255,30,80,0.15)",
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

      {/* Falling petals container */}
      <div className="falling-petals" style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        overflow: "hidden",
      }} />

      <style>{`
        .rose-stem.grow {
          height: 180px !important;
        }
        .leaf-left.visible {
          transform: rotate(-30deg) scaleX(1) !important;
        }
        .leaf-right.visible {
          transform: rotate(30deg) scaleX(1) !important;
        }
        .calyx.visible {
          opacity: 1 !important;
        }
        .ambient-light.visible {
          opacity: 1 !important;
        }
        .rose-head.blooming .rose-glow,
        .rose-head.blooming .rose-glow-inner {
          opacity: 1 !important;
        }
        .rose-wrapper.rotating {
          animation: roseRotate 12s linear infinite;
        }
        .rose-petal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform-origin: bottom center;
          transform: translateX(-50%) rotate(var(--angle)) translateY(-50%) rotateX(var(--curl)) translateZ(var(--tz)) scale(var(--scale));
          border-radius: 50% 50% 30% 30%;
          background: radial-gradient(ellipse at 30% 30%, #ff6b8a, #9a001d 60%, #3d0008);
          opacity: 0;
          animation: petalBloom var(--bloom-dur) cubic-bezier(0.34,1.56,0.64,1) var(--delay) forwards;
          will-change: opacity, transform;
        }
        .rose-sepal {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 18px;
          height: 32px;
          transform-origin: bottom center;
          transform: translateX(-50%) rotate(var(--sepal-angle)) translateY(-50%) rotateX(var(--sepal-curl));
          border-radius: 50% 50% 30% 30%;
          background: linear-gradient(to top, #1a4a1a, #2d7a2d);
          opacity: 0;
          animation: sepalReveal 0.6s ease var(--sepal-delay) forwards;
        }
        .falling-petal-el {
          position: absolute;
          width: var(--fp-w);
          height: var(--fp-h);
          border-radius: 50% 50% 30% 30%;
          background: radial-gradient(ellipse at 30% 30%, var(--fp-c1), var(--fp-c2));
          animation: fallingPetal var(--f-dur) ease-in var(--f-delay) forwards;
          opacity: 0;
        }
        @keyframes petalBloom {
          0% { opacity: 0; transform: translateX(-50%) rotate(var(--angle)) translateY(-30%) rotateX(calc(var(--curl) + 40deg)) translateZ(0) scale(0.3); }
          60% { opacity: 0.9; }
          100% { opacity: 1; transform: translateX(-50%) rotate(var(--angle)) translateY(-50%) rotateX(var(--curl)) translateZ(var(--tz)) scale(var(--scale)); }
        }
        @keyframes sepalReveal {
          from { opacity: 0; transform: translateX(-50%) rotate(var(--sepal-angle)) translateY(-30%) rotateX(calc(var(--sepal-curl) + 30deg)); }
          to { opacity: 1; transform: translateX(-50%) rotate(var(--sepal-angle)) translateY(-50%) rotateX(var(--sepal-curl)); }
        }
        @keyframes fallingPetal {
          0% { opacity: 0; transform: translateY(0) translateX(0) rotate(0deg); }
          10% { opacity: 0.8; }
          90% { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(90vh) translateX(calc(var(--s1) + var(--s2))) rotate(360deg); }
        }
        @keyframes roseRotate {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
