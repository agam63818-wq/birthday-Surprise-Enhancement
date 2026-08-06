/**
 * AUDIO SINGLETON — TWO-SONG CINEMATIC MUSIC SYSTEM
 * Module-level variables persist across React re-renders and page transitions.
 * There is exactly ONE background audio (Song 1) and ONE celebration song
 * (Song 2) in the entire app lifetime.
 *
 * Song 1 (config.audio.backgroundMusic): soft romantic ambient soundtrack.
 * Starts on the first user interaction (the \"Open It\" tap — never autoplay)
 * with a gentle fade-in, and loops through the experience.
 *
 * Song 2 (config.audio.birthdaySong): powerful celebratory track triggered
 * at the cake-cutting moment. Song 1 crossfades down while Song 2 fades up
 * (they overlap — no hard cut). Song 2 owns the climax; when it ends, the
 * experience fades smoothly back to Song 1.
 *
 * config.audio.useFallbackTones: when true (default), Web Audio tones are
 * used if the real files fail to play; when false, audio fails silently.
 */

import { useState, useCallback, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";

// ─── Module-level singletons ───────────────────────────────────────
let _bgAudio:   HTMLAudioElement | null = null;
let _songAudio: HTMLAudioElement | null = null;
let _bgStarted  = false;   // has bg audio ever been created?
let _bgPlaying  = false;   // is it currently unpaused?

// Per-audio fade timers — lets two fades run at the same time so the
// Song 1 → Song 2 handover is a true overlapping crossfade, not a cut.
const _fadeTimers = new Map<HTMLAudioElement, ReturnType<typeof setInterval>>();

// Volume levels (Song 1 stays ambient; Song 2 owns the climax)
const BG_VOL = 0.35;
const BG_DUCK = 0.04;
const SONG_VOL = 0.8;
// ─────────────────────────────────────────────────────────────────────

function clearFade(audio: HTMLAudioElement) {
  const t = _fadeTimers.get(audio);
  if (t) { clearInterval(t); _fadeTimers.delete(audio); }
}

function fadeTo(audio: HTMLAudioElement, target: number, ms = 1200, onDone?: () => void) {
  clearFade(audio);
  const steps = Math.max(1, Math.round(ms / 40));
  const start = audio.volume;
  let i = 0;
  const timer = setInterval(() => {
    i++;
    audio.volume = Math.max(0, Math.min(1, start + (target - start) * (i / steps)));
    if (i >= steps) {
      clearFade(audio);
      audio.volume = target;
      onDone?.();
    }
  }, 40);
  _fadeTimers.set(audio, timer);
}

function playHappyBirthdayFallback() {
  try {
    const ctx = new AudioContext();
    const notes = [261, 261, 293, 261, 349, 329, 261, 261, 293, 261, 392, 349];
    const durs  = [0.3, 0.15, 0.4, 0.4, 0.4, 0.8, 0.3, 0.15, 0.4, 0.4, 0.4, 0.8];
    let t = ctx.currentTime + 0.1;
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + durs[i]);
      o.start(t); o.stop(t + durs[i]);
      t += durs[i] + 0.04;
    });
  } catch {}
}

// Fallback piano loop for background (Web Audio API)
let _fallbackCtx: AudioContext | null = null;
let _fallbackLoop: ReturnType<typeof setInterval> | null = null;

function playBgTones() {
  if (_fallbackCtx) return;
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain(); master.gain.value = 0.08; master.connect(ctx.destination);
    _fallbackCtx = ctx;
    const notes = [261, 294, 329, 349, 392, 349, 329, 294, 261, 261, 294, 349, 392, 440, 392, 349];
    const playSet = (t0: number) => {
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.connect(g); g.connect(master);
        osc.type = "sine"; osc.frequency.value = freq;
        const t = t0 + i * 0.85;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
        osc.start(t); osc.stop(t + 0.85);
      });
    };
    playSet(ctx.currentTime + 0.1);
    _fallbackLoop = setInterval(() => {
      if (_fallbackCtx?.state === "running") playSet(_fallbackCtx.currentTime + 0.05);
    }, 14000);
  } catch {}
}

function stopBgTones() {
  if (_fallbackLoop) { clearInterval(_fallbackLoop); _fallbackLoop = null; }
  _fallbackCtx?.close().catch(() => {});
  _fallbackCtx = null;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useBackgroundMusic() {
  const config = useConfig();
  const [playing, setPlaying] = useState(_bgPlaying);
  const fallbackAllowed = config.audio.useFallbackTones !== false;

  const start = useCallback(() => {
    // Guard: never create more than one background audio
    if (_bgStarted) {
      if (_bgAudio && _bgAudio.paused) {
        _bgAudio.play().catch(() => {});
        // Restore volume gently (it was faded to 0 by stop())
        fadeTo(_bgAudio, BG_VOL, 900);
        _bgPlaying = true;
        setPlaying(true);
      }
      return;
    }
    _bgStarted = true;

    const audio = new Audio(config.audio.backgroundMusic);
    audio.loop = true;
    audio.volume = 0;
    _bgAudio = audio;

    audio.play()
      .then(() => {
        _bgPlaying = true;
        setPlaying(true);
        fadeTo(audio, BG_VOL, 1800); // gentle fade-in for Song 1
      })
      .catch(() => {
        // mp3 blocked/missing — Web Audio fallback only if allowed
        _bgAudio = null;
        if (fallbackAllowed) {
          playBgTones();
          _bgPlaying = true;
          setPlaying(true);
        } else {
          _bgPlaying = false;
          setPlaying(false);
        }
      });
  }, [config.audio.backgroundMusic, fallbackAllowed]);

  const stop = useCallback(() => {
    if (_bgAudio) {
      const a = _bgAudio;
      fadeTo(a, 0, 700, () => { a.pause(); });
    }
    if (_songAudio) {
      const s = _songAudio;
      _songAudio = null;
      fadeTo(s, 0, 500, () => { s.pause(); });
    }
    stopBgTones();
    _bgPlaying = false;
    setPlaying(false);
  }, []);

  const playCakeSong = useCallback(() => {
    // 1. Kill any existing song instance
    if (_songAudio) {
      clearFade(_songAudio);
      _songAudio.pause();
      _songAudio.currentTime = 0;
      _songAudio = null;
    }

    // 2. Crossfade: Song 1 eases down while Song 2 fades up — both
    //    briefly overlap (per-audio fade timers make this possible).
    if (_bgAudio) fadeTo(_bgAudio, BG_DUCK, 1400);

    // 3. Play the celebration song (Song 2)
    const song = new Audio(config.audio.birthdaySong);
    song.volume = 0;
    _songAudio = song;

    song.play()
      .then(() => { fadeTo(song, SONG_VOL, 1400); })
      .catch(() => {
        _songAudio = null;
        if (fallbackAllowed) {
          playHappyBirthdayFallback();
          // Restore bg volume after fallback tones (~8s)
          setTimeout(() => { if (_bgAudio) fadeTo(_bgAudio, BG_VOL, 2200); }, 8000);
        } else if (_bgAudio) {
          fadeTo(_bgAudio, BG_VOL, 1500);
        }
      });

    // 4. Song 2 owns the climax; when it ends → fade back to Song 1
    const handleEnd = () => {
      _songAudio = null;
      if (_bgAudio) fadeTo(_bgAudio, BG_VOL, 2200);
    };
    song.addEventListener("ended", handleEnd, { once: true });

    // 5. Safety: hand back to Song 1 after 35s even if \"ended\" never fires
    setTimeout(() => {
      if (_songAudio === song) {
        fadeTo(song, 0, 1500, () => { song.pause(); _songAudio = null; });
      }
      if (_bgAudio) fadeTo(_bgAudio, BG_VOL, 2200);
    }, 35000);
  }, [config.audio.birthdaySong, fallbackAllowed]);

  // Sync playing state on mount
  useEffect(() => { setPlaying(_bgPlaying); }, []);

  // Fix H: recover music after the page is backgrounded and resumed.
  // Mobile browsers may pause audio when the tab is hidden; resume it
  // when the page becomes visible again (only if we were playing).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && _bgPlaying && _bgAudio && _bgAudio.paused) {
        _bgAudio.play().catch(() => {
          // If resume fails (e.g. audio context suspended), fall back to tones
          if (fallbackAllowed) playBgTones();
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fallbackAllowed]);

  return { start, stop, playing, playCakeSong };
}

/**
 * Floating music control — persistent glass/glow mute-unmute button,
 * styled with the Part 1 token treatment.
 */
export default function MusicToggle({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={playing ? "Mute music" : "Play music"}
      aria-label={playing ? "Mute music" : "Play music"}
      style={{
        position: "fixed",
        bottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
        right: "22px",
        zIndex: 600,
        width: "48px", height: "48px", borderRadius: "50%",
        border: `1px solid ${playing ? "rgba(236,72,153,0.55)" : "rgba(167,139,250,0.25)"}`,
        background: "linear-gradient(165deg, rgba(20,7,48,0.88), rgba(8,2,24,0.82))",
        backdropFilter: "blur(var(--blur-soft)) saturate(1.25)",
        WebkitBackdropFilter: "blur(var(--blur-soft)) saturate(1.25)",
        color: "#d8b4fe", fontSize: "16px", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition:
          "transform var(--dur-base) var(--ease-smooth), box-shadow var(--dur-base) var(--ease-smooth), border-color var(--dur-base) ease",
        boxShadow: playing
          ? "var(--glow-soft), 0 8px 24px rgba(0,0,0,0.45)"
          : "var(--shadow-soft)",
        animation: playing ? "btn-pulse 3s ease-in-out infinite" : undefined,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    >
      {playing
        ? <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        : <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
      }
    </button>
  );
}
