import { useEffect, useState } from "react";

/**
 * SaveStatusIndicator — premium save feedback for the Customize builder.
 *
 * Shows one of:
 * - \"Saving your magic…\" (pulsing violet) while a save is in flight
 * - \"Unsaved changes\" (amber) when local edits differ from the saved row
 * - \"Saved just now / Xm ago\" (green) after a successful save, with the
 *   relative time refreshing automatically
 * - \"All changes saved\" (green) when nothing has changed yet
 */

function relTime(d: Date, now: number): string {
  const s = Math.floor((now - d.getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const PULSE_KEYFRAMES = `
@keyframes save-dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.45; transform: scale(0.75); }
}
`;

export default function SaveStatusIndicator({
  dirty,
  saving,
  lastSavedAt,
}: {
  dirty: boolean;
  saving: boolean;
  lastSavedAt: Date | null;
}) {
  // Tick every 30s so the relative \"Saved Xm ago\" stays fresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  let dot = "#34d399";
  let text = "All changes saved";
  let pulse = false;

  if (saving) {
    dot = "#c084fc";
    text = "Saving your magic…";
    pulse = true;
  } else if (dirty) {
    dot = "#fbbf24";
    text = "Unsaved changes";
    pulse = true;
  } else if (lastSavedAt) {
    dot = "#34d399";
    text = `Saved ${relTime(lastSavedAt, now)}`;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "7px",
        fontFamily: "Inter, sans-serif",
        fontSize: "12px",
        letterSpacing: "0.02em",
        color: "rgba(221,214,254,0.78)",
        userSelect: "none",
      }}
    >
      <style>{PULSE_KEYFRAMES}</style>
      <span
        aria-hidden="true"
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: dot,
          boxShadow: `0 0 8px ${dot}`,
          animation: pulse ? "save-dot-pulse 1.4s ease-in-out infinite" : undefined,
          flexShrink: 0,
        }}
      />
      <span>{text}</span>
    </div>
  );
}
