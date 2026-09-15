import { describe, it, expect, vi, afterEach } from "vitest";
import { SceneAudioRuntime } from "../audioRuntime";
import { SCENE_IDS, validateV2Config } from "../../../../supabase/functions/_shared/configPatch";
import { playbackError, playbackWindow, FULL_SONG, formatAudioTime, type AudioPlaybackSettings } from "../../../../supabase/functions/_shared/audioPlayback";
import defaultConfig from "@/config";

class FakeAudio extends EventTarget {
  src = ""; preload = ""; loop = false; volume = 1; currentTime = 0; duration = 120; paused = true;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn(() => { if (this.src) this.dispatchEvent(new Event("loadedmetadata")); });
  removeAttribute = vi.fn(() => { this.src = ""; });
}
const engines: SceneAudioRuntime[] = [];
afterEach(() => { engines.forEach(e => e.dispose()); engines.length = 0; vi.useRealTimers(); });
function engine(settings: AudioPlaybackSettings = FULL_SONG, duration = 120, id: "backgroundMusic" | "birthdaySong" = "backgroundMusic") {
  vi.useFakeTimers();
  const created: FakeAudio[] = []; const error = vi.fn();
  const runtime = new SceneAudioRuntime({ backgroundMusic: id === "backgroundMusic" ? "/a.mp3" : "", birthdaySong: id === "birthdaySong" ? "/b.mp3" : "", useFallbackTones: false, playback: { [id]: settings } }, error, () => { const a = new FakeAudio(); a.duration = duration; created.push(a); return a as unknown as HTMLAudioElement; });
  engines.push(runtime); runtime.sceneChanged("intro", ["intro", "giftReveal", "roseBloom", "lastNote"]);
  return { runtime, created, error };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
describe("playback settings validation", () => {
  it.each(["full", "custom", "untilSceneEnds", "loop"] as const)("accepts %s", mode => expect(playbackError({ mode, startTime: 2, duration: 3 }, SCENE_IDS, 10)).toBeNull());
  it.each([
    { mode: "nope" }, { mode: "custom", startTime: -1, duration: 3 }, { mode: "custom", startTime: 2, duration: 0 },
    { mode: "custom", startTime: 7, duration: 4 }, { mode: "custom", startTime: 10, duration: 1 },
    { mode: "full", fadeInDuration: NaN }, { mode: "full", fadeOutDuration: 61 },
    { mode: "loop", startAt: "scene", startScene: "missing" }, { mode: "loop", startAt: "scene" },
    { mode: "full", startAt: "scene", startScene: "intro", stopScene: "intro" },
    { mode: "full", stopImmediately: "yes" }, { mode: "full", code: "unsafe" },
  ])("rejects invalid settings %j", settings => expect(playbackError(settings, SCENE_IDS, 10)).not.toBeNull());
  it("accepts precise segment ending at the file boundary", () => {
    const s = { mode: "custom", startTime: 2.5, duration: 7.5 } as const;
    expect(playbackWindow(s, 10)).toEqual({ start: 2.5, end: 10 });
    expect(playbackWindow(s, NaN)).toBeNull(); expect(playbackWindow(s, Infinity)).toBeNull();
  });
  it("full ignores but retains stored custom timing", () => expect(playbackWindow({ mode: "full", startTime: 7, duration: 1 }, 10)).toEqual({ start: 0, end: 10 }));
  it("validates music on legacy save boundaries too", () => {
    expect(() => validateV2Config(defaultConfig)).not.toThrow();
    expect(() => validateV2Config({ ...defaultConfig, audio: { ...defaultConfig.audio, playback: { birthdaySong: { mode: "custom", duration: -1 } } } })).toThrow();
  });
  it("formats timestamps", () => { expect(formatAudioTime(125)).toBe("2:05"); expect(formatAudioTime(65.5)).toBe("1:05.5"); expect(formatAudioTime(NaN)).toBe("Unknown"); });
});
describe("actual shared track runtime", () => {
  it("allocates nothing before interaction and never duplicates on repeated start", async () => {
    const { runtime, created } = engine(); expect(created).toHaveLength(0);
    runtime.start(); runtime.start(); await flush(); expect(created).toHaveLength(1);
    expect(created[0].preload).toBe("metadata"); expect(created[0].loop).toBe(false);
  });
  it("custom seeks first, fades using media time, and stops at the calculated end", async () => {
    const { runtime, created } = engine({ mode: "custom", startTime: 10, duration: 8, fadeInDuration: 2, fadeOutDuration: 2 });
    runtime.start(); await flush(); const a = created[0]; expect(a.currentTime).toBe(10);
    a.currentTime = 11; vi.advanceTimersByTime(40); expect(a.volume).toBeCloseTo(0.175);
    a.currentTime = 17; vi.advanceTimersByTime(40); expect(a.volume).toBeCloseTo(0.175);
    a.currentTime = 18; vi.advanceTimersByTime(40); expect(a.paused).toBe(true); expect(a.src).toBe("");
  });
  it("stalling does not consume a custom segment's playback duration", async () => {
    const { runtime, created } = engine({ mode: "custom", startTime: 5, duration: 3 });
    runtime.start(); await flush(); vi.advanceTimersByTime(10000); expect(created[0].paused).toBe(false); expect(created[0].currentTime).toBe(5);
  });
  it("invalid real metadata never plays an unvalidated custom segment", () => {
    const { runtime, created, error } = engine({ mode: "custom", startTime: 115, duration: 10 });
    runtime.start(); expect(created[0].play).not.toHaveBeenCalled(); expect(error).toHaveBeenCalled();
  });
  it("missing metadata rejects custom but allows full song", async () => {
    const bad = engine({ mode: "custom", startTime: 0, duration: 5 }, NaN); bad.runtime.start(); expect(bad.created[0].play).not.toHaveBeenCalled();
    const full = engine(FULL_SONG, NaN); full.runtime.start(); await flush(); expect(full.created[0].play).toHaveBeenCalled();
  });
  it("full birthday song is not cut at the old 35-second limit", async () => {
    const { runtime, created } = engine({ ...FULL_SONG, startAt: "experience" }, 120, "birthdaySong");
    runtime.start(); await flush(); created[0].currentTime = 50; vi.advanceTimersByTime(40); expect(created[0].paused).toBe(false);
  });
  it("loops only when selected", async () => {
    const { runtime, created } = engine({ mode: "loop" }); runtime.start(); await flush(); expect(created[0].loop).toBe(true);
    runtime.sceneChanged("giftReveal", ["intro", "giftReveal"]); expect(created[0].paused).toBe(false);
  });
  it("untilSceneEnds pauses on scene exit, including while metadata is pending", async () => {
    const { runtime, created } = engine({ mode: "untilSceneEnds", stopImmediately: true });
    runtime.start(); await flush(); runtime.sceneChanged("giftReveal", ["intro", "giftReveal"]); expect(created[0].paused).toBe(true);
  });
  it("scene stop fades then disposes the track", async () => {
    const { runtime, created } = engine({ mode: "loop", stopScene: "roseBloom", fadeOutDuration: 2 });
    runtime.start(); await flush(); runtime.sceneChanged("roseBloom", ["intro", "roseBloom"]);
    vi.advanceTimersByTime(1000); expect(created[0].volume).toBeCloseTo(0.175); expect(created[0].paused).toBe(false);
    vi.advanceTimersByTime(1100); expect(created[0].paused).toBe(true);
  });
  it("immediate stop overrides configured fade-out", async () => {
    const { runtime, created } = engine({ mode: "loop", stopScene: "roseBloom", fadeOutDuration: 5, stopImmediately: true });
    runtime.start(); await flush(); runtime.sceneChanged("roseBloom", ["intro", "roseBloom"]); expect(created[0].paused).toBe(true);
  });
  it("disabled scene targets never create audio", () => {
    const { runtime, created } = engine({ mode: "full", startAt: "scene", startScene: "notebook" });
    runtime.start(); runtime.sceneChanged("giftReveal", ["intro", "giftReveal"]); expect(created).toHaveLength(0);
  });
  it("starts once when its active scene is reached", async () => {
    const { runtime, created } = engine({ mode: "full", startAt: "scene", startScene: "roseBloom" });
    runtime.start(); expect(created).toHaveLength(0);
    runtime.sceneChanged("roseBloom", ["intro", "roseBloom"]); await flush(); expect(created).toHaveLength(1);
    runtime.sceneChanged("roseBloom", ["intro", "roseBloom"]); expect(created).toHaveLength(1);
  });
  it("mute pauses custom time, resume does not create duplicates, scene stop while muted still applies", async () => {
    const { runtime, created } = engine({ mode: "custom", startTime: 10, duration: 20, stopScene: "roseBloom" });
    runtime.start(); await flush(); created[0].currentTime = 15; runtime.mute(); vi.advanceTimersByTime(50000);
    expect(created[0].currentTime).toBe(15); expect(created[0].paused).toBe(true);
    runtime.start(); await flush(); expect(created).toHaveLength(1); expect(created[0].paused).toBe(false);
    runtime.mute(); runtime.sceneChanged("roseBloom", ["intro", "roseBloom"]); runtime.start(); expect(created).toHaveLength(1); expect(created[0].src).toBe("");
  });
  it("disposes all resources including late play promises", async () => {
    const { runtime, created } = engine({ mode: "loop" }); runtime.start(); runtime.dispose(); await flush();
    expect(created[0].paused).toBe(true); expect(created[0].src).toBe(""); expect(vi.getTimerCount()).toBe(0);
  });
});
