/**
 * AUDIO SINGLETON
 * Module-level variables persist across React re-renders and page transitions.
 * There is exactly ONE background audio and ONE song audio in the entire app lifetime.
 */

import { useState, useCallback, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";

// ─── Module-level singletons ─────────────────────────────────────────────────
let _bgAudio:   HTMLAudioElement | null = null;
let _songAudio: HTMLAudioElement | null = null;
let _bgStarted  = false;   // has bg audio ever been created?
let _bgPlaying  = false;   // is it currently unpaused?
let _fadeTimer: ReturnType<typeof setInterval> | null = null;
// ─────────────────────────────────────────────────────────────────────────────

function clearFadeTimer() {
  if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null; }
}

function fadeTo(audio: HTMLAudioElement, target: number, ms = 1200, onDone?: () => void) {
  clearFadeTimer();
  const steps = Math.max(1, Math.round(ms / 40));
  const start = audio.volume;
  let i = 0;
  _fadeTimer = setInterval(() => {
    i++;
    audio.volume = Math.max(0, Math.min(1, start + (target - start) * (i / steps)));
    if (i >= steps) {
      clearFadeTimer();
      audio.volume = target;
      onDone?.();
    }
  }, 40);
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

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBackgroundMusic() {
  const config = useConfig();
  const [playing, setPlaying] = useState(_bgPlaying);

  const start = useCallback(() => {
    // Guard: never create more than one background audio
    if (_bgStarted) {
      if (_bgAudio && _bgAudio.paused) {
        _bgAudio.play().catch(() => {});
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
        fadeTo(audio, 0.35, 1800);
      })
      .catch(() => {
        // mp3 blocked — use Web Audio fallback
        _bgAudio = null;
        playBgTones();
        _bgPlaying = true;
        setPlaying(true);
      });
  }, [config.audio.backgroundMusic]);

  const stop = useCallback(() => {
    clearFadeTimer();
    if (_bgAudio) {
      const a = _bgAudio;
      fadeTo(a, 0, 700, () => { a.pause(); });
    }
    stopBgTones();
    _bgPlaying = false;
    setPlaying(false);
  }, []);

  const playCakeSong = useCallback(() => {
    // 1. Kill any existing song instance
    if (_songAudio) {
      _songAudio.pause();
      _songAudio.currentTime = 0;
      _songAudio = null;
    }

    // 2. Duck background music volume (keep it playing, just quieter)
    clearFadeTimer();
    if (_bgAudio) {
      fadeTo(_bgAudio, 0.06, 700);   // fade bg down to 6%
    }

    // 3. Play birthday song
    const song = new Audio(config.audio.birthdaySong);
    song.volume = 0;
    _songAudio = song;

    song.play()
      .then(() => { fadeTo(song, 0.8, 700); })
      .catch(() => {
        _songAudio = null;
        playHappyBirthdayFallback();
        // Restore bg volume after fallback tones (~8s)
        setTimeout(() => { if (_bgAudio) fadeTo(_bgAudio, 0.35, 1500); }, 8000);
      });

    // 4. When song ends → restore background to normal volume
    const handleEnd = () => {
      _songAudio = null;
      if (_bgAudio) fadeTo(_bgAudio, 0.35, 1500);  // fade bg back up
    };
    song.addEventListener("ended", handleEnd, { once: true });

    // 5. Safety: restore bg after 35s even if song never fires "ended"
    setTimeout(() => {
      if (_songAudio === song) {
        fadeTo(song, 0, 800, () => { song.pause(); _songAudio = null; });
      }
      if (_bgAudio) fadeTo(_bgAudio, 0.35, 1500);
    }, 35000);
  }, [config.audio.birthdaySong]);

  // Sync playing state on mount
  useEffect(() => { setPlaying(_bgPlaying); }, []);

  return { start, stop, playing, playCakeSong };
}

export default function MusicToggle({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={playing ? "Pause music" : "Play music"}
      aria-label={playing ? "Pause music" : "Play music"}
      style={{
        position: "fixed", bottom: "22px", right: "22px", zIndex: 600,
        width: "46px", height: "46px", borderRadius: "50%",
        border: `1px solid ${playing ? "rgba(236,72,153,0.55)" : "rgba(167,139,250,0.2)"}`,
        background: "rgba(12,3,28,0.85)", backdropFilter: "blur(16px)",
        color: "#d8b4fe", fontSize: "16px", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s ease",
        boxShadow: playing
          ? "0 0 22px rgba(236,72,153,0.4), inset 0 0 10px rgba(236,72,153,0.08)"
          : "0 2px 12px rgba(0,0,0,0.4)",
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
