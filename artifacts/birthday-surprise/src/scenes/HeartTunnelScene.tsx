import ExperienceFrame from "@/components/experiences/ExperienceFrame";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import { resolveHeartTunnelConfig } from "@/lib/v2/experienceDefaults";
import type { SceneComponentProps } from "@/lib/v2/registry";
import type { JsonObject } from "@/lib/experiences/protocol";

/** Thin opt-in host wrapper; source behavior/config binding is finalized in Part 3. */
export default function HeartTunnelScene({ onNext, isActive, reducedMotion, globalMuted }: SceneComponentProps) {
  const normalized = useNormalizedConfig();
  const config = normalized.heartTunnel ?? resolveHeartTunnelConfig(normalized.raw.heartTunnel, normalized.occasion);
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", minHeight: "100dvh", overflow: "hidden" }}>
      <ExperienceFrame
        experience="heart-tunnel"
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
