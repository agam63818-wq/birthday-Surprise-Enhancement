// One scheduler per gate. A tiny external store consumed with
// useSyncExternalStore so the second-by-second digits re-render without
// re-rendering the whole gate (the gate subscribes to `stage` only).
import { msUntilNextBoundary, stageAt, type CountdownStage } from "./engine";

export interface TickSnapshot { sec: number; stage: CountdownStage; unlockAtMs: number }

export interface NowSource { now(): number }

export class CountdownTicker {
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private raf: number | null = null;
  private snap: TickSnapshot;
  private running = false;

  constructor(private clock: NowSource, private unlockAtMs: number) {
    this.snap = this.compute();
  }

  private compute(): TickSnapshot {
    const now = this.clock.now();
    return { sec: Math.max(0, Math.ceil((this.unlockAtMs - now) / 1000)), stage: stageAt(this.unlockAtMs, now), unlockAtMs: this.unlockAtMs };
  }

  getSnapshot = (): TickSnapshot => this.snap;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  private emit() {
    const next = this.compute();
    if (next.sec !== this.snap.sec || next.stage !== this.snap.stage || next.unlockAtMs !== this.snap.unlockAtMs) {
      this.snap = next;
      this.listeners.forEach(l => l());
    }
  }

  private loop = () => {
    this.timer = null; this.raf = null;
    if (!this.running) return;
    this.emit();
    if (this.snap.stage === "unlocked") return; // done — no more ticks
    const now = this.clock.now();
    const left = this.unlockAtMs - now;
    // rAF in the final seconds (frame-accurate numerals), aligned timeouts otherwise.
    if (left <= 3500 && left > -1500 && typeof requestAnimationFrame === "function" && !document.hidden) {
      this.raf = requestAnimationFrame(this.loop);
    } else {
      this.timer = setTimeout(this.loop, Math.min(msUntilNextBoundary(this.unlockAtMs, now) + 4, 1000));
    }
  };

  start() { if (this.running) return; this.running = true; this.loop(); }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.raf !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.raf);
    this.timer = null; this.raf = null;
  }

  /** Recompute immediately (visibility return, clock resync, focus). */
  resync() {
    if (!this.running) { this.emit(); return; }
    this.stop(); this.running = true; this.loop();
  }

  setUnlock(ms: number) {
    if (ms === this.unlockAtMs) return;
    this.unlockAtMs = ms;
    this.resync();
  }

  get unlockAt() { return this.unlockAtMs; }
}
