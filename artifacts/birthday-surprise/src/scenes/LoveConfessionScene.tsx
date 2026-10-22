import ExperienceFrame from "@/components/experiences/ExperienceFrame";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import { resolveLoveConfessionConfig } from "@/lib/v2/experienceDefaults";
import type { SceneComponentProps } from "@/lib/v2/registry";
import type { JsonObject } from "@/lib/experiences/protocol";
import { getExperienceTheme } from "@/lib/experiences/theme";

/** Opt-in Love Confession host: normalized config, theme tokens and lifecycle only. */
export default function LoveConfessionScene({ onNext, isActive, reducedMotion, globalMuted }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const config = normalized.loveConfession ?? resolveLoveConfessionConfig(
    normalized.raw.loveConfession,
    normalized.sender.name,
  );
  const theme = getExperienceTheme(normalized.theme.preset);
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", minHeight: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-deep, #07011a)" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <ExperienceFrame
          experience="love-confession"
          config={config as unknown as JsonObject}
          theme={theme}
          occasion={normalized.occasion}
          continueLabel={config.continueLabel || "Continue"}
          isActive={isActive}
          reducedMotion={reducedMotion}
          globalMuted={globalMuted}
          onNext={onNext}
        />
      </div>
      <div aria-hidden="true" data-experience-music-gutter="true" style={{ height: "calc(70px + env(safe-area-inset-bottom, 0px))", flexShrink: 0 }} />
    </div>
  );
}
