import { useState } from "react";
import ExperienceFrame from "@/components/experiences/ExperienceFrame";
import type { ExperienceId, JsonObject } from "@/lib/experiences/protocol";
import { resolveHeartTunnelConfig, resolveLoveConfessionConfig, resolveLoveDriveConfig } from "@/lib/v2/experienceDefaults";

const EXPERIENCES: ExperienceId[] = ["heart-tunnel", "love-confession", "love-drive"];
const params = new URLSearchParams(window.location.search);
const requested = params.get("experience") as ExperienceId | null;
const initialExperience = requested && EXPERIENCES.includes(requested) ? requested : "love-drive";
const initialConfig = (initialExperience === "heart-tunnel"
  ? resolveHeartTunnelConfig(undefined, "birthday")
  : initialExperience === "love-confession"
    ? resolveLoveConfessionConfig(undefined, "QA Sender")
    : resolveLoveDriveConfig(undefined, "birthday", { recipientName: "QA Recipient", senderName: "QA Sender" })) as unknown as JsonObject;

/** Development-only release fixture; never registered as a production scene. */
export default function ExperienceFrameFixture() {
  const [mounted, setMounted] = useState(true);
  const [active, setActive] = useState(true);
  const [muted, setMuted] = useState(params.get("muted") !== "0");
  const [reducedMotion, setReducedMotion] = useState(params.get("reduced") === "1");
  const [replayToken, setReplayToken] = useState(0);
  const [nextCount, setNextCount] = useState(0);
  const [completeCount, setCompleteCount] = useState(0);
  const [replayedCount, setReplayedCount] = useState(0);
  const [error, setError] = useState("");

  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column", background: "#100812", color: "#fff" }}>
      <div style={{ zIndex: 20, display: "flex", gap: 6, flexWrap: "wrap", padding: 6, background: "#160e15" }}>
        <button type="button" data-testid="fixture-toggle-active" onClick={() => setActive((value) => !value)}>{active ? "Pause host" : "Resume host"}</button>
        <button type="button" data-testid="fixture-toggle-muted" onClick={() => setMuted((value) => !value)}>{muted ? "Unmute host" : "Mute host"}</button>
        <button type="button" data-testid="fixture-toggle-motion" onClick={() => setReducedMotion((value) => !value)}>{reducedMotion ? "Use full motion" : "Reduce motion"}</button>
        <button type="button" data-testid="fixture-replay" onClick={() => setReplayToken((value) => value + 1)}>Host replay</button>
        <button type="button" data-testid="fixture-remove" onClick={() => setMounted((value) => !value)}>{mounted ? "Remove frame" : "Re-mount frame"}</button>
        <output data-testid="fixture-next-count">Next: {nextCount}</output>
        <output data-testid="fixture-complete-count">Complete: {completeCount}</output>
        <output data-testid="fixture-replayed-count">Replayed: {replayedCount}</output>
      </div>
      <section style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {mounted ? (
          <ExperienceFrame
            experience={initialExperience}
            config={initialConfig}
            occasion="birthday"
            theme={{ "--exp-accent": "#ff6b8b", "--exp-accent-2": "#d4af37", "--exp-bg": "#07011a", "--exp-text": "#f3ecff" }}
            globalMuted={muted}
            reducedMotion={reducedMotion}
            replayToken={replayToken}
            isActive={active}
            onNext={() => setNextCount((count) => count + 1)}
            onComplete={() => setCompleteCount((count) => count + 1)}
            onReplayed={() => setReplayedCount((count) => count + 1)}
            onError={(frameError) => setError(frameError.message)}
          />
        ) : (
          <div data-testid="fixture-removed" style={{ display: "grid", placeItems: "center", height: "100%" }}>Frame removed</div>
        )}
        {error && <div data-testid="fixture-error" style={{ position: "absolute", top: 8, left: 8, zIndex: 30 }}>{error}</div>}
      </section>
    </main>
  );
}
