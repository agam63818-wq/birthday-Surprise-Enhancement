import { useLayoutEffect, useRef, useState } from "react";
import ExperienceFrame from "@/components/experiences/ExperienceFrame";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import { resolveLoveDriveConfig } from "@/lib/v2/experienceDefaults";
import type { SceneComponentProps } from "@/lib/v2/registry";
import type { JsonObject } from "@/lib/experiences/protocol";
import { getExperienceTheme } from "@/lib/experiences/theme";

/**
 * Opt-in Love Drive host. The scene fills exactly the viewport space BELOW
 * wherever it starts (dashboard top bar / status rows included), keeping a
 * reserved top gutter for the scene navigation and a bottom gutter for the
 * floating music button — so neither ever covers the game's controls.
 */
export default function LoveDriveScene({ onNext, isActive, reducedMotion, globalMuted }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const config = normalized.loveDrive ?? resolveLoveDriveConfig(normalized.raw.loveDrive, normalized.occasion, {
    recipientName: normalized.recipient.name,
    senderName: normalized.sender.name,
  });
  const theme = getExperienceTheme(normalized.theme.preset);
  const rootRef = useRef<HTMLDivElement>(null);
  const [offsetTop, setOffsetTop] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
      setOffsetTop(prev => (Math.abs(prev - top) > 1 ? top : prev));
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && document.body) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, []);

  const height = `calc(100dvh - ${offsetTop}px)`;
  return (
    <div ref={rootRef} data-love-drive-host="true" style={{ position: "relative", width: "100%", height, minHeight: 420, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-deep, #07011a)" }}>
      <div aria-hidden="true" data-love-drive-nav-gutter="true" style={{ height: offsetTop > 8 ? 60 : "calc(60px + env(safe-area-inset-top, 0px))", flexShrink: 0 }} />
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", borderRadius: 18, margin: "0 6px", boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.45)" }}>
        <ExperienceFrame
          experience="love-drive"
          config={config as unknown as JsonObject}
          occasion={normalized.occasion}
          theme={theme}
          continueLabel={config.continueLabel || "Continue"}
          isActive={isActive}
          reducedMotion={reducedMotion}
          globalMuted={globalMuted}
          onNext={onNext}
        />
      </div>
      <div aria-hidden="true" data-experience-music-gutter="true" style={{ height: "calc(78px + env(safe-area-inset-bottom, 0px))", flexShrink: 0 }} />
    </div>
  );
}
