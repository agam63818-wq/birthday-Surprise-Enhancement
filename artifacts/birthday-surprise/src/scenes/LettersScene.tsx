import { useMemo, useState } from "react";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import type { SceneComponentProps } from "@/lib/v2/registry";

/**
 * Letters are intentionally one focused interaction rather than a list of
 * expandable cards. A sealed envelope gives the scene a clear beginning,
 * action, reveal, and close/reopen state.
 */
export default function LettersScene({ onNext }: SceneComponentProps) {
  const { raw, recipient } = useNormalizedConfig();
  const letters = useMemo(
    () =>
      raw.lastNote.lines.length
        ? raw.lastNote.lines
        : [raw.celebration.message || "Some words are better kept close."],
    [raw.celebration.message, raw.lastNote.lines],
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const activeIndex = openIndex ?? 0;
  const isOpen = openIndex !== null;

  return (
    <section className="letters-scene">
      <style>{`
        .letters-scene {
          --letter-ink: #f7ece7;
          --letter-muted: rgba(247,236,231,.66);
          --letter-gold: #e6bb7b;
          --letter-blush: #d88d9e;
          min-height: 100dvh;
          box-sizing: border-box;
          display: grid;
          align-content: center;
          gap: clamp(22px, 4vw, 34px);
          padding: clamp(72px, 11vh, 110px) clamp(18px, 5vw, 56px) 42px;
          color: var(--letter-ink);
          background:
            radial-gradient(circle at 50% 38%, rgba(147,36,62,.2), transparent 28%),
            linear-gradient(160deg, #10070b, #1d0913 54%, #090308);
          overflow: hidden;
        }
        .letters-scene::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .34;
          background-image: radial-gradient(rgba(255,255,255,.6) 0 1px, transparent 1.5px);
          background-size: 180px 220px;
          mask-image: linear-gradient(180deg, black, transparent 82%);
        }
        .letters-heading,
        .letters-layout {
          width: min(100%, 920px);
          margin-inline: auto;
          position: relative;
          z-index: 1;
        }
        .letters-heading { text-align: center; }
        .letters-eyebrow {
          margin: 0 0 9px;
          color: var(--letter-gold);
          font: 600 .65rem/1.2 Inter, system-ui, sans-serif;
          letter-spacing: .24em;
          text-transform: uppercase;
        }
        .letters-heading h1 {
          margin: 0;
          color: #fff5f0;
          font: 500 clamp(2rem, 6vw, 3.7rem)/1.04 "Playfair Display", Georgia, serif;
        }
        .letters-heading p:last-child {
          max-width: 430px;
          margin: 13px auto 0;
          color: var(--letter-muted);
          font: .86rem/1.6 Inter, system-ui, sans-serif;
        }
        .letters-layout {
          display: grid;
          grid-template-columns: minmax(145px, 190px) minmax(0, 1fr);
          align-items: center;
          gap: clamp(24px, 5vw, 68px);
        }
        .letters-index {
          display: grid;
          gap: 8px;
          align-content: center;
        }
        .letters-index-label {
          margin: 0 0 3px;
          color: rgba(230,187,123,.65);
          font: 600 .63rem/1.2 Inter, system-ui, sans-serif;
          letter-spacing: .17em;
          text-transform: uppercase;
        }
        .letter-tab {
          width: 100%;
          min-height: 48px;
          padding: 10px 12px;
          border: 1px solid rgba(230,187,123,.14);
          border-radius: 10px;
          color: var(--letter-muted);
          background: rgba(255,255,255,.035);
          cursor: pointer;
          text-align: left;
          font: 600 .74rem/1.2 Inter, system-ui, sans-serif;
          transition: border-color .25s ease, color .25s ease, background .25s ease, transform .25s ease;
        }
        .letter-tab:hover,
        .letter-tab[aria-selected="true"] {
          border-color: rgba(230,187,123,.55);
          color: #fff5e6;
          background: rgba(129,35,56,.3);
          transform: translateX(4px);
        }
        .letter-tab span {
          display: block;
          margin-bottom: 4px;
          color: var(--letter-gold);
          font-size: .62rem;
          letter-spacing: .13em;
        }
        .letter-stage {
          min-height: 365px;
          display: grid;
          place-items: center;
          position: relative;
        }
        .envelope-button {
          position: relative;
          width: min(100%, 440px);
          aspect-ratio: 1.55;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          perspective: 1000px;
          filter: drop-shadow(0 25px 30px rgba(0,0,0,.33));
        }
        .envelope-back,
        .envelope-front {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: 8px 8px 12px 12px;
          background: linear-gradient(145deg, #762a42, #401126 62%, #260814);
        }
        .envelope-back {
          border: 1px solid rgba(246,190,173,.28);
          box-shadow: inset 0 0 0 1px rgba(40,0,13,.25);
        }
        .envelope-back::after {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(245,203,174,.17);
          border-radius: 4px;
          pointer-events: none;
        }
        .envelope-front {
          z-index: 3;
          clip-path: polygon(0 42%, 50% 76%, 100% 42%, 100% 100%, 0 100%);
          background: linear-gradient(155deg, #8c3450, #58152f 68%, #341020);
        }
        .envelope-front::before,
        .envelope-front::after {
          content: "";
          position: absolute;
          width: 75%;
          height: 1px;
          top: 73%;
          background: rgba(255,213,193,.2);
        }
        .envelope-front::before { left: -14%; transform: rotate(32deg); }
        .envelope-front::after { right: -14%; transform: rotate(-32deg); }
        .envelope-flap {
          position: absolute;
          inset: 0 0 auto;
          z-index: 5;
          height: 58%;
          transform-origin: 50% 0;
          clip-path: polygon(0 0, 100% 0, 50% 100%);
          background: linear-gradient(145deg, #a34b63, #60152f 78%);
          border-top: 1px solid rgba(255,222,207,.2);
          transition: transform 1s cubic-bezier(.16,1,.3,1), filter 1s ease;
          backface-visibility: hidden;
        }
        .envelope-flap::after {
          content: "";
          position: absolute;
          inset: 9px 9px auto;
          height: 1px;
          background: rgba(255,224,207,.25);
        }
        .letter-paper {
          position: absolute;
          z-index: 2;
          left: 8%;
          right: 8%;
          top: 8%;
          height: 82%;
          padding: clamp(21px, 4vw, 32px) clamp(18px, 4vw, 34px);
          box-sizing: border-box;
          overflow: auto;
          color: #4e2029;
          background:
            linear-gradient(rgba(112,57,52,.1) 1px, transparent 1px) 0 0 / 100% 28px,
            #f7e4cf;
          border-radius: 3px;
          text-align: left;
          transform: translateY(15%) scale(.93);
          opacity: .2;
          transition: transform 1s cubic-bezier(.16,1,.3,1), opacity .7s ease .15s;
        }
        .letter-paper p {
          margin: 0;
          white-space: pre-wrap;
          font: 500 clamp(.92rem, 2vw, 1.1rem)/1.75 "Playfair Display", Georgia, serif;
        }
        .letter-paper small {
          display: block;
          margin-bottom: 13px;
          color: #a66a63;
          font: 600 .6rem/1 Inter, system-ui, sans-serif;
          letter-spacing: .18em;
          text-transform: uppercase;
        }
        .letter-seal {
          position: absolute;
          z-index: 7;
          left: 50%;
          bottom: 15%;
          width: 48px;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #f7d8b8;
          background: radial-gradient(circle at 35% 30%, #cf6a75, #7e203b 68%, #451025);
          box-shadow: 0 4px 12px rgba(26,0,8,.4), inset 0 1px 2px rgba(255,220,207,.35);
          transform: translateX(-50%) scale(1);
          transition: transform .45s ease, opacity .45s ease;
          font-size: .95rem;
        }
        .envelope-button:hover .envelope-flap { filter: brightness(1.1); }
        .envelope-button.is-open .envelope-flap { transform: rotateX(180deg); }
        .envelope-button.is-open .letter-paper { transform: translateY(-27%) scale(1); opacity: 1; transition-delay: .32s; }
        .envelope-button.is-open .letter-seal { transform: translate(-50%, 30px) scale(.65); opacity: 0; }
        .envelope-hint {
          position: absolute;
          left: 50%;
          bottom: -34px;
          transform: translateX(-50%);
          white-space: nowrap;
          color: rgba(247,236,231,.58);
          font: .68rem/1 Inter, system-ui, sans-serif;
          letter-spacing: .11em;
          text-transform: uppercase;
          transition: opacity .3s ease;
        }
        .envelope-button.is-open .envelope-hint { opacity: 0; }
        .letter-close {
          position: absolute;
          right: 3%;
          bottom: 1%;
          min-height: 42px;
          padding: 8px 13px;
          border: 1px solid rgba(230,187,123,.28);
          border-radius: 999px;
          color: var(--letter-muted);
          background: rgba(29,5,15,.7);
          cursor: pointer;
          font: 600 .68rem/1 Inter, system-ui, sans-serif;
        }
        .letters-continue {
          position: relative;
          z-index: 1;
          justify-self: center;
          min-height: 46px;
          padding: 11px 22px;
          border: 1px solid rgba(230,187,123,.38);
          border-radius: 999px;
          color: #fff1e7;
          background: rgba(115,29,52,.42);
          cursor: pointer;
          font: 600 .75rem/1 Inter, system-ui, sans-serif;
          letter-spacing: .06em;
          transition: background .2s ease, transform .2s ease;
        }
        .letters-continue:hover { background: rgba(155,46,73,.56); transform: translateY(-2px); }
        @media (max-width: 650px) {
          .letters-scene { align-content: start; padding-top: 76px; }
          .letters-layout { grid-template-columns: 1fr; gap: 28px; }
          .letters-index { grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); order: 2; }
          .letters-index-label { grid-column: 1 / -1; }
          .letter-tab:hover, .letter-tab[aria-selected="true"] { transform: translateY(-2px); }
          .letter-stage { min-height: 315px; order: 1; }
          .envelope-button { width: min(92vw, 390px); }
          .letters-continue { order: 3; margin-top: 5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .letters-scene *, .letters-scene *::before, .letters-scene *::after {
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
          }
        }
      `}</style>

      <header className="letters-heading">
        <p className="letters-eyebrow">Words to keep</p>
        <h1>Letters for {recipient.name || "you"}</h1>
        <p>Choose an envelope. Open it when you are ready.</p>
      </header>

      <div className="letters-layout">
        <nav className="letters-index" aria-label="Letters">
          <p className="letters-index-label">Private notes</p>
          {letters.map((_, index) => (
            <button
              type="button"
              className="letter-tab"
              key={index}
              aria-selected={activeIndex === index}
              onClick={() => setOpenIndex(index)}
            >
              <span>Letter {String(index + 1).padStart(2, "0")}</span>
              {openIndex === index ? "Opened" : "Sealed"}
            </button>
          ))}
        </nav>

        <div className="letter-stage">
          <button
            type="button"
            className={`envelope-button ${isOpen ? "is-open" : ""}`}
            aria-label={`${isOpen ? "Close" : "Open"} letter ${activeIndex + 1}`}
            aria-expanded={isOpen}
            onClick={() => setOpenIndex(isOpen ? null : activeIndex)}
          >
            <span className="envelope-back" aria-hidden="true" />
            <span className="letter-paper" aria-live="polite">
              <small>For {recipient.name || "you"} · Letter {String(activeIndex + 1).padStart(2, "0")}</small>
              <p>{letters[activeIndex]}</p>
            </span>
            <span className="envelope-front" aria-hidden="true" />
            <span className="envelope-flap" aria-hidden="true" />
            <span className="letter-seal" aria-hidden="true">✦</span>
            <span className="envelope-hint">{isOpen ? "Tap to close" : "Tap to open"}</span>
          </button>
          {isOpen && (
            <button type="button" className="letter-close" onClick={() => setOpenIndex(null)}>
              Close letter
            </button>
          )}
        </div>
      </div>

      <button type="button" className="letters-continue" onClick={onNext}>
        Continue <span aria-hidden="true">✦</span>
      </button>
    </section>
  );
}