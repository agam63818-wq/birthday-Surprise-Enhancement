import type { Config } from "@/config";
import { SCENE_IDS } from "../../../supabase/functions/_shared/configPatch";
import { AUDIO_TRACK_IDS, FULL_SONG, playbackError, playbackWindow, type AudioTrackId, type AudioPlaybackSettings } from "../../../supabase/functions/_shared/audioPlayback";

type Track = {
  audio: HTMLAudioElement;
  settings: AudioPlaybackSettings;
  originScene: string | undefined;
  ready: boolean;
  disposed: boolean;
  legacy: boolean;
  interval?: ReturnType<typeof setInterval>;
  metadataTimeout?: ReturnType<typeof setTimeout>;
  detach: () => void;
  stopStarted?: number;
  stopVolume?: number;
  request: number;
};
/** One owned element per triggered track; no elements/preload for untriggered scenes. */
export class SceneAudioRuntime {
  private tracks = new Map<AudioTrackId, Track>();
  private scene?: string;
  private scenes: readonly string[] = [];
  private attempted = new Set<AudioTrackId>();
  private started = false;
  private disposed = false;
  enabled = false;
  constructor(private config: Config["audio"], private onError: (message: string) => void = () => {}, private createAudio = () => new Audio()) {}

  private settings(id: AudioTrackId): AudioPlaybackSettings {
    return this.config.playback?.[id] ?? { ...FULL_SONG, mode: id === "backgroundMusic" ? "loop" : "full", fadeInDuration: id === "backgroundMusic" ? 1.8 : 1.4, fadeOutDuration: id === "backgroundMusic" ? 0.7 : 1.5 };
  }
  sceneChanged(scene: string | undefined, activeScenes: readonly string[]) {
    const previous = this.scene;
    this.scene = scene; this.scenes = activeScenes;
    for (const [id, track] of this.tracks) {
      const s = track.settings;
      if (!scene || (s.startAt === "scene" && !activeScenes.includes(s.startScene!))) { this.finish(id); continue; }
      if ((s.mode === "untilSceneEnds" && track.originScene !== scene) || s.stopScene === scene) this.end(id);
    }
    if (this.enabled && scene && scene !== previous) this.startEligible();
  }
  start() {
    if (this.disposed) return;
    this.enabled = true; this.started = true;
    for (const [id, track] of this.tracks) if (track.ready && !track.stopStarted) this.play(id, track);
    this.startEligible();
  }
  mute() {
    this.enabled = false;
    for (const [id, track] of this.tracks) {
      if (track.stopStarted) { this.finish(id); continue; }
      track.request++; track.audio.pause(); this.clearTick(track);
    }
  }
  cake() {
    if (!this.enabled || !this.scene) return;
    const s = this.settings("birthdaySong");
    if ((s.startAt ?? "default") === "default") this.begin("birthdaySong", true);
  }
  private startEligible() {
    if (!this.scene || !this.started || !this.enabled) return;
    for (const id of AUDIO_TRACK_IDS) {
      const s = this.settings(id);
      if (s.stopScene === this.scene || this.tracks.has(id)) continue;
      const at = s.startAt ?? "default";
      if (at === "scene") {
        if (this.scenes.includes(s.startScene!) && s.startScene === this.scene && !this.attempted.has(id)) this.begin(id);
      } else if ((at === "experience" || id === "backgroundMusic") && !this.attempted.has(id)) this.begin(id);
    }
  }
  private begin(id: AudioTrackId, restart = false) {
    if (!this.config[id] || this.disposed || !this.enabled) return;
    const settings = this.settings(id);
    if (settings.stopScene === this.scene || (settings.startAt === "scene" && !this.scenes.includes(settings.startScene!))) return;
    if (this.tracks.has(id)) { if (!restart) return; this.finish(id); }
    this.attempted.add(id);
    if (playbackError(settings, SCENE_IDS)) { this.onError("Invalid audio playback settings. This track was skipped."); return; }
    const audio = this.createAudio();
    audio.preload = "metadata"; audio.loop = settings.mode === "loop";
    const track: Track = { audio, settings, originScene: this.scene, ready: false, disposed: false, legacy: !this.config.playback?.[id], detach: () => {}, request: 0 };
    this.tracks.set(id, track);
    const ready = () => {
      if (track.disposed) return;
      const window = playbackWindow(settings, audio.duration);
      if (settings.mode === "custom" && !window) { this.fail(id, "Custom audio timing could not be verified against this file. Choose Full Song or adjust the range."); return; }
      if (track.ready) { this.tick(id, track); return; }
      if (track.metadataTimeout) clearTimeout(track.metadataTimeout);
      track.ready = true;
      try { audio.currentTime = window?.start ?? 0; } catch { this.fail(id, "This audio file does not support the selected start time."); return; }
      audio.volume = settings.fadeInDuration ? 0 : this.volume(id);
      if (this.enabled) this.play(id, track);
    };
    const ended = () => this.finish(id);
    const failed = () => this.fail(id, "An audio file could not be played. The experience can continue without it.");
    const update = () => this.tick(id, track);
    audio.addEventListener("loadedmetadata", ready);
    audio.addEventListener("durationchange", ready);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", ended);
    audio.addEventListener("error", failed);
    track.detach = () => { audio.removeEventListener("loadedmetadata", ready); audio.removeEventListener("durationchange", ready); audio.removeEventListener("timeupdate", update); audio.removeEventListener("ended", ended); audio.removeEventListener("error", failed); };
    track.metadataTimeout = setTimeout(() => this.fail(id, "Audio metadata is unavailable. This track was skipped; the experience remains usable."), 15000);
    audio.src = this.config[id]; audio.load();
  }
  private volume(id: AudioTrackId) { return id === "birthdaySong" ? 0.8 : this.tracks.has("birthdaySong") ? 0.04 : 0.35; }
  private play(id: AudioTrackId, track: Track) {
    const request = ++track.request;
    void track.audio.play().then(() => {
      if (track.disposed) { track.audio.pause(); return; }
      if (request !== track.request || !this.enabled) { if (!this.enabled) track.audio.pause(); return; }
      this.clearTick(track); track.interval = setInterval(() => this.tick(id, track), 40);
    }).catch(() => {
      if (!track.disposed && request === track.request) {
        track.audio.pause(); this.clearTick(track);
        this.onError("Audio was blocked or unavailable. Tap the music button to retry.");
      }
    });
  }
  private tick(id: AudioTrackId, track: Track) {
    if (track.disposed || !track.ready) return;
    if (track.stopStarted !== undefined) {
      const duration = track.settings.fadeOutDuration ?? 0;
      const remaining = 1 - (Date.now() - track.stopStarted) / (duration * 1000);
      if (remaining <= 0) { this.finish(id); return; }
      track.audio.volume = Math.max(0, (track.stopVolume ?? 0) * remaining); return;
    }
    if (!this.enabled || track.audio.paused) return;
    const window = playbackWindow(track.settings, track.audio.duration);
    if (track.settings.mode === "custom" && !window) { this.fail(id, "The audio duration changed; custom timing is no longer valid."); return; }
    const start = window?.start ?? 0;
    const end = track.legacy && id === "birthdaySong" ? Math.min(window?.end ?? Infinity, 35) : window?.end;
    const current = track.audio.currentTime;
    if (end !== undefined && track.settings.mode !== "loop" && current >= end) { this.finish(id); return; }
    const fadeIn = track.settings.fadeInDuration ?? 0;
    const fadeOut = track.settings.stopImmediately ? 0 : track.settings.fadeOutDuration ?? 0;
    const inGain = fadeIn ? Math.max(0, Math.min(1, (current - start) / fadeIn)) : 1;
    const outGain = fadeOut && end !== undefined && track.settings.mode !== "loop" ? Math.max(0, Math.min(1, (end - current) / fadeOut)) : 1;
    track.audio.volume = this.volume(id) * Math.min(inGain, outGain);
  }
  private end(id: AudioTrackId) {
    const track = this.tracks.get(id); if (!track || track.stopStarted !== undefined) return;
    if (!this.enabled || !track.ready || track.audio.paused || track.settings.stopImmediately || !track.settings.fadeOutDuration) { this.finish(id); return; }
    track.stopStarted = Date.now(); track.stopVolume = track.audio.volume;
    this.clearTick(track); track.interval = setInterval(() => this.tick(id, track), 40);
  }
  private clearTick(track: Track) { if (track.interval) clearInterval(track.interval); track.interval = undefined; }
  private fail(id: AudioTrackId, message: string) { this.finish(id); this.onError(message); }
  private finish(id: AudioTrackId) {
    const track = this.tracks.get(id); if (!track) return;
    track.disposed = true; track.request++; this.clearTick(track);
    if (track.metadataTimeout) clearTimeout(track.metadataTimeout);
    track.detach(); track.audio.pause(); track.audio.removeAttribute("src"); track.audio.load();
    this.tracks.delete(id);
  }
  dispose() { this.disposed = true; this.enabled = false; for (const id of AUDIO_TRACK_IDS) this.finish(id); }
}

/** Save-time probe for custom segments only; always releases its temporary element. */
export function readActualAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(); audio.preload = "metadata";
    const cleanup = () => { clearTimeout(timer); audio.removeEventListener("loadedmetadata", loaded); audio.removeEventListener("error", failed); audio.pause(); audio.removeAttribute("src"); audio.load(); };
    const failed = () => { cleanup(); reject(new Error("Cannot verify custom audio timing. Retry metadata or choose Full Song.")); };
    const loaded = () => { const duration = audio.duration; if (!Number.isFinite(duration) || duration <= 0) { failed(); return; } cleanup(); resolve(duration); };
    const timer = setTimeout(failed, 12000);
    audio.addEventListener("loadedmetadata", loaded); audio.addEventListener("error", failed);
    audio.src = url; audio.load();
  });
}
