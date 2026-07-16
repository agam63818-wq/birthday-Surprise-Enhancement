import { useState, useEffect, useMemo } from "react";
import Confetti from "@/components/Confetti";
import GlassCard from "@/components/GlassCard";
import BackgroundEffectsLayer from "@/components/BackgroundEffectsLayer";
import { useConfig } from "@/contexts/ConfigContext";
import { resolveFontFamily, FONT_PRESETS } from "@/lib/fontPresets";

/* ── Grapheme splitter ──────────────────────────────────────
 * Splits a string into user-perceived characters (graphemes) so we
 * never split Devanagari conjuncts / matras or multi-codepoint
 * emoji (skin tones, ZWJ sequences) mid-animation.
 *
 * Falls back to Array.from (codepoint-based) if Intl.Segmenter is
 * unavailable in the runtime — that's still safer than naive
 * `.slice(0, n)` because it at least respects surrogate pairs.
 */
function splitGraphemes(line: string): string[] {
  try {
    const SegmenterCtor = (Intl as unknown as {
      Segmenter?: new (
        locales?: string | string[],
        options?: { granularity?: "grapheme" | "word" | "sentence" },
      ) => { segment: (input: string) => Iterable<{ segment: string }> };
    }).Segmenter;
    if (SegmenterCtor) {
      const seg = new SegmenterCtor(undefined, { granularity: "grapheme" });
      return Array.from(seg.segment(line), (s) => s.segment);
    }
  } catch {
    /* fall through */
  }
  return Array.from(line);
}

/* Punctuation that deserves a small extra pause when typing. */
const PAUSE_AFTER = new Set([".", "?", "!", "…"]);

export default function PageLastNote() {
  const config = useConfig();
  const bodyFont = resolveFontFamily(config.textStyles, "lastNote");
  const { lines, finalLine1, finalLine2, footerText } = config.lastNote;

  /* Closing flourish: the final signature lines may use the elegant
   * script — but only when short enough to stay readable. Long lines
   * keep the user's chosen (readable) font. The main letter body
   * always stays in bodyFont — script is never forced on paragraphs. */
  const scriptFont = FONT_PRESETS.elegant.fontFamily;
  const flourishFont = (line: string) => (line.trim().length <= 100 ? scriptFont : bodyFont);

  /* Pre-split every line into graphemes once per config change. */
  const linesGraphemes = useMemo(
    () => lines.map((line) => splitGraphemes(line)),
    [lines],
  );

  /* Check reduced-motion once on mount. */
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  /* Per-line reveal count (in graphemes). Length === lines.length. */
  const [revealed, setRevealed] = useState<number[]>(
    () => lines.map(() => 0),
  );
  /* Which line the "typing cursor" is currently sitting on. */
  const [activeLine, setActiveLine] = useState(0);
  /* Set true after every line is fully typed. */
  const [doneTyping, setDoneTyping] = useState(false);

  const [showEnding, setShowEnding] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [cursor, setCursor] = useState(true);

  /* Cursor blink — reused from the original file. */
  useEffect(() => {
    const blink = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(blink);
  }, []);

  /* ────────────────────────────────────────────────────────
   * Main reveal effect: either instant fade-in per line (reduced
   * motion) or true character-by-character typewriter.
   * ────────────────────────────────────────────────────── */
  useEffect(() => {
    // Reset state whenever the lines change (e.g. live Preview edits).
    setRevealed(lines.map(() => 0));
    setActiveLine(0);
    setDoneTyping(false);
    setShowEnding(false);
    setConfetti(false);

    if (lines.length === 0) {
      setDoneTyping(true);
      return;
    }

    /* ── Reduced-motion path: fade each full line in, one at a time.
     *    Mirrors the pre-typewriter behavior. ─────────────────── */
    if (prefersReducedMotion) {
      const timers: number[] = [];
      lines.forEach((_, i) => {
        timers.push(
          window.setTimeout(() => {
            setRevealed((r) => {
              const nx = r.slice();
              nx[i] = linesGraphemes[i].length;
              return nx;
            });
            setActiveLine(i);
          }, 300 + i * 620),
        );
      });
      const endAt = 300 + lines.length * 620 + 400;
      timers.push(window.setTimeout(() => setDoneTyping(true), endAt));
      return () => {
        timers.forEach((t) => clearTimeout(t));
      };
    }

    /* ── Real typewriter path. ─────────────────────────────── */
    // Tunable rhythm — feels typewriter-natural without being slow.
    const BASE_MS = 32;         // avg per grapheme
    const JITTER_MS = 10;       // ± randomness so it's not robotic
    const PUNCT_PAUSE_MS = 180; // extra pause after . ? ! …
    const BETWEEN_LINE_MS = 420; // pause before starting next line
    const START_DELAY_MS = 300;

    let cancelled = false;
    let timeoutId: number | null = null;

    let li = 0;      // current line index
    let gi = 0;      // current grapheme index within that line

    const step = () => {
      if (cancelled) return;

      // Finished the whole letter?
      if (li >= lines.length) {
        setDoneTyping(true);
        return;
      }

      const graphemes = linesGraphemes[li];

      // Skip empty lines cleanly.
      if (graphemes.length === 0) {
        li += 1;
        gi = 0;
        setActiveLine(Math.min(li, lines.length - 1));
        timeoutId = window.setTimeout(step, BETWEEN_LINE_MS);
        return;
      }

      // Reveal one more grapheme on the current line.
      gi += 1;
      const currentLineIdx = li;
      const currentGi = gi;
      setRevealed((r) => {
        if (r[currentLineIdx] >= currentGi) return r;
        const nx = r.slice();
        nx[currentLineIdx] = currentGi;
        return nx;
      });
      setActiveLine(currentLineIdx);

      // Reached the end of this line?
      if (gi >= graphemes.length) {
        li += 1;
        gi = 0;
        // If more lines remain, pause a bit before starting the next.
        if (li < lines.length) {
          timeoutId = window.setTimeout(step, BETWEEN_LINE_MS);
        } else {
          // All lines done.
          timeoutId = window.setTimeout(() => {
            if (!cancelled) setDoneTyping(true);
          }, 250);
        }
        return;
      }

      // Otherwise schedule the next grapheme with a bit of jitter,
      // plus an extra pause after sentence-ending punctuation.
      const lastGrapheme = graphemes[currentGi - 1];
      const jitter = (Math.random() * 2 - 1) * JITTER_MS;
      let delay = BASE_MS + jitter;
      if (PAUSE_AFTER.has(lastGrapheme)) delay += PUNCT_PAUSE_MS;
      timeoutId = window.setTimeout(step, Math.max(8, delay));
    };

    timeoutId = window.setTimeout(step, START_DELAY_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesGraphemes, prefersReducedMotion]);

  /* Once fully typed, trigger the ending + confetti. */
  useEffect(() => {
    if (!doneTyping) return;
    const t1 = window.setTimeout(() => {
      setShowEnding(true);
      setConfetti(true);
    }, 250);
    const t2 = window.setTimeout(() => setConfetti(false), 6250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [doneTyping]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", padding: "24px",
      position: "relative", zIndex: 5,
    }}>
      <Confetti active={confetti} />

      {/* Warm afterglow + gentle ambient settle once the letter ends —
          a calm, lingering close rather than an abrupt stop. */}
      {showEnding && (
        <>
          <div className="afterglow" aria-hidden="true" />
          <BackgroundEffectsLayer accent="rose" density="low" zIndex={1} />
        </>
      )}

      <GlassCard enter style={{
        maxWidth: "410px", width: "100%", overflow: "hidden",
        position: "relative", zIndex: 5,
      }}>
        {/* Header bar */}
        <div style={{
          padding: "12px 28px",
          background: "linear-gradient(90deg, rgba(124,58,237,0.5), rgba(190,24,93,0.35))",
          borderBottom: "1px solid rgba(167,139,250,0.15)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div style={{ display: "flex", gap: "5px" }}>
            {["rgba(255,100,100,0.5)","rgba(255,180,0,0.5)","rgba(100,200,100,0.5)"].map((c,i)=>(
              <div key={i} style={{ width:"8px",height:"8px",borderRadius:"50%",background:c }} />
            ))}
          </div>
          <span style={{ color:"rgba(220,185,255,0.6)", fontSize:"11px", letterSpacing:"0.15em", marginLeft:"6px" }}>
            LAST NOTE 💌
          </span>
        </div>

        {/* Letter body — premium spacing, readable font from the picker */}
        <div style={{ padding: "30px 28px 34px", overflowY: "auto", maxHeight: "70vh" }}>
          {lines.map((_, i) => {
            const graphemes = linesGraphemes[i];
            const shown = revealed[i] ?? 0;
            const started = shown > 0;
            const finishedLine = shown >= graphemes.length;

            // Cursor sits at the end of the current active line, only
            // while we're still typing (not after everything is done).
            const showCursorHere =
              !doneTyping && i === activeLine && started && !finishedLine;

            // In reduced-motion mode we also want the paragraph to
            // still gently fade/slide in like the original design did,
            // so use the same visible/hidden style there.
            const visible = started;
            const revealedText = graphemes.slice(0, shown).join("");

            return (
              <p
                key={i}
                style={{
                  fontFamily: bodyFont,
                  fontSize: "1.05rem",
                  lineHeight: 1.85,
                  marginBottom: "12px",
                  color: "rgba(235,210,255,0.9)",
                  opacity: prefersReducedMotion ? (visible ? 1 : 0) : 1,
                  transform:
                    prefersReducedMotion && !visible
                      ? "translateY(14px)"
                      : "translateY(0)",
                  transition: prefersReducedMotion
                    ? "opacity 0.55s ease, transform 0.55s ease"
                    : undefined,
                  // Preserve line breaks between lines, but let text wrap
                  // naturally inside a paragraph. Using minHeight prevents
                  // vertical jumping as a line starts empty.
                  minHeight: "1.85em",
                }}
              >
                {revealedText}
                {showCursorHere && (
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: "2px",
                      height: "1.1em",
                      background: "rgba(236,72,153,0.9)",
                      marginLeft: "2px",
                      verticalAlign: "text-bottom",
                      opacity: cursor ? 1 : 0,
                      transition: "opacity 0.1s",
                    }}
                  />
                )}
              </p>
            );
          })}

          {showEnding && (
            <div className="section-enter" style={{ marginTop: "28px", paddingTop: "22px", borderTop: "1px solid rgba(167,139,250,0.12)" }}>
              {/* Closing signature flourish — script only when short enough */}
              <p aria-hidden="true" style={{ color: "rgba(232,121,249,0.5)", fontSize: "14px", marginBottom: "12px", textAlign: "center" }}>
                ❦
              </p>
              <p style={{
                fontFamily: flourishFont(finalLine1),
                color: "#f472b6",
                fontSize: flourishFont(finalLine1) === scriptFont ? "1.35rem" : "1.15rem",
                fontWeight: 700,
                lineHeight: 1.7,
                marginBottom: "8px",
              }}>
                {finalLine1}
              </p>
              <p style={{
                fontFamily: flourishFont(finalLine2),
                color: "#a78bfa",
                fontSize: flourishFont(finalLine2) === scriptFont ? "1.25rem" : "1.05rem",
                fontWeight: 700,
                lineHeight: 1.7,
              }}>
                {finalLine2}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {showEnding && (
        <div className="section-enter" style={{ marginTop: "24px", textAlign: "center", position: "relative", zIndex: 5 }}>
          <h2 className="font-script" style={{
            fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
            background: "linear-gradient(135deg, #f9a8d4, #e879f9)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            filter: "drop-shadow(0 0 20px rgba(236,72,153,0.5))",
            marginBottom: "6px",
          }}>
            Happy Birthday, {config.name} 🎂
          </h2>
          <p style={{ color: "rgba(200,170,255,0.5)", fontSize: "12px", fontStyle: "italic" }}>
            {footerText}
          </p>
          <button
            className="glow-hover"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "18px",
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "11px 26px", borderRadius: "var(--rad-pill)",
              border: "1px solid rgba(236,72,153,0.4)",
              background: "linear-gradient(135deg, rgba(236,72,153,0.18), rgba(124,58,237,0.15))",
              color: "#f9a8d4", fontSize: "0.85rem", fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.04em",
              boxShadow: "var(--glow-subtle)",
            }}
          >
            🔁 Replay the surprise
          </button>
        </div>
      )}
    </div>
  );
}
