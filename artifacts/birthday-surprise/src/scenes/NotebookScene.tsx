/**
 * NotebookScene — 3D page-turn notebook with letters, memories, and quotes.
 *
 * Adapted from animation_code.zip/notebook/
 * Original character preserved: 3D CSS page-turn, desk atmosphere,
 * paper texture, margin lines, handwritten font aesthetic.
 *
 * Changes from original:
 * - Converted from standalone HTML to React component
 * - Demo portfolio content removed (no "Code With Anurag", contact form, etc.)
 * - Pages driven by config.notebook.pages (letter/memory/quote/cover/ending)
 * - Zero/one/many pages handled gracefully
 * - Keyboard navigation (← →) and touch-friendly buttons
 * - Missing referenced memories graceful (image fails silently)
 * - Reduced motion: flat page view without 3D transforms
 * - Proper cleanup on unmount
 * - No global DOM mutations or CSS leakage (scoped styles)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { SceneComponentProps } from "@/lib/v2/registry";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import type { NotebookPage } from "@/lib/v2/schema";

// ── Page renderer ────────────────────────────────────────────────────────
function renderPageContent(page: NotebookPage) {
  switch (page.type) {
    case "cover":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem" }}>📓</div>
          <h2 style={{ fontFamily: "'Kalam', cursive, 'Dancing Script', cursive", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "#2c2c2c", lineHeight: 1.3 }}>
            {page.title || "A Letter For You"}
          </h2>
          {page.subtitle && (
            <p style={{ fontFamily: "'Lora', serif", fontSize: "clamp(0.85rem, 2.5vw, 1rem)", color: "#666", fontStyle: "italic", lineHeight: 1.6 }}>
              {page.subtitle}
            </p>
          )}
        </div>
      );

    case "letter":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {page.title && (
            <h3 style={{ fontFamily: "'Kalam', cursive, 'Dancing Script', cursive", fontSize: "clamp(1.1rem, 3vw, 1.4rem)", color: "#2c2c2c", borderBottom: "1px solid #d4c5a9", paddingBottom: "8px" }}>
              {page.title}
            </h3>
          )}
          <p style={{ fontFamily: "'Lora', serif", fontSize: "clamp(0.82rem, 2.2vw, 0.95rem)", color: "#3a3a3a", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
            {page.content || ""}
          </p>
        </div>
      );

    case "memory":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
          {page.title && (
            <h3 style={{ fontFamily: "'Kalam', cursive, 'Dancing Script', cursive", fontSize: "clamp(1rem, 3vw, 1.3rem)", color: "#2c2c2c", alignSelf: "flex-start" }}>
              {page.title}
            </h3>
          )}
          {page.image && (
            <div style={{
              width: "min(180px, 70%)",
              aspectRatio: "1",
              borderRadius: "4px",
              overflow: "hidden",
              border: "3px solid #fff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
              transform: "rotate(-1deg)",
              background: "#f0ebe0",
            }}>
              <span role="img" aria-label="Memory photo" style={{ position: "absolute", opacity: 0.3 }}>Photo unavailable</span>
              <img
                src={page.image}
                alt={page.caption ?? page.title ?? "Memory"}
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }}
                onError={(e) => { e.currentTarget.hidden = true; }}
              />
            </div>
          )}
          {page.caption && (
            <p style={{ fontFamily: "'Kalam', cursive", fontSize: "clamp(0.8rem, 2vw, 0.9rem)", color: "#666", fontStyle: "italic", textAlign: "center" }}>
              {page.caption}
            </p>
          )}
        </div>
      );

    case "quote":
      return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: "16px", padding: "8px 0" }}>
          {page.title && (
            <p style={{ fontFamily: "'Kalam', cursive", fontSize: "0.8rem", color: "#999", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {page.title}
            </p>
          )}
          <blockquote style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1rem, 3vw, 1.3rem)",
            color: "#2c2c2c",
            lineHeight: 1.6,
            fontStyle: "italic",
            borderLeft: "3px solid #c94040",
            paddingLeft: "16px",
            margin: 0,
          }}>
            "{page.text}"
          </blockquote>
        </div>
      );

    case "ending":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem" }}>🕊️</div>
          {page.title && (
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.1rem, 3vw, 1.4rem)", color: "#2c2c2c" }}>
              {page.title}
            </h3>
          )}
          {page.text && (
            <p style={{ fontFamily: "'Lora', serif", fontSize: "clamp(0.82rem, 2.2vw, 0.95rem)", color: "#555", lineHeight: 1.7, fontStyle: "italic" }}>
              {page.text}
            </p>
          )}
        </div>
      );
  }
}

// ── Default pages when notebook is empty ─────────────────────────────────
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
      content: "There are so many things I want to say, but words never quite capture it all. So I wrote this — just for you. ❤️",
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

export default function NotebookScene({ onNext, isActive, reducedMotion }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"forward" | "backward">("forward");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const rawPages = normalized.notebook.pages ?? [];
  const enabledPages = rawPages.filter((p: NotebookPage) => p.enabled !== false);
  const pages = rawPages.length > 0 ? enabledPages : getDefaultPages(normalized.recipient.name ?? "");

  const totalPages = pages.length;
  const isFirst = currentPage === 0;
  const isLast = currentPage === totalPages - 1;

  const goNext = useCallback(() => {
    if (flipping || isLast) return;
    setFlipDir("forward");
    setFlipping(true);
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
      setFlipping(false);
    }, reducedMotion ? 0 : 400);
  }, [flipping, isLast, totalPages, reducedMotion]);

  const goPrev = useCallback(() => {
    if (flipping || isFirst) return;
    setFlipDir("backward");
    setFlipping(true);
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentPage((p) => Math.max(p - 1, 0));
      setFlipping(false);
    }, reducedMotion ? 0 : 400);
  }, [flipping, isFirst, reducedMotion]);

  // Keyboard navigation
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
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const page = pages[Math.min(currentPage, Math.max(0, totalPages - 1))];
  if (!page) return <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}><p>No enabled notebook pages.</p><button onClick={onNext}>Continue</button></div>;

  if (reducedMotion) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "linear-gradient(180deg, #3d2214 0%, #6b4226 50%, #8b5a2b 100%)",
        gap: "24px",
      }}>
        <div style={{
          maxWidth: "480px",
          width: "100%",
          background: "#faf6ed",
          borderRadius: "8px",
          padding: "32px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          minHeight: "300px",
          position: "relative",
        }}>
          <div style={{ position: "absolute", left: "48px", top: 0, bottom: 0, width: "1px", background: "#c94040", opacity: 0.3 }} />
          {renderPageContent(page)}
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={goPrev} disabled={isFirst} aria-label="Previous page" style={{
            padding: "10px 20px", borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff", cursor: isFirst ? "not-allowed" : "pointer",
            opacity: isFirst ? 0.4 : 1,
          }}>← Prev</button>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
            {currentPage + 1} / {totalPages}
          </span>
          {isLast ? (
            <button onClick={onNext} style={{
              padding: "10px 20px", borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff", cursor: "pointer",
            }}>Continue ✨</button>
          ) : (
            <button onClick={goNext} aria-label="Next page" style={{
              padding: "10px 20px", borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff", cursor: "pointer",
            }}>Next →</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: `
        repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(0,0,0,0.03) 80px, rgba(0,0,0,0.03) 82px),
        repeating-linear-gradient(0deg, transparent, transparent 200px, rgba(0,0,0,0.015) 200px, rgba(0,0,0,0.015) 202px),
        linear-gradient(180deg, #3d2214 0%, #6b4226 25%, #8b5a2b 50%, #a0703c 70%, #6b4226 100%)
      `,
      gap: "20px",
      position: "relative",
    }}>
      {/* Desk spotlight */}
      <div style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "60vw",
        height: "60vh",
        background: "radial-gradient(ellipse, rgba(255,220,150,0.08) 0%, transparent 70%)",
        filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      {/* Page indicator */}
      <div style={{
        display: "flex",
        gap: "6px",
        alignItems: "center",
        zIndex: 10,
      }}>
        {pages.map((_, i) => (
          <div key={i} style={{
            width: i === currentPage ? "20px" : "6px",
            height: "6px",
            borderRadius: "999px",
            background: i === currentPage ? "#c9a84c" : "rgba(255,255,255,0.3)",
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>

      {/* Book */}
      <div style={{
        perspective: "1800px",
        width: "min(680px, 95vw)",
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{
          width: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform: "rotateX(6deg)",
          transition: "transform 0.3s ease",
        }}>
          {/* Page */}
          <div style={{
            background: "#faf6ed",
            borderRadius: "4px 12px 12px 4px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 4px 0 12px rgba(0,0,0,0.15)",
            padding: "clamp(20px, 5vw, 40px) clamp(24px, 6vw, 48px)",
            minHeight: "clamp(280px, 50vh, 420px)",
            position: "relative",
            overflow: "hidden",
            opacity: flipping ? 0 : 1,
            transform: flipping
              ? `rotateY(${flipDir === "forward" ? "-15deg" : "15deg"}) scale(0.97)`
              : "rotateY(0deg) scale(1)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}>
            {/* Margin line */}
            <div style={{
              position: "absolute",
              left: "clamp(36px, 8vw, 56px)",
              top: 0,
              bottom: 0,
              width: "1px",
              background: "#c94040",
              opacity: 0.35,
            }} />

            {/* Ruled lines */}
            {Array.from({ length: 18 }, (_: unknown, i: number) => (
              <div key={i} style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${(i + 1) * 28 + 20}px`,
                height: "1px",
                background: "#d4c5a9",
                opacity: 0.5,
              }} />
            ))}

            {/* Content */}
            <div style={{
              position: "relative",
              zIndex: 2,
              paddingLeft: "clamp(20px, 5vw, 32px)",
              minHeight: "clamp(240px, 40vh, 360px)",
            }}>
              {renderPageContent(page)}
            </div>

            {/* Page number */}
            <div style={{
              position: "absolute",
              bottom: "12px",
              right: "16px",
              fontFamily: "'Kalam', cursive",
              fontSize: "0.75rem",
              color: "#999",
            }}>
              {currentPage + 1}
            </div>

            {/* Corner fold */}
            <div style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "24px",
              height: "24px",
              background: "linear-gradient(225deg, #e8dfd0 50%, transparent 50%)",
            }} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
        zIndex: 10,
      }}>
        <button
          onClick={goPrev}
          disabled={isFirst || flipping}
          aria-label="Previous page"
          style={{
            padding: "10px 20px",
            borderRadius: "999px",
            border: "1px solid rgba(201,168,76,0.4)",
            background: "rgba(201,168,76,0.1)",
            color: "#c9a84c",
            cursor: isFirst ? "not-allowed" : "pointer",
            opacity: isFirst ? 0.4 : 1,
            fontSize: "0.9rem",
            transition: "all 0.2s ease",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          ← Prev
        </button>

        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", minWidth: "60px", textAlign: "center" }}>
          {currentPage + 1} / {totalPages}
        </span>

        {isLast ? (
          <button
            onClick={onNext}
            style={{
              padding: "10px 24px",
              borderRadius: "999px",
              border: "1px solid rgba(201,168,76,0.6)",
              background: "linear-gradient(135deg, rgba(201,168,76,0.25), rgba(163,132,50,0.2))",
              color: "#fde68a",
              cursor: "pointer",
              fontSize: "0.9rem",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 0 20px rgba(201,168,76,0.2)",
            }}
          >
            Continue ✨
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={flipping}
            aria-label="Next page"
            style={{
              padding: "10px 20px",
              borderRadius: "999px",
              border: "1px solid rgba(201,168,76,0.4)",
              background: "rgba(201,168,76,0.1)",
              color: "#c9a84c",
              cursor: flipping ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
              transition: "all 0.2s ease",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            Next →
          </button>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Lora:ital,wght@0,500;1,400&display=swap');
      `}</style>
    </div>
  );
}
