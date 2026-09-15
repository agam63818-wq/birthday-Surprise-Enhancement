/** Additive JSONB contract. URLs remain in the original audio fields. */
export const AUDIO_TRACK_IDS = ["backgroundMusic", "birthdaySong"] as const;
export type AudioTrackId = typeof AUDIO_TRACK_IDS[number];
export const PLAYBACK_MODES = ["full", "custom", "untilSceneEnds", "loop"] as const;
export interface AudioPlaybackSettings {
  mode: typeof PLAYBACK_MODES[number];
  startTime?: number;
  duration?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  stopImmediately?: boolean;
  startAt?: "default" | "experience" | "scene";
  startScene?: string;
  stopScene?: string;
}
export type AudioPlaybackMap = Partial<Record<AudioTrackId, AudioPlaybackSettings>>;
export const FULL_SONG: AudioPlaybackSettings = { mode: "full", fadeInDuration: 0, fadeOutDuration: 0, stopImmediately: false, startAt: "default" };
export function validDuration(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value > 0; }
export function playbackError(value: unknown, knownScenes: readonly string[], audioDuration?: number): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Invalid playback settings.";
  const v = value as Record<string, unknown>;
  const keys = ["mode", "startTime", "duration", "fadeInDuration", "fadeOutDuration", "stopImmediately", "startAt", "startScene", "stopScene"];
  if (Object.keys(v).some(k => !keys.includes(k))) return "Unsupported playback setting.";
  if (!PLAYBACK_MODES.includes(v.mode as AudioPlaybackSettings["mode"])) return "Choose a supported playback mode.";
  for (const key of ["startTime", "duration", "fadeInDuration", "fadeOutDuration"]) {
    const number = v[key];
    if (number !== undefined && (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > (key.startsWith("fade") ? 60 : 86400))) return `Invalid ${key}: use finite, non-negative seconds${key.startsWith("fade") ? " (up to 60)" : ""}.`;
  }
  if (v.stopImmediately !== undefined && typeof v.stopImmediately !== "boolean") return "Invalid immediate-stop setting.";
  if (v.startAt !== undefined && !["default", "experience", "scene"].includes(v.startAt as string)) return "Choose a supported start trigger.";
  for (const key of ["startScene", "stopScene"]) if (v[key] !== undefined && !knownScenes.includes(v[key] as string)) return "Choose a known scene.";
  if (v.startAt === "scene" && !v.startScene) return "Choose a start scene.";
  if (v.startAt === "scene" && v.startScene === v.stopScene) return "Start and stop scenes must be different.";
  if (v.mode === "custom") {
    if (typeof v.startTime !== "number" || typeof v.duration !== "number" || v.duration <= 0) return "Custom playback needs a start time and a positive duration.";
    if (validDuration(audioDuration) && (v.startTime >= audioDuration || v.startTime + v.duration > audioDuration + 0.001)) return "Playback must fit within the available audio length.";
  }
  return null;
}
export function validateAudioPlayback(audio: unknown, knownScenes: readonly string[]): void {
  const map = (audio as { playback?: unknown } | undefined)?.playback;
  if (map === undefined) return;
  if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error("Invalid audio playback map.");
  for (const [track, settings] of Object.entries(map)) {
    if (!(AUDIO_TRACK_IDS as readonly string[]).includes(track)) throw new Error("Unknown audio track.");
    const error = playbackError(settings, knownScenes); if (error) throw new Error(error);
  }
}
export function playbackWindow(settings: AudioPlaybackSettings, actualDuration: number): { start: number; end: number } | null {
  if (!validDuration(actualDuration)) return null;
  const start = settings.mode === "custom" ? settings.startTime ?? 0 : 0;
  const end = settings.mode === "custom" ? start + (settings.duration ?? 0) : actualDuration;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= actualDuration || end <= start || end > actualDuration + 0.001) return null;
  return { start, end: Math.min(end, actualDuration) };
}
export function formatAudioTime(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "Unknown";
  const rounded = Math.round(seconds * 10) / 10;
  const minutes = Math.floor(rounded / 60); const remainder = rounded % 60;
  const precision = remainder % 1 ? 1 : 0;
  return `${minutes}:${remainder.toFixed(precision).padStart(precision ? 4 : 2, "0")}`;
}
