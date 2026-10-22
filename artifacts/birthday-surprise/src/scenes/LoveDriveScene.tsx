import ExperienceFrame from "@/components/experiences/ExperienceFrame";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import { resolveLoveDriveConfig } from "@/lib/v2/experienceDefaults";
import type { SceneComponentProps } from "@/lib/v2/registry";
import type { JsonObject } from "@/lib/experiences/protocol";
import { getExperienceTheme } from "@/lib/experiences/theme";

/** Opt-in Love Drive host with a reserved gutter for the fixed scene navigation. */
export default function LoveDriveScene({ onNext, isActive, reducedMotion, globalMuted }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const config = normalized.loveDrive ?? resolveLoveDriveConfig(normalized.raw.loveDrive, normalized.occasion, {
    recipientName: normalized.recipient.name,
    senderName: normalized.sender.name,
  });
  const theme = getExperienceTheme(normalized.theme.preset);
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", minHeight: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-deep, #07011a)" }}>
      <div aria-hidden="true" data-love-drive-nav-gutter="true" style={{ height: "calc(60px + env(safe-area-inset-top, 0px))", flexShrink: 0 }} />
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
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
    </div>
  );
}
