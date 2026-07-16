import { createElement, useMemo, type CSSProperties, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

interface StaggeredTextProps {
  /** Text to reveal word-by-word. Use for headings and SHORT emotional copy only. */
  text: string;
  as?: Tag;
  /** Seconds before the first word starts. */
  delay?: number;
  /** Seconds between each word. */
  stagger?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Staggered word-by-word reveal with a blur-to-clear entrance.
 * Reduced motion: renders the plain text (the global reduced-motion
 * CSS rule also collapses any leftover animation to an instant state).
 */
export default function StaggeredText({
  text,
  as = "span",
  delay = 0,
  stagger = 0.08,
  className,
  style,
}: StaggeredTextProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const parts = useMemo(() => text.split(/(\s+)/), [text]);

  if (reduced) {
    return createElement(as, { className, style }, text);
  }

  let wordIdx = 0;
  const children: ReactNode[] = parts.map((part, i) => {
    if (/^\s*$/.test(part)) return part;
    const d = delay + wordIdx * stagger;
    wordIdx += 1;
    return (
      <span
        key={i}
        className="stagger-word"
        style={{ "--stagger-delay": `${d}s` } as CSSProperties}
      >
        {part}
      </span>
    );
  });

  return createElement(as, { className, style }, children);
}
