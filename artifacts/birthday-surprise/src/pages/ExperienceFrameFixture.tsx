import { useState } from "react";
import ExperienceFrame from "@/components/experiences/ExperienceFrame";

/**
 * Development-only browser spike. It intentionally does not register a scene
 * or alter a surprise config; it only mounts the shared host around Love Drive.
 */
export default function ExperienceFrameFixture() {
  const [mounted, setMounted] = useState(true);
  const [active, setActive] = useState(true);
  const [nextCount, setNextCount] = useState(0);
  const [error, setError] = useState("");

  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#ffdde1" }}>
      {mounted ? (
        <ExperienceFrame
          experience="love-drive"
          config={{}}
          occasion="birthday"
          globalMuted
          isActive={active}
          onNext={() => setNextCount((count) => count + 1)}
          onError={(frameError) => setError(frameError.message)}
        />
      ) : (
        <div data-testid="fixture-removed" style={{ display: "grid", placeItems: "center", height: "100%" }}>
          Frame removed
        </div>
      )}
      <div
        style={{
          position: "absolute",
          zIndex: 20,
          right: "max(12px, env(safe-area-inset-right))",
          bottom: "max(12px, env(safe-area-inset-bottom))",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button type="button" data-testid="fixture-toggle-active" onClick={() => setActive((value) => !value)}>
          {active ? "Pause host" : "Resume host"}
        </button>
        <button type="button" data-testid="fixture-remove" onClick={() => setMounted(false)}>
          Remove frame
        </button>
      </div>
      <output data-testid="fixture-next-count" style={{ position: "absolute", left: 8, bottom: 8, zIndex: 20 }}>
        Next: {nextCount}
      </output>
      {error && <div data-testid="fixture-error" style={{ position: "absolute", top: 8, left: 8, zIndex: 30 }}>{error}</div>}
    </main>
  );
}
