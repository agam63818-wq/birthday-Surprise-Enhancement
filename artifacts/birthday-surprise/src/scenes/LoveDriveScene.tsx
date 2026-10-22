import ExperienceFrame from "@/components/experiences/ExperienceFrame";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import { resolveLoveDriveConfig } from "@/lib/v2/experienceDefaults";
import type { SceneComponentProps } from "@/lib/v2/registry";
import type { JsonObject } from "@/lib/experiences/protocol";

/** Thin opt-in host wrapper; source behavior/config binding is finalized in Part 4. */
export default function LoveDriveScene({ onNext, isActive, reducedMotion, globalMuted }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const config = normalized.loveDrive ?? resolveLoveDriveConfig(normalized.raw.loveDrive, normalized.occasion, {
    recipientName: normalized.recipient.name,
    senderName: normalized.sender.name,
  });
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", minHeight: "100dvh", overflow: "hidden" }}>
      <ExperienceFrame
        experience="love-drive"
        config={config as unknown as JsonObject}
        occasion={normalized.occasion}
        isActive={isActive}
        reducedMotion={reducedMotion}
        globalMuted={globalMuted}
        onNext={onNext}
      />
    </div>
  );
}
