import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Extra delay (seconds) before the reveal transition — for stagger. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Scroll-triggered blur-to-clear reveal (Part 1 entrance system).
 * Uses IntersectionObserver; reveals immediately if unavailable.
 * Reduced motion: the global CSS rule collapses the transition to an
 * instant state, so the element simply appears when in view.
 */
export default function Reveal({ children, delay = 0, className = "", style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-init${shown ? " revealed" : ""} ${className}`.trim()}
      style={{ transitionDelay: shown ? `${delay}s` : undefined, ...style }}
    >
      {children}
    </div>
  );
}
