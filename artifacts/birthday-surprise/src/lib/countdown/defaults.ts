// Single defaults module for the Scheduled Surprise Countdown, shared by the
// Customize editor, normalizeConfig and the CountdownGate renderer.
import type { CountdownConfig, CountdownStyle, OccasionId, SurpriseConfig } from "@/lib/v2/schema";
import { parseUtcIso } from "../../../supabase/functions/_shared/countdownTime";

export const DEFAULT_COUNTDOWN_TIMEZONE = "Asia/Kolkata";

export interface ResolvedCountdownConfig {
  enabled: boolean;
  unlockAtUtc: string;
  /** Parsed unlockAtUtc, or null when missing/invalid. */
  unlockAtMs: number | null;
  timezone: string;
  localDate: string;
  localTime: string;
  heading: string;
  recipientName: string;
  message: string;
  labels: { days: string; hours: string; minutes: string; seconds: string };
  waitingLine: string;
  footer: string;
  showTeaserButton: boolean;
  teaserLabel: string;
  teaserReaction: string;
  soundEnabled: boolean;
  afterUnlock: "autoOpen" | "openButton";
  openButtonLabel: string;
  style: CountdownStyle;
}

const HEADINGS: Partial<Record<OccasionId, string>> = {
  birthday: "Something special is on its way",
  anniversary: "Our moment is almost here",
  romantic: "Something made with love is almost here",
  loveday: "Something made with love is almost here",
  friendship: "A little surprise is on its way",
  congratulations: "Your celebration is almost here",
  mothersday: "A little love note is on its way",
  fathersday: "A little thank-you is on its way",
  rakshabandhan: "A Rakhi surprise is on its way",
};

/** Theme-derived default visual style (overridable by countdown.style). */
export function defaultCountdownStyle(themeId: string | undefined): CountdownStyle {
  if (themeId === "oceanNight" || themeId === "deepEmerald" || themeId === "dreamyLavender") return "celestial";
  if (themeId === "champagne" || themeId === "royalGold" || themeId === "roseGold") return "velvet";
  return "aurora";
}

export const COUNTDOWN_TIMEZONES: Array<{ id: string; label: string }> = [
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "Asia/Dubai", label: "Dubai (GST)" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Asia/Tokyo", label: "Tokyo" },
  { id: "Asia/Kathmandu", label: "Kathmandu" },
  { id: "Asia/Dhaka", label: "Dhaka" },
  { id: "Europe/London", label: "London" },
  { id: "Europe/Paris", label: "Paris / Berlin" },
  { id: "America/New_York", label: "New York (ET)" },
  { id: "America/Chicago", label: "Chicago (CT)" },
  { id: "America/Denver", label: "Denver (MT)" },
  { id: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { id: "America/Toronto", label: "Toronto" },
  { id: "Australia/Sydney", label: "Sydney" },
  { id: "Pacific/Auckland", label: "Auckland" },
  { id: "UTC", label: "UTC" },
];

export function resolveCountdownConfig(
  raw: CountdownConfig | undefined,
  ctx: { name?: string; occasion?: OccasionId; themeId?: string },
): ResolvedCountdownConfig {
  const c = raw ?? {};
  const unlockAtMs = parseUtcIso(c.unlockAtUtc);
  const name = (c.recipientName ?? "").trim() || (ctx.name ?? "").trim();
  return {
    enabled: c.enabled === true,
    unlockAtUtc: c.unlockAtUtc ?? "",
    unlockAtMs,
    timezone: c.timezone || DEFAULT_COUNTDOWN_TIMEZONE,
    localDate: c.localDate ?? "",
    localTime: c.localTime ?? "",
    heading: c.heading?.trim() || HEADINGS[ctx.occasion ?? "birthday"] || "Something special is on its way",
    recipientName: name,
    message: c.message?.trim() || "Some moments are worth waiting for. This one was made just for you.",
    labels: {
      days: c.labels?.days?.trim() || "Days",
      hours: c.labels?.hours?.trim() || "Hours",
      minutes: c.labels?.minutes?.trim() || "Minutes",
      seconds: c.labels?.seconds?.trim() || "Seconds",
    },
    waitingLine: c.waitingLine?.trim() || "Stay close. The magic begins soon.",
    footer: c.footer?.trim() ?? "",
    showTeaserButton: c.showTeaserButton === true,
    teaserLabel: c.teaserLabel?.trim() || "Can't wait?",
    teaserReaction: c.teaserReaction?.trim() || "Patience, love. It's worth it.",
    soundEnabled: c.soundEnabled === true,
    afterUnlock: c.afterUnlock === "openButton" ? "openButton" : "autoOpen",
    openButtonLabel: c.openButtonLabel?.trim() || "Open your surprise",
    style: c.style ?? defaultCountdownStyle(ctx.themeId),
  };
}

export function resolveCountdownFor(config: SurpriseConfig): ResolvedCountdownConfig {
  return resolveCountdownConfig(config.countdown, {
    name: config.name,
    occasion: (config.occasionId ?? config.occasionType) as OccasionId | undefined,
    themeId: config.themePreset ?? config.themeId,
  });
}

/** True only when the gate should be active: ON with a valid instant. */
export function countdownActive(config: SurpriseConfig | undefined | null): boolean {
  const c = config?.countdown;
  return !!c && c.enabled === true && parseUtcIso(c.unlockAtUtc) !== null;
}
