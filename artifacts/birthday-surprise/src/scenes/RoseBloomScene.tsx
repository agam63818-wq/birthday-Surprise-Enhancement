/**
 * RoseBloomScene — cinematic 3D rose bloom.
 *
 * Ported from animation_code.zip/rose (coordinate system, petal layers,
 * stem, leaves, calyx, perspective and bloom timing). React only owns
 * lifecycle, config, reduced-motion and navigation.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";

type PetalTone = "bud" | "core" | "inner" | "midInner" | "mid" | "outer" | "blush";

type PetalSpec = {
  id: string;
  tone: PetalTone;
  width: number;
  height: number;
  angle: number;
  curl: number;
  scale: number;
  delay: number;
  tz: number;
  duration: number;
};

type FallingPetal = {
  id: number;
  left: number;
  top: number;
  w: number;
  h: number;
  c1: string;
  c2: string;
  dur: number;
  delay: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
};

const PETAL_LAYERS: Array<{
  count: number;
  w: number;
  h: number;
  curl: number;
  delayBase: number;
  tz: number;
  tone: PetalTone;
}> = [
  { count: 4, w: 24, h: 46, curl: 78, delayBase: 0, tz: 2, tone: "bud" },
  { count: 5, w: 34, h: 58, curl: 65, delayBase: 0.25, tz: 9, tone: "core" },
  { count: 6, w: 46, h: 72, curl: 48, delayBase: 0.55, tz: 18, tone: "inner" },
  { count: 7, w: 58, h: 88, curl: 22, delayBase: 0.9, tz: 30, tone: "midInner" },
  { count: 8, w: 72, h: 104, curl: -5, delayBase: 1.3, tz: 44, tone: "mid" },
  { count: 9, w: 86, h: 118, curl: -25, delayBase: 1.75, tz: 60, tone: "outer" },
  { count: 10, w: 98, h: 130, curl: -48, delayBase: 2.25, tz: 76, tone: "blush" },
];

const FALLING_COLORS: Array<[string, string]> = [
  ["#9a001d", "#3d0008"],
  ["#850018", "#2b0005"],
  ["#ad0022", "#480008"],
  ["#bf0028", "#52000c"],
];

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function jitter(n: number, spread: number) {
  return (hash(n) - 0.5) * spread;
}

function buildPetals(intensity: "subtle" | "normal" | "dramatic"): PetalSpec[] {
  const layers = intensity === "subtle" ? PETAL_LAYERS.slice(0, 5) : PETAL_LAYERS;
  return layers.flatMap((layer, li) => {
    const step = 360 / layer.count;
    const offset = li * 24 + jitter(li + 3, 8);
    return Array.from({ length: layer.count }, (_, i) => {
      const n = li * 20 + i;
      return {
        id: `${layer.tone}-${i}`,
        tone: layer.tone,
        width: layer.w,
        height: layer.h,
        angle: offset + i * step + jitter(n, 5),
        curl: layer.curl + jitter(n + 40, 6),
        scale: 0.94 + hash(n + 80) * 0.12,
        delay: layer.delayBase + i * 0.05,
        tz: layer.tz,
        duration: 2.1 + hash(n + 12) * 0.4,
      };
    });
  });
}

const SEPALS = Array.from({ length: 5 }, (_, i) => ({
  angle: i * 72 + jitter(i + 2, 5),
  delay: 0.3 + i * 0.06,
  curl: 18 + hash(i + 9) * 8,
}));

export default function RoseBloomScene({
  onNext,
  isActive,
  reducedMotion,
  globalMuted,
}: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const rose = normalized.roseBloom;
  const roseText = rose.text?.trim() || "Made with love, just for you.";
  const speed = rose.speed === "slow" ? 1.25 : rose.speed === "fast" ? 0.72 : 1;
  const intensity = rose.intensity ?? "normal";
  const petals = useMemo(() => buildPetals(intensity), [intensity]);

  const [overlay, setOverlay] = useState(!reducedMotion);
  const [stemGrown, setStemGrown] = useState(reducedMotion);
  const [leafLeft, setLeafLeft] = useState(reducedMotion);
  const [leafRight, setLeafRight] = useState(reducedMotion);
  const [blooming, setBlooming] = useState(reducedMotion);
  const [rotating, setRotating] = useState(false);
  const [showText, setShowText] = useState(reducedMotion);
  const [showNext, setShowNext] = useState(reducedMotion);
  const [falling, setFalling] = useState<FallingPetal[]>([]);
  const startedRef = useRef(reducedMotion);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const petalId = useRef(0);

  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(fn, ms * speed);
    timersRef.current.push(timer);
    return timer;
  };

  const spawnFalling = () => {
    if (falling.length > 10 && petalId.current > 14) return;
    const id = ++petalId.current;
    const w = 10 + hash(id) * 12;
    const sign = (n: number) => (hash(n) > 0.5 ? 1 : -1);
    const colors = FALLING_COLORS[id % FALLING_COLORS.length];
    const petal: FallingPetal = {
      id,
      left: 18 + hash(id + 4) * 64,
      top: 4 + hash(id + 7) * 10,
      w,
      h: w * (1.25 + hash(id + 2) * 0.15),
      c1: colors[0],
      c2: colors[1],
      dur: 5.5 + hash(id + 11) * 3.5,
      delay: hash(id + 13) * 0.4,
      s1: sign(id) * (15 + hash(id + 21) * 25),
      s2: sign(id + 1) * (10 + hash(id + 22) * 20),
      s3: sign(id + 2) * (20 + hash(id + 23) * 30),
      s4: sign(id + 3) * (10 + hash(id + 24) * 15),
    };
    setFalling((prev) => [...prev.slice(-9), petal]);
    later(() => setFalling((prev) => prev.filter((p) => p.id !== id)), (petal.dur + petal.delay) * 1000 + 400);
  };

  const begin = () => {
    if (startedRef.current || !isActive) return;
    startedRef.current = true;
    setOverlay(false);

    later(() => setStemGrown(true), 720);
    later(() => setLeafLeft(true), 1480);
    later(() => setLeafRight(true), 1820);
    later(() => setBlooming(true), 2920);
    later(() => setRotating(true), 5400);
    later(() => {
      if (rose.fallingPetals === false) return;
      spawnFalling();
      spawnFalling();
      intervalRef.current = setInterval(spawnFalling, 2200);
    }, 6200);
    later(() => setShowText(true), 7400);
    later(() => setShowNext(true), 8600);
  };

  useEffect(() => {
    if (!isActive || reducedMotion) return;
    const timer = later(begin, 650);
    return () => clearTimeout(timer);
    // begin is stable for a given mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, reducedMotion]);

  useEffect(() => {
    if (!blooming || reducedMotion || globalMuted || rose.soundEnabled === false) return;
    let audio: AudioContext | undefined;
    try {
      audio = new AudioContext();
      const gain = audio.createGain();
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.018, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 2.2);
      [261.63, 329.63, 392].forEach((frequency, index) => {
        const oscillator = audio!.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(audio!.currentTime + index * 0.12);
        oscillator.stop(audio!.currentTime + 2.2);
      });
      const closeTimer = setTimeout(() => void audio?.close(), 2600);
      return () => {
        clearTimeout(closeTimer);
        if (audio && audio.state !== "closed") void audio.close();
      };
    } catch {
      return undefined;
    }
  }, [blooming, globalMuted, reducedMotion, rose.soundEnabled]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const classes = [
    "rose-bloom-root",
    overlay ? "" : "is-live",
    stemGrown ? "is-stem" : "",
    blooming ? "is-blooming" : "",
    rotating ? "is-rotating" : "",
    reducedMotion ? "is-static" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label="A blooming rose">
      <style>{ROSE_CSS}</style>
      <div className="rb-vignette" aria-hidden="true" />
      <div className="rb-spotlight" aria-hidden="true" />
      <div className={`rb-ambient ${blooming ? "is-on" : ""}`} aria-hidden="true" />

      {overlay && (
        <button type="button" className="rb-overlay" onClick={begin} aria-label="Begin the bloom">
          <span className="rb-card">
            <span className="rb-card-glow" aria-hidden="true" />
            <span className="rb-icon" aria-hidden="true">🌹</span>
            <span className="rb-card-kicker">For you</span>
            <strong>Let it bloom slowly.</strong>
            <em>Some things are more beautiful when they take their time.</em>
            <span className="rb-card-cta">Tap to bloom</span>
          </span>
        </button>
      )}

      <div className="rb-layout">
        <div className="rb-stage">
          <div className="rb-scaler">
            <div className={`rb-scene ${rotating ? "is-turning" : ""}`}>
              <div className="rb-wrapper">
                <div className="rb-stem-group" data-rose-stem>
                  <div className={`rb-stem ${stemGrown ? "is-grown" : ""}`}>
                    <span className="rb-stem-shine" />
                  </div>
                  <span className={`rb-thorn rb-thorn-a ${stemGrown ? "is-on" : ""}`} />
                  <span className={`rb-thorn rb-thorn-b ${stemGrown ? "is-on" : ""}`} />
                  <div className={`rb-leaf rb-leaf-left ${leafLeft ? "is-on" : ""}`}>
                    <span className="rb-vein" />
                  </div>
                  <div className={`rb-leaf rb-leaf-right ${leafRight ? "is-on" : ""}`}>
                    <span className="rb-vein" />
                  </div>
                </div>

                <div className={`rb-calyx ${blooming ? "is-on" : ""}`} aria-hidden="true">
                  {SEPALS.map((sepal, index) => (
                    <span
                      key={index}
                      className="rb-sepal"
                      style={{
                        ["--sepal-angle" as string]: `${sepal.angle}deg`,
                        ["--sepal-curl" as string]: `${sepal.curl}deg`,
                        ["--sepal-delay" as string]: `${sepal.delay}s`,
                      }}
                    />
                  ))}
                </div>

                <div className={`rb-head ${blooming ? "is-on" : ""}`} data-rose-head>
                  <span className="rb-glow" />
                  <span className="rb-glow-inner" />
                  {petals.map((petal) => (
                    <span
                      key={petal.id}
                      className={`rb-petal rb-petal-${petal.tone}`}
                      style={{
                        width: petal.width,
                        height: petal.height,
                        ["--angle" as string]: `${petal.angle}deg`,
                        ["--curl" as string]: `${petal.curl}deg`,
                        ["--scale" as string]: String(petal.scale),
                        ["--delay" as string]: `${petal.delay}s`,
                        ["--tz" as string]: `${petal.tz}px`,
                        ["--bloom-dur" as string]: `${petal.duration}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`rb-copy ${showText ? "is-on" : ""}`} aria-live="polite">
          <p>{roseText}</p>
        </div>

        <div className={`rb-next ${showNext ? "is-on" : ""}`}>
          <button type="button" onClick={onNext} tabIndex={showNext ? 0 : -1}>
            Continue <span aria-hidden="true">✦</span>
          </button>
        </div>
      </div>

      {rose.fallingPetals !== false && (
        <div className="rb-fall" aria-hidden="true">
          {falling.map((petal) => (
            <span
              key={petal.id}
              className="rb-fall-petal"
              style={{
                left: `${petal.left}vw`,
                top: `${petal.top}vh`,
                width: petal.w,
                height: petal.h,
                ["--fp-c1" as string]: petal.c1,
                ["--fp-c2" as string]: petal.c2,
                ["--f-dur" as string]: `${petal.dur}s`,
                ["--f-delay" as string]: `${petal.delay}s`,
                ["--s1" as string]: `${petal.s1}px`,
                ["--s2" as string]: `${petal.s2}px`,
                ["--s3" as string]: `${petal.s3}px`,
                ["--s4" as string]: `${petal.s4}px`,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const ROSE_CSS = `
  .rose-bloom-root {
    --rb-ink: rgba(255, 195, 215, 0.95);
    position: relative;
    isolation: isolate;
    min-height: 100dvh;
    overflow: hidden;
    color: var(--rb-ink);
    background:
      radial-gradient(ellipse at 50% 75%, #120105 0%, #050002 55%, #000 100%);
  }
  .rb-vignette, .rb-spotlight, .rb-ambient {
    position: absolute;
    pointer-events: none;
  }
  .rb-vignette {
    inset: 0;
    z-index: 8;
    background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,.9) 100%);
  }
  .rb-spotlight {
    top: 32%;
    left: 50%;
    z-index: 1;
    width: 85vw;
    height: 70vh;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(255,30,80,.06) 0%, transparent 70%);
    filter: blur(50px);
  }
  .rb-ambient {
    width: min(500px, 90vw);
    height: min(500px, 70vh);
    top: 34%;
    left: 50%;
    z-index: 5;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(255,30,60,.1) 0%, rgba(255,20,50,.04) 40%, transparent 65%);
    opacity: 0;
    transition: opacity 3s ease;
  }
  .rb-ambient.is-on { opacity: 1; }
  .rb-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    border: 0;
    cursor: pointer;
    background: rgba(0,0,0,.82);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: inherit;
    animation: rb-overlay-in .6s ease both;
  }
  .is-live .rb-overlay { display: none; }
  .rb-card {
    position: relative;
    width: min(85vw, 340px);
    padding: 34px 24px 28px;
    border-radius: 24px;
    border: 1px solid rgba(255,40,100,.2);
    background: rgba(22,10,15,.55);
    box-shadow: 0 25px 60px rgba(0,0,0,.6), 0 0 40px rgba(255,30,80,.1);
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 8px;
  }
  .rb-card-glow {
    position: absolute;
    width: 150px;
    height: 150px;
    top: -40px;
    left: -40px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,30,80,.15), transparent 70%);
    filter: blur(15px);
  }
  .rb-icon { font-size: 52px; filter: drop-shadow(0 4px 12px rgba(255,30,80,.4)); }
  .rb-card-kicker {
    color: rgba(255,195,215,.62);
    font: 600 .62rem/1 Inter, system-ui, sans-serif;
    letter-spacing: .22em;
    text-transform: uppercase;
  }
  .rb-card strong {
    font: 700 1.55rem/1.15 "Playfair Display", Georgia, serif;
    color: #fff;
  }
  .rb-card em {
    font: 400 .82rem/1.55 Inter, system-ui, sans-serif;
    color: #b5a2b0;
    font-style: normal;
    max-width: 28ch;
  }
  .rb-card-cta {
    margin-top: 12px;
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    background: linear-gradient(135deg, #ff2e5e, #ff0044);
    color: #fff;
    font: 700 .78rem/1 Inter, system-ui, sans-serif;
    letter-spacing: .14em;
    text-transform: uppercase;
    box-shadow: 0 5px 20px rgba(255,0,68,.3);
  }
  .rb-layout {
    position: relative;
    z-index: 20;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: calc(52px + env(safe-area-inset-top, 0px)) 16px calc(22px + env(safe-area-inset-bottom, 0px));
    gap: 8px;
  }
  .rb-stage {
    flex: 1 1 auto;
    width: 100%;
    display: grid;
    place-items: center;
    min-height: 0;
  }
  .rb-scaler {
    width: 300px;
    height: 480px;
    transform: scale(min(1, 86vw / 300px, 56dvh / 480px));
    transform-origin: center center;
  }
  .rb-scene {
    width: 300px;
    height: 480px;
    perspective: 1200px;
    perspective-origin: 50% 35%;
    display: grid;
    place-items: center;
  }
  .rb-wrapper {
    position: relative;
    width: 300px;
    height: 480px;
    transform: rotateX(-22deg);
    transform-style: preserve-3d;
    will-change: transform;
  }
  .rb-scene.is-turning .rb-wrapper {
    animation: rb-spin 28s linear infinite;
  }
  .rb-stem-group {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 10px;
    height: 250px;
    transform: translateX(-50%);
    transform-style: preserve-3d;
  }
  .rb-stem {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 0;
    overflow: hidden;
    border-radius: 5px;
    background: linear-gradient(to top, #092e12 0%, #114c23 30%, #1a6f35 70%, #114c23 100%);
    transition: height 2.2s cubic-bezier(.22, 1, .36, 1);
  }
  .rb-stem.is-grown, .is-static .rb-stem { height: 100%; }
  .rb-stem-shine {
    position: absolute;
    top: 0;
    left: 1px;
    width: 2.5px;
    height: 100%;
    background: linear-gradient(to bottom, transparent, rgba(150,255,180,.15), transparent);
  }
  .rb-thorn {
    position: absolute;
    width: 11px;
    height: 6px;
    opacity: 0;
    z-index: 2;
    transition: opacity .5s ease .4s;
  }
  .rb-thorn::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #1a6f35, #092e12);
    clip-path: polygon(0% 85%, 100% 50%, 30% 0%);
  }
  .rb-thorn-a { right: -9px; bottom: 65%; transform: scaleX(-1); }
  .rb-thorn-b { left: -9px; bottom: 42%; }
  .rb-thorn.is-on, .is-static .rb-thorn { opacity: .75; }
  .rb-leaf {
    position: absolute;
    width: 52px;
    height: 25px;
    opacity: 0;
    z-index: 2;
    will-change: transform, opacity;
    transition: opacity .6s ease, transform 1.1s cubic-bezier(.34, 1.45, .64, 1);
  }
  .rb-leaf::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(160deg, #2a944e 0%, #1a6f35 40%, #092e12 100%);
  }
  .rb-vein {
    position: absolute;
    width: 60%;
    height: 1px;
    top: 48%;
    left: 20%;
    z-index: 1;
    background: rgba(150,255,180,.12);
  }
  .rb-leaf-left {
    left: -52px;
    bottom: 56%;
    transform-origin: right center;
    transform: rotate(35deg) scale(0);
  }
  .rb-leaf-left::before { border-radius: 65% 2px 65% 2px; }
  .rb-leaf-right {
    left: 10px;
    bottom: 38%;
    transform-origin: left center;
    transform: rotate(-35deg) scale(0);
  }
  .rb-leaf-right::before { border-radius: 2px 65% 2px 65%; }
  .rb-leaf-left.is-on { opacity: 1; transform: rotate(15deg) scale(1); }
  .rb-leaf-right.is-on { opacity: 1; transform: rotate(-15deg) scale(1); }
  .is-static .rb-leaf-left { opacity: 1; transform: rotate(15deg) scale(1); }
  .is-static .rb-leaf-right { opacity: 1; transform: rotate(-15deg) scale(1); }
  .rb-calyx {
    position: absolute;
    bottom: 242px;
    left: 50%;
    width: 0;
    height: 0;
    transform: translateX(-50%);
    transform-style: preserve-3d;
    z-index: 1;
  }
  .rb-sepal {
    position: absolute;
    bottom: -4px;
    left: 50%;
    width: 14px;
    height: 32px;
    transform-origin: 50% 100%;
    background: linear-gradient(to top, #092e12 0%, #15582b 40%, #299c4c 100%);
    border-radius: 50% 50% 10% 10% / 80% 80% 20% 20%;
    clip-path: polygon(10% 100%, 0% 30%, 50% 0%, 100% 30%, 90% 100%);
    opacity: 0;
    transform: translateX(-50%) rotateY(var(--sepal-angle, 0deg)) rotateX(60deg) scale(.5);
    transition: transform 1.3s cubic-bezier(.25,1,.5,1) var(--sepal-delay, 0s),
                opacity .5s ease var(--sepal-delay, 0s);
  }
  .rb-calyx.is-on .rb-sepal,
  .is-static .rb-sepal {
    opacity: .95;
    transform: translateX(-50%) rotateY(var(--sepal-angle, 0deg)) rotateX(var(--sepal-curl, 22deg)) scale(1);
  }
  .rb-head {
    position: absolute;
    bottom: 245px;
    left: 50%;
    width: 24px;
    height: 24px;
    margin-left: -12px;
    transform-style: preserve-3d;
    z-index: 10;
  }
  .rb-glow, .rb-glow-inner {
    position: absolute;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    z-index: -1;
    pointer-events: none;
  }
  .rb-glow {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(160,5,30,.18) 0%, rgba(100,0,20,.05) 45%, transparent 65%);
    transition: opacity 3.5s ease;
  }
  .rb-glow-inner {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(180,40,60,.15) 0%, transparent 65%);
    transition: opacity 2s ease .8s;
  }
  .rb-head.is-on .rb-glow,
  .rb-head.is-on .rb-glow-inner,
  .is-static .rb-glow,
  .is-static .rb-glow-inner { opacity: 1; }
  .rb-petal {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform-origin: 50% 100%;
    opacity: .002;
    will-change: transform, opacity;
    border-radius: 50% 50% 35% 35% / 45% 45% 55% 55%;
    transform: translateX(-50%) rotateY(var(--angle, 0deg)) translateZ(0px) rotateX(90deg) scale(.1);
    transition: transform var(--bloom-dur, 2.4s) ease-in-out var(--delay, 0s),
                opacity .7s ease var(--delay, 0s);
  }
  .rb-head.is-on .rb-petal,
  .is-static .rb-petal {
    opacity: 1;
    transform: translateX(-50%) rotateY(var(--angle, 0deg)) translateZ(var(--tz, 0px)) rotateX(var(--curl, 30deg)) scale(var(--scale, 1));
  }
  .rb-petal-bud { background: linear-gradient(to bottom, #3d0008 0%, #220003 40%, #100001 75%, #040000 100%); }
  .rb-petal-core { background: linear-gradient(to bottom, #52000c 0%, #350005 40%, #1a0002 75%, #080000 100%); }
  .rb-petal-inner { background: linear-gradient(to bottom, #6d0012 0%, #480008 40%, #250003 75%, #0c0000 100%); }
  .rb-petal-midInner { background: linear-gradient(to bottom, #850018 0%, #5c000d 40%, #310004 75%, #120000 100%); }
  .rb-petal-mid { background: linear-gradient(to bottom, #9a001d 0%, #6e0011 40%, #3b0005 75%, #160000 100%); }
  .rb-petal-outer { background: linear-gradient(to bottom, #ad0022 0%, #7e0014 40%, #440007 75%, #1a0001 100%); }
  .rb-petal-blush { background: linear-gradient(to bottom, #bf0028 0%, #8e0018 40%, #4e0008 75%, #1e0001 100%); }
  .rb-copy {
    position: relative;
    z-index: 30;
    max-width: min(390px, 90vw);
    min-height: 2.4em;
    text-align: center;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 2s ease, transform 1.2s ease;
  }
  .rb-copy.is-on { opacity: 1; transform: none; }
  .rb-copy p {
    margin: 0;
    font: italic clamp(18px, 5vw, 28px)/1.35 "Playfair Display", Georgia, serif;
    letter-spacing: .12em;
    text-transform: lowercase;
    text-shadow: 0 0 25px rgba(255,80,130,.4), 0 0 60px rgba(255,50,100,.15);
  }
  .rb-next {
    position: relative;
    z-index: 30;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity .7s ease, transform .7s ease;
    min-height: 48px;
  }
  .rb-next.is-on { opacity: 1; transform: none; }
  .rb-next button {
    min-height: 46px;
    padding: 12px 22px;
    border-radius: 999px;
    border: 1px solid rgba(255,195,215,.28);
    background: rgba(90, 8, 28, .42);
    color: #ffeef2;
    font: 600 .78rem/1 Inter, system-ui, sans-serif;
    letter-spacing: .08em;
    cursor: pointer;
    backdrop-filter: blur(10px);
  }
  .rb-fall { position: absolute; inset: 0; pointer-events: none; z-index: 25; overflow: hidden; }
  .rb-fall-petal {
    position: absolute;
    border-radius: 50% 50% 45% 55% / 60% 60% 40% 40%;
    background: radial-gradient(ellipse at 40% 30%, var(--fp-c1, #9a001d), var(--fp-c2, #3d0008) 75%);
    opacity: 0;
    animation: rb-fall var(--f-dur, 7s) linear var(--f-delay, 0s) forwards;
  }
  @keyframes rb-spin {
    from { transform: rotateX(-22deg) rotateY(0deg); }
    to { transform: rotateX(-22deg) rotateY(360deg); }
  }
  @keyframes rb-fall {
    0% { opacity: 0; transform: translateX(0) translateY(0) rotate(0deg) rotateY(0deg) scale(1); }
    8% { opacity: .85; }
    25% { transform: translateX(var(--s1, 35px)) translateY(20vh) rotate(70deg) rotateY(40deg) scale(.95); }
    50% { transform: translateX(var(--s2, -25px)) translateY(48vh) rotate(160deg) rotateY(90deg) scale(.88); }
    75% { transform: translateX(var(--s3, 35px)) translateY(75vh) rotate(270deg) rotateY(150deg) scale(.78); opacity: .55; }
    100% { opacity: 0; transform: translateX(var(--s4, 10px)) translateY(108vh) rotate(390deg) rotateY(210deg) scale(.55); }
  }
  @keyframes rb-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (max-height: 700px) {
    .rb-scaler { transform: scale(min(1, 86vw / 300px, 50dvh / 480px)); }
    .rb-copy p { letter-spacing: .06em; }
  }
`;
