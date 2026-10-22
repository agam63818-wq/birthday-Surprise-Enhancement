import type { ReactNode, SyntheticEvent } from "react";
import { CheckboxField, TextAreaField, TextField } from "./FormFields";
import { SCENE_REGISTRY } from "@/lib/v2/registry";
import {
  resolveHeartTunnelConfig,
  resolveLoveConfessionConfig,
  resolveLoveDriveConfig,
} from "@/lib/v2/experienceDefaults";
import type {
  ExperienceSceneId,
  OccasionId,
  SurpriseConfig,
} from "@/lib/v2/schema";

interface FieldDef {
  path: string;
  label: string;
  kind?: "text" | "textarea" | "paragraphs" | "number";
}

const HEART_FIELDS: FieldDef[] = [
  { path: "startSub", label: "Heart Tunnel start eyebrow" },
  { path: "startMain", label: "Heart Tunnel start title" },
  { path: "startSubtitle", label: "Heart Tunnel start subtitle", kind: "textarea" },
  { path: "startButton", label: "Heart Tunnel start button" },
  { path: "startHint", label: "Heart Tunnel sound hint" },
  { path: "cinematicSub", label: "Heart Tunnel cinematic eyebrow" },
  { path: "cinematicMain", label: "Heart Tunnel cinematic title" },
  { path: "revealTitle", label: "Heart Tunnel reveal title (newlines allowed)", kind: "textarea" },
  { path: "coupleNames", label: "Heart Tunnel names" },
  { path: "photoUrl", label: "Heart Tunnel photo URL or local path" },
  { path: "caption", label: "Heart Tunnel photo caption", kind: "textarea" },
  { path: "subtitle", label: "Heart Tunnel reveal subtitle", kind: "textarea" },
  { path: "yearsNumber", label: "Heart Tunnel years number (empty hides badge)" },
  { path: "yearsUnit", label: "Heart Tunnel years unit (empty hides badge)" },
  { path: "quote", label: "Heart Tunnel quote", kind: "textarea" },
  { path: "dateText", label: "Heart Tunnel date (empty hides date)" },
  { path: "letterButton", label: "Heart Tunnel letter button" },
  { path: "letterTitle", label: "Heart Tunnel letter title" },
  { path: "letterBody", label: "Heart Tunnel letter paragraphs (blank line separates)", kind: "paragraphs" },
  { path: "letterHighlight", label: "Heart Tunnel letter highlight", kind: "textarea" },
  { path: "signatureLead", label: "Heart Tunnel signature lead" },
  { path: "signatureName", label: "Heart Tunnel signature name" },
  { path: "continueButton", label: "Heart Tunnel continue button" },
  { path: "replayButton", label: "Heart Tunnel replay button" },
];

const CONFESSION_FIELDS: FieldDef[] = [
  { path: "question", label: "Love Confession question", kind: "textarea" },
  { path: "yesLabel", label: "Love Confession yes label" },
  { path: "noLabel", label: "Love Confession no label" },
  { path: "noReaction", label: "Love Confession no-button reaction", kind: "textarea" },
  { path: "climaxLine1", label: "Love Confession climax line 1" },
  { path: "climaxLine2", label: "Love Confession climax line 2" },
  { path: "envelopeLabel", label: "Love Confession envelope label" },
  { path: "letterTitle", label: "Love Confession letter title" },
  { path: "letterBody", label: "Love Confession letter body", kind: "textarea" },
  { path: "signatureLead", label: "Love Confession signature lead" },
  { path: "signatureName", label: "Love Confession signature name" },
  { path: "closeLabel", label: "Love Confession close label" },
  { path: "continueLabel", label: "Love Confession continue label" },
  { path: "replayLabel", label: "Love Confession replay label" },
  { path: "noGiveInAfter", label: "Love Confession No-button dodges before giving in (3–12)", kind: "number" },
];

const DRIVE_FIELDS: FieldDef[] = [
  { path: "recipientName", label: "Love Drive recipient name override" },
  { path: "senderName", label: "Love Drive sender name" },
  { path: "missionLabel", label: "Love Drive mission badge" },
  { path: "progressLabel", label: "Love Drive progress accessibility label" },
  { path: "objective", label: "Love Drive initial objective", kind: "textarea" },
  { path: "drivingObjective", label: "Love Drive driving objective", kind: "textarea" },
  { path: "exploringObjective", label: "Love Drive remaining objective ({remaining})", kind: "textarea" },
  { path: "allFoundObjective", label: "Love Drive all-found objective", kind: "textarea" },
  { path: "completedObjective", label: "Love Drive completed objective", kind: "textarea" },
  { path: "introToast", label: "Love Drive intro toast", kind: "textarea" },
  { path: "hintToast", label: "Love Drive hint toast", kind: "textarea" },
  { path: "brokenBlockToast", label: "Love Drive broken-block toast", kind: "textarea" },
  { path: "collectLabels.letter", label: "Love Drive letter collectible label" },
  { path: "collectLabels.gift", label: "Love Drive gift collectible label" },
  { path: "collectLabels.heart", label: "Love Drive heart collectible label" },
  { path: "collectedToasts.letter", label: "Love Drive letter collected toast", kind: "textarea" },
  { path: "collectedToasts.gift", label: "Love Drive gift collected toast", kind: "textarea" },
  { path: "collectedToasts.heart", label: "Love Drive heart collected toast", kind: "textarea" },
  { path: "allCollectedToast", label: "Love Drive all-collected toast", kind: "textarea" },
  { path: "deliveryToast", label: "Love Drive postbox toast ({remaining})", kind: "textarea" },
  { path: "finalTitle", label: "Love Drive final title", kind: "textarea" },
  { path: "finalMessage", label: "Love Drive final message", kind: "textarea" },
  { path: "letterTitle", label: "Love Drive letter title" },
  { path: "letterPrompt", label: "Love Drive letter prompt" },
  { path: "letterBody", label: "Love Drive letter body", kind: "textarea" },
  { path: "letterFooter", label: "Love Drive letter footer" },
  { path: "continueLabel", label: "Love Drive continue label" },
  { path: "replayLabel", label: "Love Drive replay label" },
  { path: "letterReplayLabel", label: "Love Drive letter replay label" },
  { path: "pauseLabel", label: "Love Drive pause accessibility label" },
  { path: "pauseTitle", label: "Love Drive pause title" },
  { path: "pauseBody", label: "Love Drive pause body", kind: "textarea" },
  { path: "resumeLabel", label: "Love Drive resume label" },
  { path: "restartLabel", label: "Love Drive restart label" },
  { path: "skipIntroLabel", label: "Love Drive skip-intro label" },
  { path: "skipRevealLabel", label: "Love Drive skip-reveal label" },
  { path: "closeLabel", label: "Love Drive close accessibility label" },
  { path: "steerLeftLabel", label: "Love Drive steer-left accessibility label" },
  { path: "steerRightLabel", label: "Love Drive steer-right accessibility label" },
  { path: "brakeLabel", label: "Love Drive brake accessibility label" },
  { path: "accelerateLabel", label: "Love Drive accelerate accessibility label" },
];

function valueAt(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

export interface ExperienceSceneEditorProps {
  sceneId: ExperienceSceneId;
  config: SurpriseConfig;
  occasion: OccasionId;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onPatch: (path: string, value: unknown) => void;
  onDetailsToggle: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  stickers?: ReactNode;
}

/** Schema-driven editor: every displayed value comes from the shared resolver. */
export default function ExperienceSceneEditor({
  sceneId,
  config,
  occasion,
  enabled,
  onToggle,
  onPatch,
  onDetailsToggle,
  stickers,
}: ExperienceSceneEditorProps) {
  const meta = SCENE_REGISTRY[sceneId];
  const resolved = sceneId === "heartTunnel"
    ? resolveHeartTunnelConfig(config.heartTunnel, occasion)
    : sceneId === "loveConfession"
      ? resolveLoveConfessionConfig(config.loveConfession, config.giftReveal?.senderName ?? "")
      : resolveLoveDriveConfig(config.loveDrive, occasion, {
        recipientName: config.name,
        senderName: config.giftReveal?.senderName ?? "",
      });
  const fields = sceneId === "heartTunnel" ? HEART_FIELDS : sceneId === "loveConfession" ? CONFESSION_FIELDS : DRIVE_FIELDS;

  return (
    <details className="v2-panel" onToggle={onDetailsToggle}>
      <summary>{meta.label}</summary>
      <CheckboxField label={`Enable ${meta.label}`} checked={enabled} onChange={onToggle} />
      {sceneId === "loveDrive" && <p>Stickers are disabled for this full-surface game so controls and the road stay unobstructed.</p>}
      {fields.map((field) => {
        const path = `${sceneId}.${field.path}`;
        const value = valueAt(resolved, field.path);
        if (field.kind === "number") {
          return (
            <label key={path} style={{ display: "block", marginBottom: 14 }}>
              {field.label}
              <input
                aria-label={field.label}
                type="number"
                min={3}
                max={12}
                step={1}
                value={typeof value === "number" ? value : 6}
                onChange={(event) => onPatch(path, Number(event.target.value))}
              />
            </label>
          );
        }
        if (field.kind === "paragraphs") {
          return (
            <TextAreaField
              key={path}
              label={field.label}
              value={Array.isArray(value) ? value.join("\n\n") : ""}
              onChange={(next) => onPatch(path, next ? next.split(/\n\s*\n/) : [])}
            />
          );
        }
        if (field.kind === "textarea") {
          return <TextAreaField key={path} label={field.label} value={typeof value === "string" ? value : ""} onChange={(next) => onPatch(path, next)} />;
        }
        return <TextField key={path} label={field.label} value={typeof value === "string" ? value : ""} onChange={(next) => onPatch(path, next)} />;
      })}
      {stickers}
    </details>
  );
}
