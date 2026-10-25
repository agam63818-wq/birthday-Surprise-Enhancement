import { useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { resolveLetters } from "@/lib/letters/resolve";

/**
 * Letters are a collection of sealed notes. Opening one breaks the wax seal
 * and unfolds a handwritten-feel paper letter (prev/next between letters).
 * Content comes from config.letters (Customize → Interactive letters), with
 * lastNote.lines as the legacy fallback.
 */
export default function LettersScene({ onNext }: SceneComponentProps) {
  const config = useConfig();
  const data = useMemo(() => resolveLetters(config), [config]);
  const letters = data.items;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [readSet, setReadSet] = useState<Set<number>>(() => new Set());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
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
    setReadSet(prev => (prev.has(openIndex) ? prev : new Set(prev).add(openIndex)));
    bodyRef.current?.scrollTo({ top: 0 });
  }, [openIndex]);

  const go = (delta: number) => setOpenIndex(i => (i === null ? i : Math.max(0, Math.min(letters.length - 1, i + delta))));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };
  const label = (i: number) => `Letter ${String(i + 1).padStart(2, "0")}`;
  const allRead = readSet.size >= letters.length;

  return (
    <section className="letters-scene" data-letters-scene>
      <style>{LETTERS_CSS}</style>

      <header className="letters-heading">
        <p className="letters-eyebrow">Words to keep</p>
        <h1>{data.heading}</h1>
        <p>{data.subtitle}</p>
        <p className="letters-progress" aria-live="polite">{readSet.size}/{letters.length} opened</p>
      </header>

      <ul className="letters-grid" aria-label="Sealed letters">
        {letters.map((letter, index) => {
          const read = readSet.has(index);
          return (
            <li key={index} className="letter-item" style={{ ["--tilt" as string]: `${(index % 2 === 0 ? -1 : 1) * (1.5 + (index % 3))}deg`, ["--i" as string]: index }}>
              <button
                type="button"
                className={`envelope ${read ? "is-read" : ""}`}
                aria-haspopup="dialog"
                aria-controls="letter-reader-dialog"
                aria-label={`Open ${label(index)}${read ? " (opened)" : ""}`}
                onClick={() => setOpenIndex(index)}
              >
                <span className="envelope-back" aria-hidden="true" />
                <span className="envelope-front" aria-hidden="true" />
                <span className="envelope-flap" aria-hidden="true" />
                <span className="letter-seal" aria-hidden="true">{read ? "♡" : "✦"}</span>
                <span className="envelope-meta">
                  <strong>{label(index)}</strong>
                  <em>{letter.hint}</em>
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
        onKeyDown={onKey}
      >
        {openLetter && openIndex !== null && (
          <article className="letter-reader" key={openIndex}>
            <button type="button" className="letter-reader-close" aria-label={`Close ${label(openIndex)}`} onClick={() => setOpenIndex(null)} autoFocus>
              <span aria-hidden="true">×</span>
            </button>
            <div className="letter-paper-sheet">
              <span className="letter-stamp" aria-hidden="true">♥</span>
              <p className="letter-reader-eyebrow">{label(openIndex)} · {letters.length > 1 ? `${openIndex + 1} of ${letters.length}` : "for you"}</p>
              <h2 id="letter-reader-title">{openLetter.title}</h2>
              <div className="letter-rule" aria-hidden="true" />
              <div ref={bodyRef} className="letter-reader-body" data-letter-reader-body tabIndex={0} aria-label="Letter content">
                {openLetter.body.trim() ? openLetter.body : <span className="letter-empty">This letter is still being written…</span>}
                {data.signature && <p className="letter-signature">{data.signature}</p>}
              </div>
            </div>
            <footer className="letter-reader-footer">
              <div className="letter-pager">
                <button type="button" className="letter-nav" aria-label="Previous letter" disabled={openIndex === 0} onClick={() => go(-1)}>‹</button>
                <span className="letter-dots" aria-hidden="true">{letters.map((_, i) => <i key={i} className={i === openIndex ? "on" : readSet.has(i) ? "read" : ""} />)}</span>
                <button type="button" className="letter-nav" aria-label="Next letter" disabled={openIndex === letters.length - 1} onClick={() => go(1)}>›</button>
              </div>
              {openIndex < letters.length - 1
                ? <button type="button" className="letter-reader-next" onClick={() => go(1)}>Next letter <span aria-hidden="true">→</span></button>
                : <button type="button" className="letter-reader-next" onClick={() => { setOpenIndex(null); onNext(); }}>Continue <span aria-hidden="true">✦</span></button>}
            </footer>
          </article>
        )}
      </dialog>

      <button type="button" className={`letters-continue ${allRead ? "is-ready" : ""}`} onClick={onNext}>
        {allRead ? "Continue" : "Continue anyway"} <span aria-hidden="true">✦</span>
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
  .letters-progress { margin-top: 10px !important; font: 600 .68rem/1 Inter, system-ui, sans-serif !important; letter-spacing: .16em; text-transform: uppercase; color: var(--letter-gold) !important; opacity: .85; }
  .letter-item { animation: letter-in .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i, 0) * 70ms); }
  @keyframes letter-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  .envelope.is-read { opacity: .78; }
  .envelope.is-read .letter-seal { background: radial-gradient(circle at 35% 30%, #e7b98a, #a8754a 70%); color: #5a2a1a; }
  .letters-continue.is-ready { background: linear-gradient(135deg, #8c3450, #58152f); box-shadow: 0 10px 30px rgba(140,52,80,.45); }

  /* ── Reader: a real paper letter ─────────────────────────── */
  .letter-reader-dialog {
    position: fixed; inset: 0; box-sizing: border-box;
    width: min(620px, calc(100% - 28px)); max-width: none;
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    margin: auto; padding: 0; border: 0; overflow: visible; background: transparent; color: #4a1f2a;
  }
  .letter-reader-dialog[open] { animation: reader-in .55s cubic-bezier(.2,.9,.25,1.05) both; }
  @keyframes reader-in { from { opacity: 0; transform: translateY(40px) rotate(-1.5deg) scale(.94); } to { opacity: 1; transform: none; } }
  .letter-reader-dialog::backdrop {
    background: radial-gradient(80% 60% at 50% 40%, rgba(80,20,40,.55), rgba(8,2,6,.88));
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  }
  .letter-reader {
    position: relative; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px;
    max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    animation: sheet-swap .45s ease both;
  }
  @keyframes sheet-swap { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
  .letter-paper-sheet {
    position: relative; min-height: 0; flex: 1 1 auto; display: flex; flex-direction: column;
    padding: clamp(26px, 5.5vw, 46px) clamp(22px, 6vw, 52px) clamp(22px, 4vw, 34px);
    border-radius: 6px;
    background:
      radial-gradient(120% 70% at 0% 0%, rgba(255,255,255,.7), transparent 55%),
      radial-gradient(90% 60% at 100% 100%, rgba(214,170,130,.28), transparent 60%),
      repeating-linear-gradient(transparent 0 31px, rgba(150,90,80,.13) 31px 32px),
      linear-gradient(180deg, #fffaf0, #f8ead6);
    box-shadow: 0 2px 0 #efdcc2, 0 4px 0 #e6cfb0, 0 40px 90px rgba(0,0,0,.55), inset 0 0 60px rgba(180,120,80,.12);
    text-align: left; overflow: hidden;
  }
  .letter-paper-sheet::before {
    content: ""; position: absolute; top: 0; bottom: 0; left: clamp(14px, 3.5vw, 30px); width: 1px;
    background: rgba(200,90,110,.28);
  }
  .letter-stamp {
    position: absolute; top: 40px; right: 30px; width: 46px; height: 54px; display: grid; place-items: center;
    color: #fff3e6; font-size: 20px; transform: rotate(6deg);
    background: linear-gradient(150deg, #b8475f, #7e203b);
    border: 3px dotted #fff8ee; border-radius: 3px; box-shadow: 0 3px 8px rgba(80,20,30,.35);
  }
  .letter-reader-eyebrow { margin: 0 0 8px; color: #a86a5f; font: 700 .62rem/1.4 Inter, system-ui, sans-serif; letter-spacing: .2em; text-transform: uppercase; }
  .letter-paper-sheet h2 {
    margin: 0 60px 0 0; color: #6b2338;
    font: 600 clamp(1.5rem, 5.2vw, 2.2rem)/1.15 "Dancing Script", "Playfair Display", Georgia, cursive;
    overflow-wrap: anywhere;
  }
  .letter-rule { height: 1px; margin: 14px 0 6px; background: linear-gradient(90deg, rgba(140,52,80,.5), rgba(140,52,80,0)); }
  .letter-reader-body {
    min-height: 60px; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
    padding: 6px 4px 4px 0; color: #43202a; white-space: pre-wrap; overflow-wrap: anywhere;
    font: 500 clamp(1.02rem, 2.7vw, 1.16rem)/32px "Playfair Display", Georgia, serif;
    scrollbar-width: thin; scrollbar-color: #c58c8c transparent;
  }
  .letter-empty { color: #a88a8a; font-style: italic; }
  .letter-signature {
    margin: 18px 0 0; text-align: right; white-space: normal; color: #7e203b;
    font: 600 clamp(1.3rem, 4.4vw, 1.7rem)/1.2 "Dancing Script", Georgia, cursive;
  }
  .letter-reader-close {
    position: absolute; z-index: 3; top: -14px; right: -10px; width: 46px; height: 46px; display: grid; place-items: center;
    padding: 0; border: 2px solid #fff6ea; border-radius: 50%; color: #fff6ea; cursor: pointer;
    background: linear-gradient(145deg, #a33f58, #6e1c35); font: 400 1.6rem/1 Inter, system-ui, sans-serif;
    box-shadow: 0 8px 20px rgba(0,0,0,.4);
  }
  .letter-reader-footer { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .letter-pager { display: flex; align-items: center; gap: 10px; }
  .letter-nav {
    width: 44px; height: 44px; border-radius: 50%; cursor: pointer; font: 400 1.5rem/1 Inter, sans-serif;
    border: 1px solid rgba(247,216,184,.35); color: #fbe7d6; background: rgba(255,255,255,.08);
  }
  .letter-nav:disabled { opacity: .3; cursor: default; }
  .letter-dots { display: flex; gap: 6px; }
  .letter-dots i { width: 7px; height: 7px; border-radius: 50%; background: rgba(247,216,184,.28); transition: all .3s ease; }
  .letter-dots i.read { background: rgba(247,216,184,.6); }
  .letter-dots i.on { width: 20px; border-radius: 99px; background: #e6bb7b; }
  .letter-reader-next {
    min-height: 46px; padding: 12px 22px; border-radius: 999px; cursor: pointer;
    border: 1px solid rgba(230,187,123,.5); color: #fff4ea; background: linear-gradient(135deg, #a33f58, #6e1c35);
    font: 600 .86rem/1.2 Inter, system-ui, sans-serif; box-shadow: 0 10px 26px rgba(110,28,53,.5);
  }
  .letter-reader button:focus-visible, .letter-reader-body:focus-visible { outline: 3px solid #e6bb7b; outline-offset: 3px; }
  @media (max-width: 520px) {
    .letters-grid { grid-template-columns: 1fr 1fr; gap: 18px 14px; }
    .envelope-meta em { display: none; }
    .letter-reader-dialog { width: calc(100% - 22px); }
    .letter-paper-sheet { padding: 24px 18px 18px 26px; }
    .letter-stamp { width: 36px; height: 42px; font-size: 15px; top: 40px; right: 18px; }
    .letter-reader-close { top: -12px; right: -6px; }
    .letter-reader-footer { justify-content: center; }
    .letter-reader-next { flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .letters-scene *, .letters-scene *::before, .letters-scene *::after {
      transition-duration: .01ms !important;
      animation-duration: .01ms !important;
    }
  }
`;
