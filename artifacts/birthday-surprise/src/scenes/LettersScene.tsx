import { useEffect, useMemo, useRef, useState } from "react";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { letterHints } from "@/lib/v2/cinematicCopy";

/**
 * Letters are a collection of sealed notes. Opening one unfolds the
 * envelope and slides the paper out — never a generic card list.
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
  const hints = letterHints();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const openLetter = openIndex === null ? null : letters[openIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex === null) {
      if (dialog.open) dialog.close();
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (target?.isConnected) requestAnimationFrame(() => target.focus());
      return;
    }
    if (!dialog.open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
  }, [openIndex]);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section className="letters-scene" data-letters-scene>
      <style>{LETTERS_CSS}</style>

      <header className="letters-heading">
        <p className="letters-eyebrow">Words to keep</p>
        <h1>Letters for {recipient.name || "you"}</h1>
        <p>Some words are meant to stay. Open a note when you are ready.</p>
      </header>

      <ul className="letters-grid" aria-label="Sealed letters">
        {letters.map((text, index) => {
          const isOpen = openIndex === index;
          const hint = hints[index % hints.length];
          const label = `Letter ${String(index + 1).padStart(2, "0")}`;
          return (
            <li key={index} className={`letter-item ${isOpen ? "is-open" : ""}`} style={{ ["--tilt" as string]: `${(index % 2 === 0 ? -1 : 1) * (2 + (index % 3))}deg` }}>
              <button
                type="button"
                className={`envelope ${isOpen ? "is-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls="letter-reader-dialog"
                aria-haspopup="dialog"
                aria-label={isOpen ? `Close ${label}` : `Open ${label}`}
                onClick={() => toggle(index)}
              >
                <span className="envelope-back" aria-hidden="true" />
                <span className="letter-paper" aria-hidden="true">
                  <small>For {recipient.name || "you"}</small>
                  <p>Open to read</p>
                </span>
                <span className="envelope-front" aria-hidden="true" />
                <span className="envelope-flap" aria-hidden="true" />
                <span className="letter-seal" aria-hidden="true">✦</span>
                <span className="envelope-meta">
                  <strong>{label}</strong>
                  <em>{hint}</em>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        id="letter-reader-dialog"
        className="letter-reader-dialog"
        aria-labelledby="letter-reader-title"
        onCancel={(event) => { event.preventDefault(); setOpenIndex(null); }}
        onClose={() => setOpenIndex(null)}
        onClick={(event) => { if (event.target === event.currentTarget) setOpenIndex(null); }}
      >
        {openLetter && openIndex !== null && (
          <article className="letter-reader">
            <header className="letter-reader-header">
              <div>
                <p className="letter-reader-eyebrow">Letter {String(openIndex + 1).padStart(2, "0")}</p>
                <h2 id="letter-reader-title">For {recipient.name || "you"}</h2>
              </div>
              <button type="button" className="letter-reader-close" aria-label={`Close Letter ${String(openIndex + 1).padStart(2, "0")}`} onClick={() => setOpenIndex(null)} autoFocus>
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="letter-reader-body" data-letter-reader-body tabIndex={0} aria-label="Letter content">{openLetter}</div>
            <footer className="letter-reader-footer">
              <button type="button" className="letter-reader-back" onClick={() => setOpenIndex(null)}>Back to letters</button>
              <button type="button" className="letter-reader-next" onClick={onNext}>Continue <span aria-hidden="true">✦</span></button>
            </footer>
          </article>
        )}
      </dialog>

      <button type="button" className="letters-continue" onClick={onNext}>
        Continue <span aria-hidden="true">✦</span>
      </button>
    </section>
  );
}

const LETTERS_CSS = `
  .letters-scene {
    --letter-ink: #f7ece7;
    --letter-muted: rgba(247,236,231,.66);
    --letter-gold: #e6bb7b;
    position: relative;
    isolation: isolate;
    min-height: 100dvh;
    box-sizing: border-box;
    display: grid;
    align-content: start;
    gap: clamp(22px, 4vw, 34px);
    padding: clamp(72px, 11vh, 110px) clamp(16px, 5vw, 48px) calc(28px + env(safe-area-inset-bottom, 0px));
    color: var(--letter-ink);
    background:
      radial-gradient(circle at 50% 18%, rgba(147,36,62,.22), transparent 28%),
      linear-gradient(160deg, #10070b, #1d0913 54%, #090308);
    overflow-x: hidden;
  }
  .letters-heading { width: min(100%, 720px); margin-inline: auto; text-align: center; }
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
    font: 500 clamp(1.8rem, 6vw, 3.2rem)/1.08 "Playfair Display", Georgia, serif;
  }
  .letters-heading p:last-child {
    max-width: 430px;
    margin: 12px auto 0;
    color: var(--letter-muted);
    font: .86rem/1.6 Inter, system-ui, sans-serif;
  }
  .letters-grid {
    list-style: none;
    margin: 0 auto;
    padding: 0;
    width: min(100%, 880px);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
    gap: clamp(18px, 3vw, 28px);
  }
  .letter-item { display: grid; }
  .envelope {
    position: relative;
    width: 100%;
    aspect-ratio: 1.45;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    perspective: 1100px;
    filter: drop-shadow(0 18px 22px rgba(0,0,0,.32));
    transform: rotate(var(--tilt, 0deg));
    transition: transform .4s ease, filter .4s ease;
  }
  .envelope:hover, .envelope:focus-visible { transform: rotate(0deg) translateY(-4px); filter: drop-shadow(0 22px 26px rgba(0,0,0,.4)); }
  .envelope-back, .envelope-front {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 8px 8px 12px 12px;
  }
  .envelope-back {
    border: 1px solid rgba(246,190,173,.28);
    background: linear-gradient(145deg, #762a42, #401126 62%, #260814);
  }
  .envelope-back::after {
    content: "";
    position: absolute;
    inset: 10px;
    border: 1px solid rgba(245,203,174,.17);
    border-radius: 4px;
  }
  .envelope-front {
    z-index: 3;
    clip-path: polygon(0 42%, 50% 76%, 100% 42%, 100% 100%, 0 100%);
    background: linear-gradient(155deg, #8c3450, #58152f 68%, #341020);
  }
  .envelope-flap {
    position: absolute;
    inset: 0 0 auto;
    z-index: 5;
    height: 58%;
    transform-origin: 50% 0;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    background: linear-gradient(145deg, #a34b63, #60152f 78%);
    transition: transform 1s cubic-bezier(.16,1,.3,1);
    backface-visibility: hidden;
  }
  .letter-paper {
    position: absolute;
    z-index: 2;
    left: 7%;
    right: 7%;
    top: 8%;
    height: 84%;
    padding: 16px 16px 18px;
    box-sizing: border-box;
    overflow: auto;
    color: #4e2029;
    background:
      linear-gradient(rgba(112,57,52,.1) 1px, transparent 1px) 0 0 / 100% 22px,
      #f7e4cf;
    border-radius: 3px;
    text-align: left;
    transform: translateY(18%) scale(.92);
    opacity: 0;
    pointer-events: none;
    transition: transform 1s cubic-bezier(.16,1,.3,1), opacity .7s ease .12s;
  }
  .letter-paper small {
    display: block;
    margin-bottom: 8px;
    color: #a66a63;
    font: 600 .58rem/1 Inter, system-ui, sans-serif;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .letter-paper p {
    margin: 0;
    white-space: pre-wrap;
    font: 500 clamp(.84rem, 2vw, 1rem)/1.65 "Playfair Display", Georgia, serif;
  }
  .letter-seal {
    position: absolute;
    z-index: 7;
    left: 50%;
    bottom: 18%;
    width: 42px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #f7d8b8;
    background: radial-gradient(circle at 35% 30%, #cf6a75, #7e203b 68%, #451025);
    box-shadow: 0 4px 12px rgba(26,0,8,.4);
    transform: translateX(-50%);
    transition: transform .45s ease, opacity .45s ease;
  }
  .envelope-meta {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 10px;
    z-index: 6;
    display: grid;
    gap: 2px;
    color: #f7ece7;
    text-align: left;
    pointer-events: none;
  }
  .envelope-meta strong {
    font: 600 .72rem/1.2 Inter, system-ui, sans-serif;
    letter-spacing: .08em;
  }
  .envelope-meta em {
    font: 400 .68rem/1.3 "Playfair Display", Georgia, serif;
    color: rgba(247,236,231,.72);
    font-style: italic;
  }
  .envelope.is-open { transform: rotate(0deg) scale(1.03); z-index: 4; }
  .envelope.is-open .envelope-flap { transform: rotateX(180deg); }
  .envelope.is-open .letter-paper {
    transform: translateY(-34%) scale(1);
    opacity: 1;
    pointer-events: auto;
    transition-delay: .28s;
  }
  .envelope.is-open .letter-seal { transform: translate(-50%, 24px) scale(.6); opacity: 0; }
  .envelope.is-open .envelope-meta { opacity: 0; }
  .letters-continue {
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
  }
  .letter-reader-dialog {
    position: fixed;
    inset: 0;
    box-sizing: border-box;
    width: min(720px, calc(100% - 32px));
    max-width: none;
    max-height: calc(100dvh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    margin: auto;
    padding: 0;
    border: 0;
    overflow: hidden;
    border-radius: 22px;
    color: #4e2029;
    background: transparent;
    box-shadow: 0 30px 120px rgba(0,0,0,.62);
  }
  .letter-reader-dialog::backdrop {
    background: rgba(12,3,8,.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .letter-reader {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    overflow: hidden;
    border: 1px solid rgba(255,239,218,.7);
    border-radius: 22px;
    background: linear-gradient(145deg, #fff9ed, #f7e4cf);
  }
  .letter-reader-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px clamp(20px, 4vw, 32px);
    border-bottom: 1px solid rgba(126,71,65,.18);
    background: rgba(255,251,242,.62);
    text-align: left;
  }
  .letter-reader-eyebrow {
    margin: 0 0 5px;
    color: #a66a63;
    font: 700 .64rem/1.4 Inter, system-ui, sans-serif;
    letter-spacing: .18em;
    text-transform: uppercase;
  }
  .letter-reader-header h2 {
    margin: 0;
    color: #64283b;
    font: 500 clamp(1.3rem, 4vw, 1.85rem)/1.25 "Playfair Display", Georgia, serif;
    overflow-wrap: anywhere;
  }
  .letter-reader-close {
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(126,71,65,.24);
    border-radius: 50%;
    color: #7e203b;
    background: rgba(255,255,255,.56);
    font: 400 1.65rem/1 Inter, system-ui, sans-serif;
    cursor: pointer;
  }
  .letter-reader-body {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: clamp(22px, 5vw, 38px);
    color: #4e2029;
    text-align: left;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: 500 clamp(1rem, 2.5vw, 1.12rem)/1.85 "Playfair Display", Georgia, serif;
    scrollbar-width: thin;
    scrollbar-color: #c58c8c transparent;
  }
  .letter-reader-footer {
    flex: 0 0 auto;
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
    padding: 16px clamp(20px, 4vw, 32px);
    border-top: 1px solid rgba(126,71,65,.18);
    background: rgba(255,251,242,.74);
  }
  .letter-reader-footer button {
    min-height: 44px;
    padding: 11px 20px;
    border-radius: 999px;
    font: 600 .82rem/1.3 Inter, system-ui, sans-serif;
    cursor: pointer;
  }
  .letter-reader-back { border: 1px solid rgba(126,71,65,.3); color: #7e203b; background: transparent; }
  .letter-reader-next { border: 1px solid rgba(230,187,123,.38); color: #fff1e7; background: linear-gradient(135deg, #8c3450, #58152f); }
  .letter-reader button:focus-visible, .letter-reader-body:focus-visible { outline: 3px solid #a66a63; outline-offset: 3px; }
  @media (max-width: 520px) {
    .letters-grid { grid-template-columns: 1fr 1fr; gap: 18px 14px; }
    .envelope-meta em { display: none; }
    .letter-reader-dialog {
      width: calc(100% - 20px);
      max-height: calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
      border-radius: 18px;
    }
    .letter-reader {
      max-height: calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
      border-radius: 18px;
    }
    .letter-reader-header { padding: 16px 18px; }
    .letter-reader-footer { padding: 14px 18px; }
    .letter-reader-footer button { flex: 1 1 125px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .letters-scene *, .letters-scene *::before, .letters-scene *::after {
      transition-duration: .01ms !important;
      animation-duration: .01ms !important;
    }
  }
`;
