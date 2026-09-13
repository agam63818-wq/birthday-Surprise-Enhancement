/**
 * NotebookScene — 3D page-turn notebook.
 *
 * Adapted from animation_code.zip/notebook/: paper texture, ruled lines,
 * margin, and a CSS 3D leaf flip. Scaled to fit mobile without clipping.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import type { NotebookPage } from "@/lib/v2/schema";

function renderPageContent(page: NotebookPage) {
  switch (page.type) {
    case "cover":
      return (
        <div className="nb-cover">
          <div className="nb-cover-mark" aria-hidden="true">✦</div>
          <h2>{page.title || "A Letter For You"}</h2>
          {page.subtitle && <p>{page.subtitle}</p>}
          <span className="nb-cover-hint">turn the page →</span>
        </div>
      );
    case "letter":
      return (
        <div className="nb-letter">
          {page.title && <h3>{page.title}</h3>}
          <p>{page.content || ""}</p>
        </div>
      );
    case "memory":
      return (
        <div className="nb-memory">
          {page.title && <h3>{page.title}</h3>}
          {page.image && (
            <div className="nb-photo">
              <img
                src={page.image}
                alt={page.caption ?? page.title ?? "Memory"}
                onError={(e) => { e.currentTarget.hidden = true; }}
              />
            </div>
          )}
          {page.caption && <p>{page.caption}</p>}
        </div>
      );
    case "quote":
      return (
        <div className="nb-quote">
          {page.title && <p className="nb-kicker">{page.title}</p>}
          <blockquote>“{page.text}”</blockquote>
        </div>
      );
    case "ending":
      return (
        <div className="nb-ending">
          <div aria-hidden="true">✦</div>
          {page.title && <h3>{page.title}</h3>}
          {page.text && <p>{page.text}</p>}
        </div>
      );
  }
}

function getDefaultPages(recipientName: string): NotebookPage[] {
  return [
    {
      id: "default-cover",
      type: "cover",
      enabled: true,
      title: `A Letter For ${recipientName || "You"}`,
      subtitle: "Some things are better written than said.",
    },
    {
      id: "default-letter",
      type: "letter",
      enabled: true,
      title: "Dear You,",
      content: "There are so many things I want to say, but words never quite capture it all. So I wrote this — just for you.",
    },
    {
      id: "default-ending",
      type: "ending",
      enabled: true,
      title: "With Love",
      text: "Some feelings don't need perfect words. They just need to be felt.",
    },
  ];
}

export default function NotebookScene({ onNext, reducedMotion }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"forward" | "backward">("forward");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const theme = normalized.theme.preset;

  const rawPages = normalized.notebook.pages ?? [];
  const enabledPages = rawPages.filter((p: NotebookPage) => p.enabled !== false);
  const pages = rawPages.length > 0 ? enabledPages : getDefaultPages(normalized.recipient.name ?? "");
  const totalPages = pages.length;
  const isFirst = currentPage === 0;
  const isLast = currentPage === totalPages - 1;
  const duration = reducedMotion ? 0 : 720;

  const goNext = useCallback(() => {
    if (flipping || isLast) return;
    setFlipDir("forward");
    setFlipping(true);
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
      setFlipping(false);
    }, duration);
  }, [flipping, isLast, totalPages, duration]);

  const goPrev = useCallback(() => {
    if (flipping || isFirst) return;
    setFlipDir("backward");
    setFlipping(true);
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentPage((p) => Math.max(p - 1, 0));
      setFlipping(false);
    }, duration);
  }, [flipping, isFirst, duration]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const page = pages[Math.min(currentPage, Math.max(0, totalPages - 1))];
  const peekPage = flipDir === "forward"
    ? pages[Math.min(currentPage + 1, totalPages - 1)]
    : pages[Math.max(currentPage - 1, 0)];

  if (!page) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <p>No enabled notebook pages.</p>
        <button onClick={onNext}>Continue</button>
      </div>
    );
  }

  return (
    <section className={`nb-scene nb-theme-${theme}`} data-notebook-scene>
      <style>{NOTEBOOK_CSS}</style>
      <div className="nb-spot" aria-hidden="true" />

      <div className="nb-progress" aria-hidden="true">
        {pages.map((_, i) => (
          <span key={i} className={i === currentPage ? "is-current" : i < currentPage ? "is-done" : ""} />
        ))}
      </div>

      <div className="nb-book" aria-live="polite">
        <div className="nb-stack">
          {flipping && peekPage && (
            <article className="nb-leaf nb-under" aria-hidden="true">
              <div className="nb-paper">
                <span className="nb-margin" />
                {renderPageContent(peekPage)}
              </div>
            </article>
          )}
          <article className={`nb-leaf nb-front ${flipping ? `is-flip-${flipDir}` : ""} ${page.type === "cover" ? "is-cover" : ""}`}>
            <div className="nb-paper">
              <span className="nb-margin" />
              {renderPageContent(page)}
              <span className="nb-num">{currentPage + 1}</span>
              <span className="nb-fold" aria-hidden="true" />
            </div>
          </article>
        </div>
      </div>

      <div className="nb-nav">
        <button type="button" onClick={goPrev} disabled={isFirst || flipping} aria-label="Previous page">
          ← Prev
        </button>
        {isLast ? (
          <button type="button" className="nb-continue" onClick={onNext}>
            Continue ✦
          </button>
        ) : (
          <button type="button" onClick={goNext} disabled={flipping} aria-label="Next page">
            Next →
          </button>
        )}
      </div>
    </section>
  );
}

const NOTEBOOK_CSS = `
  .nb-scene {
    --desk-dark: #3d2214;
    --desk-mid: #6b4226;
    --desk-light: #8b5a2b;
    --gold: #c9a84c;
    --paper: #faf6ed;
    --line: #d4c5a9;
    --margin: #c94040;
    --ink: #2c2c2c;
    position: relative;
    isolation: isolate;
    min-height: 100dvh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: calc(56px + env(safe-area-inset-top, 0px)) 16px calc(20px + env(safe-area-inset-bottom, 0px));
    background:
      repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(0,0,0,.03) 80px, rgba(0,0,0,.03) 82px),
      linear-gradient(180deg, var(--desk-dark) 0%, var(--desk-mid) 30%, var(--desk-light) 58%, var(--desk-mid) 100%);
  }
  .nb-theme-midnightRose, .nb-theme-champagne, .nb-theme-roseGold {
    --desk-dark: #241016;
    --desk-mid: #4a1c28;
    --desk-light: #6b4226;
    --gold: #e8c99a;
  }
  .nb-theme-oceanNight {
    --desk-dark: #0b1c28;
    --desk-mid: #16384a;
    --desk-light: #2a5a6b;
    --gold: #abd5dd;
  }
  .nb-spot {
    position: absolute;
    top: 28%;
    left: 50%;
    width: 70vw;
    height: 50vh;
    transform: translate(-50%, -50%);
    background: radial-gradient(ellipse, rgba(255,220,150,.1), transparent 70%);
    filter: blur(36px);
    pointer-events: none;
  }
  .nb-progress {
    display: flex;
    gap: 6px;
    z-index: 2;
  }
  .nb-progress span {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,.28);
    transition: width .3s ease, background .3s ease;
  }
  .nb-progress span.is-current { width: 18px; background: var(--gold); }
  .nb-progress span.is-done { background: color-mix(in srgb, var(--gold) 70%, white); }
  .nb-book {
    width: min(680px, 94vw);
    perspective: 1800px;
    z-index: 2;
  }
  .nb-stack {
    position: relative;
    min-height: clamp(280px, 52vh, 430px);
    transform-style: preserve-3d;
    transform: rotateX(6deg);
  }
  .nb-leaf {
    position: absolute;
    inset: 0;
    transform-origin: left center;
    transform-style: preserve-3d;
    backface-visibility: hidden;
  }
  .nb-under { z-index: 1; }
  .nb-front { z-index: 2; }
  .nb-front.is-flip-forward { animation: nb-flip-fwd .72s cubic-bezier(.645,.045,.355,1) both; }
  .nb-front.is-flip-backward { animation: nb-flip-back .72s cubic-bezier(.645,.045,.355,1) both; }
  .nb-paper {
    height: 100%;
    box-sizing: border-box;
    padding: clamp(22px, 5vw, 40px) clamp(22px, 6vw, 44px) 28px clamp(36px, 9vw, 58px);
    border-radius: 4px 12px 12px 4px;
    background:
      repeating-linear-gradient(transparent, transparent 27px, var(--line) 27px, var(--line) 28px),
      var(--paper);
    box-shadow: 0 20px 60px rgba(0,0,0,.45), 4px 0 12px rgba(0,0,0,.12);
    color: var(--ink);
    overflow: hidden;
  }
  .nb-margin {
    position: absolute;
    left: clamp(22px, 6vw, 38px);
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--margin);
    opacity: .35;
  }
  .nb-num {
    position: absolute;
    right: 16px;
    bottom: 10px;
    font: 400 .75rem/1 Kalam, cursive, Georgia, serif;
    color: #999;
  }
  .nb-fold {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 24px;
    height: 24px;
    background: linear-gradient(225deg, #e8dfd0 50%, transparent 50%);
  }
  .nb-cover, .nb-ending, .nb-quote, .nb-letter, .nb-memory {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .nb-cover, .nb-ending { align-items: center; justify-content: center; text-align: center; }
  .nb-cover h2, .nb-letter h3, .nb-memory h3, .nb-ending h3 {
    margin: 0;
    font-family: Kalam, "Dancing Script", cursive, Georgia, serif;
    font-size: clamp(1.2rem, 4vw, 1.9rem);
    color: #2c2c2c;
  }
  .nb-cover p, .nb-letter p, .nb-memory p, .nb-ending p {
    margin: 0;
    font-family: Lora, Georgia, serif;
    font-size: clamp(.84rem, 2.2vw, .98rem);
    line-height: 1.75;
    color: #555;
    white-space: pre-wrap;
  }
  .nb-cover-mark, .nb-ending div { font-size: 1.6rem; color: var(--gold); }
  .nb-cover-hint {
    margin-top: 10px;
    font: 600 .68rem/1 Inter, sans-serif;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: #a38432;
  }
  .nb-front.is-cover .nb-paper {
    background:
      radial-gradient(circle at 30% 30%, rgba(255,255,255,.04), transparent 60%),
      linear-gradient(135deg, #1a0e08, #2c1810 40%, #3d2618);
    color: var(--gold);
  }
  .nb-front.is-cover h2 {
    background: linear-gradient(135deg, #ffe082, #c9a84c 45%, #fff2cc 55%, #a38432);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    font-family: "Playfair Display", Georgia, serif;
  }
  .nb-front.is-cover p, .nb-front.is-cover .nb-cover-hint { color: #ffe082; }
  .nb-front.is-cover .nb-margin, .nb-front.is-cover .nb-fold { display: none; }
  .nb-photo {
    width: min(180px, 70%);
    aspect-ratio: 1;
    margin: 0 auto;
    border: 3px solid #fff;
    box-shadow: 0 4px 16px rgba(0,0,0,.2);
    transform: rotate(-1deg);
    overflow: hidden;
    background: #f0ebe0;
  }
  .nb-photo img { width: 100%; height: 100%; object-fit: cover; }
  .nb-quote { justify-content: center; }
  .nb-kicker {
    margin: 0;
    font: 600 .72rem/1 Kalam, cursive, sans-serif;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #999;
  }
  .nb-quote blockquote {
    margin: 0;
    font: italic clamp(1rem, 3vw, 1.3rem)/1.6 "Playfair Display", Georgia, serif;
    border-left: 3px solid #c94040;
    padding-left: 16px;
  }
  .nb-nav {
    display: flex;
    gap: 12px;
    z-index: 3;
  }
  .nb-nav button {
    min-height: 44px;
    padding: 10px 18px;
    border-radius: 999px;
    border: 1px solid rgba(201,168,76,.4);
    background: rgba(201,168,76,.12);
    color: var(--gold);
    cursor: pointer;
    font-size: .88rem;
    backdrop-filter: blur(8px);
  }
  .nb-nav button:disabled { opacity: .4; cursor: not-allowed; }
  .nb-continue {
    border-color: rgba(201,168,76,.7) !important;
    background: linear-gradient(135deg, rgba(201,168,76,.28), rgba(163,132,50,.2)) !important;
    color: #fde68a !important;
  }
  @keyframes nb-flip-fwd {
    0% { transform: rotateY(0); }
    100% { transform: rotateY(-180deg); }
  }
  @keyframes nb-flip-back {
    0% { transform: rotateY(0); }
    100% { transform: rotateY(18deg) scale(.97); }
  }
  @media (prefers-reduced-motion: reduce) {
    .nb-front.is-flip-forward, .nb-front.is-flip-backward { animation: none; }
  }
`;
