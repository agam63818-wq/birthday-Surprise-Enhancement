// Synthesised countdown cues — Web Audio only (no files, no URLs).
// ONE AudioContext per gate, created lazily on a user gesture, suspended when
// hidden/muted, closed on teardown. Each cue plays at most once per
// play-through, never early, never after dispose().
export type CountdownCue = "final3" | "final2" | "final1" | "reveal";

const MAX_GAIN = 0.22;

type Ctor = typeof AudioContext;
function audioCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class CountdownSound {
  private ctx: AudioContext | null = null;
  private played = new Set<CountdownCue>();
  private disposed = false;
  muted = true;
  /** Diagnostics: how many AudioContexts this instance ever created (must be <= 1). */
  createdContexts = 0;
  log: CountdownCue[] = [];

  /** Call ONLY from a user gesture handler. */
  enable(): boolean {
    if (this.disposed) return false;
    const C = audioCtor();
    if (!C) return false;
    try {
      if (!this.ctx) { this.ctx = new C(); this.createdContexts += 1; }
      void this.ctx.resume().catch(() => {});
      this.muted = false;
      return true;
    } catch {
      return false;
    }
  }

  mute() { this.muted = true; void this.ctx?.suspend().catch(() => {}); }

  /** Visibility handling: suspend while hidden, resume only if not muted. */
  setHidden(hidden: boolean) {
    if (!this.ctx || this.disposed) return;
    if (hidden || this.muted) void this.ctx.suspend().catch(() => {});
    else void this.ctx.resume().catch(() => {});
  }

  /** Reset the once-only memory for a fresh (owner preview) play-through. */
  resetPlaythrough() { this.played.clear(); }

  play(cue: CountdownCue) {
    if (this.disposed || this.played.has(cue)) return;
    this.played.add(cue);
    if (this.muted || !this.ctx || this.ctx.state === "closed") return;
    this.log.push(cue);
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const tone = (freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine", glideTo?: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, start);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(Math.min(MAX_GAIN, gain), start + Math.min(0.03, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(start); o.stop(start + dur + 0.02);
    };
    if (cue === "final3") tone(660, t, 0.18, 0.12, "triangle");
    else if (cue === "final2") tone(784, t, 0.18, 0.13, "triangle");
    else if (cue === "final1") { tone(392, t, 0.9, 0.08, "sine", 784); tone(988, t, 0.2, 0.12, "triangle"); }
    else {
      // Soft major-chord chime
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.06, 1.4 - i * 0.15, 0.1 - i * 0.015, "sine"));
    }
  }

  dispose() {
    this.disposed = true;
    const ctx = this.ctx; this.ctx = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
  }

  get state(): string { return this.disposed ? "disposed" : this.ctx?.state ?? "none"; }
}
