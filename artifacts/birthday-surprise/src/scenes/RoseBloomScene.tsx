/**
 * RoseBloomScene
 *
 * A single responsive flower composition:
 * bloom -> calyx -> stem -> leaves.
 *
 * The previous implementation rendered the stem before the flower head and
 * used a dynamically-mutated petal tree with viewport-fixed text. That made
 * the flower read as disconnected parts on small screens. This version keeps
 * the visual relationship in the DOM and lets CSS stage each layer cleanly.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";

type PetalLayer = {
  count: number;
  width: number;
  height: number;
  radius: number;
  depth: number;
  tone: "inner" | "mid" | "outer";
  delay: number;
};

const PETAL_LAYERS: PetalLayer[] = [
  { count: 5, width: 34, height: 58, radius: 9, depth: 34, tone: "inner", delay: 0.05 },
  { count: 7, width: 50, height: 82, radius: 17, depth: 26, tone: "mid", delay: 0.35 },
  { count: 9, width: 68, height: 104, radius: 24, depth: 18, tone: "mid", delay: 0.7 },
  { count: 11, width: 84, height: 118, radius: 30, depth: 8, tone: "outer", delay: 1.05 },
];

const FALLING_PETALS = Array.from({ length: 12 }, (_, index) => ({
  left: `${8 + ((index * 17) % 84)}%`,
  delay: `${(index * 0.72) % 5.5}s`,
  duration: `${7.5 + (index % 4) * 1.2}s`,
  size: `${8 + (index % 4) * 2}px`,
  height: `${(8 + (index % 4) * 2) * 1.35}px`,
  drift: `${index % 2 === 0 ? 1 : -1}`,
}));

const cssVar = (name: string, value: string | number): CSSProperties =>
  ({ [name]: typeof value === "number" ? String(value) : value }) as CSSProperties;

export default function RoseBloomScene({
  onNext,
  isActive,
  reducedMotion,
  globalMuted,
}: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const [started, setStarted] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const rose = normalized.roseBloom;
  const roseText = rose.text?.trim() || "Made with love, just for you.";
  const speedMultiplier = rose.speed === "slow" ? 1.25 : rose.speed === "fast" ? 0.78 : 1;
  const intensity = rose.intensity ?? "normal";
  const layers = intensity === "subtle" ? PETAL_LAYERS.slice(0, 3) : PETAL_LAYERS;

  const petals = useMemo(() => {
    let serial = 0;
    return layers.flatMap((layer) =>
      Array.from({ length: layer.count }, (_, index) => {
        const angle = (360 / layer.count) * index + (serial % 2 === 0 ? -4 : 4);
        const item = {
          id: serial++,
          angle,
          width: layer.width,
          height: layer.height,
          radius: layer.radius,
          depth: layer.depth,
          tone: layer.tone,
          delay: layer.delay + index * 0.045,
        };
        return item;
      }),
    );
  }, [layers]);

  useEffect(() => {
    if (!reducedMotion || !isActive) return;
    setStarted(true);
    setShowText(true);
    setShowNext(true);
  }, [isActive, reducedMotion]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay * speedMultiplier);
    timersRef.current.push(timer);
  };

  const startBloom = () => {
    if (started || !isActive) return;
    setStarted(true);
    later(() => setShowText(true), 5200);
    later(() => setShowNext(true), 6500);
  };

  useEffect(() => {
    if (!started || reducedMotion || globalMuted || rose.soundEnabled === false) return;
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
      // Audio is an enhancement. The visual reveal remains fully functional.
      return undefined;
    }
  }, [globalMuted, reducedMotion, rose.soundEnabled, started]);

  if (reducedMotion) {
    return (
      <RoseShell>
        <RoseComposition petals={petals} started reducedMotion />
        <RoseCopy text={roseText} visible />
        <RoseButton onClick={onNext} visible />
      </RoseShell>
    );
  }

  return (
    <RoseShell>
      <div className={`rose-bloom-scene ${started ? "is-started" : ""}`}>
        <div className="rose-scene-kicker">A quiet little moment</div>
        <div className="rose-stage">
          <div className="rose-atmosphere" aria-hidden="true" />
          <RoseComposition petals={petals} started={started} />
          {rose.fallingPetals !== false && started && (
            <div className="rose-falling-petals" aria-hidden="true">
              {FALLING_PETALS.map((petal, index) => (
                <span
                  key={index}
                  className="rose-falling-petal"
                  style={{
                    left: petal.left,
                    animationDelay: petal.delay,
                    animationDuration: petal.duration,
                    width: petal.size,
                    height: petal.height,
                    ...cssVar("--petal-drift", petal.drift),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {!started && (
          <div className="rose-start-card">
            <span className="rose-start-mark" aria-hidden="true">✦</span>
            <p className="rose-start-eyebrow">For you</p>
            <h1>Let it bloom slowly.</h1>
            <p>Some things are more beautiful when they take their time.</p>
            <button type="button" onClick={startBloom}>
              Begin the bloom
              <span aria-hidden="true"> →</span>
            </button>
          </div>
        )}

        <RoseCopy text={roseText} visible={showText} />
        <RoseButton onClick={onNext} visible={showNext} />
      </div>
    </RoseShell>
  );
}

function RoseShell({ children }: { children: ReactNode }) {
  return (
    <section className="rose-shell">
      <style>{`
        .rose-shell {
          --rose-ink: #f8e9ec;
          --rose-muted: rgba(248, 233, 236, 0.66);
          --rose-line: rgba(236, 174, 192, 0.22);
          --rose-red: #b51f45;
          --rose-deep: #4c071b;
          --rose-pink: #f58aa7;
          min-height: 100dvh;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: calc(38px + env(safe-area-inset-top, 0px)) 20px calc(30px + env(safe-area-inset-bottom, 0px));
          color: var(--rose-ink);
          background:
            radial-gradient(circle at 50% 39%, rgba(146, 18, 55, 0.18), transparent 25%),
            radial-gradient(circle at 50% 80%, rgba(103, 18, 47, 0.24), transparent 35%),
            linear-gradient(180deg, #09030b 0%, #15030b 52%, #060207 100%);
        }
        .rose-shell::before,
        .rose-shell::after {
          content: "";
          position: absolute;
          pointer-events: none;
          inset: 0;
          z-index: -1;
        }
        .rose-shell::before {
          opacity: 0.5;
          background-image:
            radial-gradient(circle at 18% 22%, rgba(255,255,255,.72) 0 1px, transparent 1.5px),
            radial-gradient(circle at 82% 28%, rgba(251,177,196,.62) 0 1px, transparent 1.5px),
            radial-gradient(circle at 74% 78%, rgba(255,255,255,.45) 0 1px, transparent 1.5px);
          background-size: 240px 220px, 310px 280px, 190px 260px;
        }
        .rose-shell::after {
          background: radial-gradient(ellipse at center, transparent 32%, rgba(0,0,0,.72) 100%);
        }
        .rose-bloom-scene {
          width: min(100%, 540px);
          min-height: min(760px, calc(100dvh - 22px));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          text-align: center;
        }
        .rose-scene-kicker {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(248,233,236,.42);
          font: 500 .64rem/1.2 Inter, system-ui, sans-serif;
          letter-spacing: .24em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .rose-stage {
          width: min(100%, 440px);
          height: clamp(370px, 58dvh, 510px);
          position: relative;
          display: grid;
          place-items: center;
        }
        .rose-atmosphere {
          position: absolute;
          width: min(72vw, 340px);
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(205,33,78,.2), transparent 68%);
          filter: blur(24px);
          opacity: 0;
          transition: opacity 2s ease;
        }
        .is-started .rose-atmosphere { opacity: 1; }
        .rose-composition {
          --rose-ease: cubic-bezier(.16,1,.3,1);
          position: relative;
          width: clamp(190px, 58vw, 270px);
          height: clamp(330px, 52dvh, 420px);
          display: flex;
          align-items: center;
          flex-direction: column;
          z-index: 2;
          transform: translateY(10px);
        }
        .rose-bloom {
          position: relative;
          width: clamp(156px, 46vw, 224px);
          aspect-ratio: 1;
          z-index: 4;
          filter: drop-shadow(0 22px 24px rgba(53,0,14,.5));
        }
        .rose-petal {
          position: absolute;
          left: 50%;
          top: 53%;
          width: var(--petal-width);
          height: var(--petal-height);
          transform-origin: 50% 100%;
          transform: translate(-50%, -100%) rotate(var(--petal-angle)) translateY(calc(var(--petal-radius) * -1)) rotateX(54deg) scale(.08);
          opacity: 0;
          border-radius: 50% 50% 39% 39%;
          border: 1px solid rgba(255,218,226,.16);
          box-shadow: inset 8px 9px 18px rgba(255,205,219,.16), inset -10px -16px 20px rgba(50,0,12,.3), 0 4px 14px rgba(63,0,16,.25);
          animation: none;
          z-index: var(--petal-depth);
        }
        .rose-composition.is-blooming .rose-petal {
          animation: rose-petal-open 1.9s var(--rose-ease) var(--petal-delay) forwards;
        }
        .rose-petal--inner { background: radial-gradient(ellipse at 28% 19%, #ffd3df 0%, #ec7394 31%, #8c0f32 82%); }
        .rose-petal--mid { background: radial-gradient(ellipse at 26% 16%, #ffc1d1 0%, #d8446c 34%, #710a28 84%); }
        .rose-petal--outer { background: radial-gradient(ellipse at 24% 15%, #f6a3b7 0%, #bb234d 34%, #4b061b 84%); }
        .rose-petal:nth-child(3n) { animation-duration: 2.15s; }
        .rose-petal:nth-child(4n) { filter: brightness(.88); }
        .rose-bud-core {
          position: absolute;
          z-index: 40;
          left: 50%;
          top: 51%;
          width: 30%;
          aspect-ratio: .78;
          transform: translate(-50%, -50%) scale(.35);
          opacity: 0;
          border-radius: 52% 52% 42% 42%;
          background: linear-gradient(135deg, #ffd8e3, #d7476d 42%, #650923 90%);
          box-shadow: 0 0 22px rgba(255,103,144,.38), inset -8px -10px 12px rgba(50,0,12,.3);
          opacity: .74;
        }
        .rose-composition.is-blooming .rose-bud-core {
          animation: rose-core-open 1.5s ease .25s forwards;
        }
        .rose-bud-core::after {
          content: "";
          position: absolute;
          top: 10%;
          left: 28%;
          width: 26%;
          height: 40%;
          border-radius: 50%;
          background: rgba(255,244,247,.58);
          filter: blur(2px);
        }
        .rose-calyx {
          position: relative;
          width: clamp(54px, 15vw, 72px);
          height: 34px;
          margin-top: -19px;
          z-index: 6;
        }
        .rose-sepal {
          position: absolute;
          left: 50%;
          top: 0;
          width: 18px;
          height: 42px;
          transform-origin: 50% 100%;
          transform: translateX(-50%) rotate(var(--sepal-angle)) scaleY(.15);
          opacity: 0;
          border-radius: 50% 50% 18% 18%;
          background: linear-gradient(160deg, #98b46d, #355a2f 58%, #162d1c);
          animation: none;
        }
        .rose-composition.is-blooming .rose-sepal {
          animation: rose-sepal-open .8s ease var(--sepal-delay) forwards;
        }
        .rose-stem {
          position: relative;
          width: 13px;
          height: clamp(190px, 31dvh, 250px);
          margin-top: -4px;
          transform-origin: 50% 0;
          transform: scaleY(0);
          border-radius: 999px;
          background: linear-gradient(90deg, #162f1e, #699357 42%, #254c2b 68%, #102218);
          box-shadow: 5px 0 10px rgba(10,0,2,.25);
          transform: scaleY(.04);
        }
        .rose-composition.is-blooming .rose-stem {
          animation: rose-stem-grow 1.8s var(--rose-ease) .05s forwards;
        }
        .rose-stem::after {
          content: "";
          position: absolute;
          inset: 0 3px 0 4px;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(209,239,181,.4), transparent 40%);
        }
        .rose-leaf {
          position: absolute;
          width: clamp(60px, 17vw, 82px);
          height: clamp(27px, 7vw, 36px);
          top: 34%;
          opacity: 0;
          background: linear-gradient(145deg, #8eb26b 0%, #3d713d 46%, #162d1c 100%);
          box-shadow: inset -10px -6px 10px rgba(10,22,10,.28), 0 4px 8px rgba(8,0,2,.22);
          transform: rotate(var(--leaf-angle)) scale(0);
        }
        .rose-composition.is-blooming .rose-leaf {
          animation: rose-leaf-open .95s var(--rose-ease) 1.08s forwards;
        }
        .rose-leaf::after {
          content: "";
          position: absolute;
          width: 80%;
          height: 1px;
          top: 50%;
          left: 10%;
          background: rgba(219,238,186,.4);
          transform: rotate(-5deg);
        }
        .rose-leaf--left {
          right: 50%;
          transform-origin: 100% 50%;
          border-radius: 100% 0 100% 0;
        }
        .rose-leaf--right {
          left: 50%;
          top: 54%;
          transform-origin: 0 50%;
          border-radius: 0 100% 0 100%;
          animation-delay: 1.35s;
        }
        .rose-copy {
          max-width: min(390px, 90vw);
          min-height: 82px;
          margin: -2px auto 0;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 1.1s ease, transform 1.1s var(--rose-ease);
          position: relative;
          z-index: 5;
        }
        .rose-copy.is-visible { opacity: 1; transform: translateY(0); }
        .rose-copy p {
          margin: 0;
          color: var(--rose-ink);
          font: 500 clamp(1rem, 3.8vw, 1.25rem)/1.65 "Playfair Display", Georgia, serif;
          text-wrap: balance;
          text-shadow: 0 4px 24px rgba(196,31,76,.32);
        }
        .rose-copy span {
          display: block;
          margin-top: 10px;
          color: rgba(247,171,191,.74);
          font-size: .9rem;
        }
        .rose-button {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity .7s ease .15s, transform .7s var(--rose-ease) .15s;
          margin-top: 18px;
        }
        .rose-button.is-visible { opacity: 1; transform: translateY(0); }
        .rose-button button,
        .rose-start-card button {
          min-height: 46px;
          padding: 12px 23px;
          border: 1px solid rgba(242,157,181,.34);
          border-radius: 999px;
          color: #ffeef2;
          background: rgba(114, 13, 42, .42);
          box-shadow: 0 8px 24px rgba(28,0,11,.35), inset 0 0 20px rgba(246,115,151,.06);
          font: 600 .78rem/1 Inter, system-ui, sans-serif;
          letter-spacing: .06em;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: border-color .2s ease, background .2s ease, transform .2s ease;
        }
        .rose-button button:hover,
        .rose-start-card button:hover { border-color: rgba(255,190,207,.7); background: rgba(155,25,61,.5); transform: translateY(-2px); }
        .rose-start-card {
          position: absolute;
          left: 50%;
          bottom: 7%;
          transform: translateX(-50%);
          width: min(330px, calc(100vw - 42px));
          padding: 18px 22px 20px;
          border: 1px solid rgba(238,165,185,.18);
          border-radius: 22px;
          background: linear-gradient(145deg, rgba(43,9,22,.9), rgba(18,3,12,.82));
          box-shadow: 0 18px 60px rgba(0,0,0,.32);
          z-index: 10;
          animation: rose-card-in .8s var(--rose-ease) both;
        }
        .rose-start-mark {
          display: block;
          color: #f49bb4;
          font-size: 1.25rem;
          margin-bottom: 4px;
        }
        .rose-start-eyebrow {
          margin: 0 0 7px;
          color: rgba(249,181,199,.62);
          font: 600 .62rem/1 Inter, system-ui, sans-serif;
          letter-spacing: .2em;
          text-transform: uppercase;
        }
        .rose-start-card h1 {
          margin: 0;
          color: #fff3f6;
          font: 500 clamp(1.25rem, 5vw, 1.65rem)/1.2 "Playfair Display", Georgia, serif;
        }
        .rose-start-card > p:not(.rose-start-eyebrow) {
          margin: 8px 0 16px;
          color: var(--rose-muted);
          font: .78rem/1.55 Inter, system-ui, sans-serif;
        }
        .rose-start-card button { background: linear-gradient(135deg, rgba(165,28,68,.78), rgba(90,11,37,.78)); }
        .rose-falling-petals {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 7;
        }
        .rose-falling-petal {
          position: absolute;
          top: -22px;
          border-radius: 80% 10% 80% 10%;
          background: linear-gradient(135deg, #f7a4ba, #941436 72%);
          opacity: 0;
          filter: drop-shadow(0 3px 5px rgba(80,0,20,.4));
          animation: rose-fall var(--fall-duration, 8s) linear var(--fall-delay, 0s) infinite;
        }
        @keyframes rose-petal-open {
          0% { opacity: 0; transform: translate(-50%, -100%) rotate(var(--petal-angle)) translateY(calc(var(--petal-radius) * -.42)) rotateX(65deg) scale(.08); }
          58% { opacity: .94; }
          100% { opacity: 1; transform: translate(-50%, -100%) rotate(var(--petal-angle)) translateY(calc(var(--petal-radius) * -1)) rotateX(10deg) scale(1); }
        }
        @keyframes rose-core-open {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.3) rotate(-12deg); }
          70% { opacity: 1; transform: translate(-50%, -50%) scale(1.08) rotate(3deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0); }
        }
        @keyframes rose-sepal-open {
          0% { opacity: 0; transform: translateX(-50%) rotate(var(--sepal-angle)) scaleY(.15); }
          100% { opacity: 1; transform: translateX(-50%) rotate(var(--sepal-angle)) scaleY(1); }
        }
        @keyframes rose-stem-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes rose-leaf-open {
          0% { opacity: 0; transform: rotate(var(--leaf-angle)) scale(0); }
          65% { opacity: 1; transform: rotate(var(--leaf-angle)) scale(1.08); }
          100% { opacity: 1; transform: rotate(var(--leaf-angle)) scale(1); }
        }
        @keyframes rose-fall {
          0% { opacity: 0; transform: translate3d(0, -16px, 0) rotate(0); }
          10% { opacity: .75; }
          82% { opacity: .54; }
          100% { opacity: 0; transform: translate3d(calc(var(--petal-drift) * 60px), 560px, 0) rotate(330deg); }
        }
        @keyframes rose-card-in { from { opacity: 0; transform: translate(-50%, 18px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @media (max-height: 700px) {
          .rose-bloom-scene { min-height: calc(100dvh - 12px); }
          .rose-stage { height: 340px; }
          .rose-composition { height: 300px; }
          .rose-stem { height: 170px; }
          .rose-start-card { bottom: 2%; padding-block: 13px 15px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rose-shell * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
      {children}
    </section>
  );
}

function RoseComposition({
  petals,
  started,
  reducedMotion = false,
}: {
  petals: Array<{
    id: number;
    angle: number;
    width: number;
    height: number;
    radius: number;
    depth: number;
    tone: string;
    delay: number;
  }>;
  started: boolean;
  reducedMotion?: boolean;
}) {
  return (
    <div
      className={`rose-composition ${started ? "is-blooming" : "is-bud"} ${reducedMotion ? "is-static" : ""}`}
      aria-label="A blooming rose"
      role="img"
    >
      <div className="rose-bloom">
        {petals.map((petal) => (
          <span
            key={petal.id}
            className={`rose-petal rose-petal--${petal.tone}`}
            style={{
              ...cssVar("--petal-angle", `${petal.angle}deg`),
              ...cssVar("--petal-width", `${petal.width}px`),
              ...cssVar("--petal-height", `${petal.height}px`),
              ...cssVar("--petal-radius", `${petal.radius}px`),
              ...cssVar("--petal-depth", petal.depth),
              ...cssVar("--petal-delay", `${started ? petal.delay : 9999}s`),
              ...cssVar("--rose-ease", "cubic-bezier(.16,1,.3,1)"),
            }}
          />
        ))}
        <span className="rose-bud-core" />
      </div>
      <div className="rose-calyx" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            className="rose-sepal"
            key={index}
            style={{
              ...cssVar("--sepal-angle", `${index * 72 - 144}deg`),
              ...cssVar("--sepal-delay", `${0.22 + index * 0.07}s`),
            }}
          />
        ))}
      </div>
      <div className="rose-stem" aria-hidden="true">
        <span className="rose-leaf rose-leaf--left" style={cssVar("--leaf-angle", "-28deg")} />
        <span className="rose-leaf rose-leaf--right" style={cssVar("--leaf-angle", "28deg")} />
      </div>
    </div>
  );
}

function RoseCopy({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div className={`rose-copy ${visible ? "is-visible" : ""}`} aria-live="polite">
      <p>{text}</p>
      {visible && <span>Some feelings grow quietly.</span>}
    </div>
  );
}

function RoseButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <div className={`rose-button ${visible ? "is-visible" : ""}`}>
      <button type="button" onClick={onClick} tabIndex={visible ? 0 : -1}>
        Continue <span aria-hidden="true">✦</span>
      </button>
    </div>
  );
}