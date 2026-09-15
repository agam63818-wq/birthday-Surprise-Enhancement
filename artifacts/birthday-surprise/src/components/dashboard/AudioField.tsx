import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { IconTextButton } from "@/components/dashboard/FormFields";
import { uploadAudio } from "@/lib/uploads";
import { SCENE_REGISTRY } from "@/lib/v2/registry";
import { SCENE_IDS } from "../../../supabase/functions/_shared/configPatch";
import { FULL_SONG, PLAYBACK_MODES, formatAudioTime, playbackError, validDuration, type AudioPlaybackSettings } from "../../../supabase/functions/_shared/audioPlayback";

/** Original upload slot, extended with metadata-aware playback controls. */
export default function AudioField({ label, value, onChange, userId, playback, onPlaybackChange, activeScenes = [], visible = true, disabled = false }: {
  label: string; value: string; onChange: (url: string) => void; userId: string;
  playback?: AudioPlaybackSettings;
  onPlaybackChange?: (settings: AudioPlaybackSettings, actualDuration?: number) => Promise<void>;
  activeScenes?: readonly string[];
  visible?: boolean;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<{ source: string; duration?: number; failed?: boolean }>({ source: value });
  const [retry, setRetry] = useState(0);
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const pending = useRef(false);
  const alive = useRef(true);
  const preview = useRef<HTMLAudioElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const settings = playback ?? FULL_SONG;
  const duration = metadata.source === value ? metadata.duration : undefined;
  const known = validDuration(duration);
  const invalid = playbackError(settings, SCENE_IDS, duration);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    setMetadata({ source: value }); setNumbers({}); setError(""); setStatus("");
    if (!visible || !value) return;
    const timer = setTimeout(() => setMetadata(m => m.source === value && !validDuration(m.duration) ? { source: value, failed: true } : m), 12000);
    return () => { clearTimeout(timer); preview.current?.pause(); };
  }, [value, visible, retry]);
  useEffect(() => { setNumbers({}); }, [playback]);
  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try { const url = await uploadAudio(userId, file); if (alive.current) onChange(url); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Audio upload failed."); }
    finally { if (alive.current) setUploading(false); if (fileInput.current) fileInput.current.value = ""; }
  };
  const commit = async (next: AudioPlaybackSettings) => {
    if (!onPlaybackChange || pending.current || disabled) return;
    const message = playbackError(next, SCENE_IDS, duration);
    if (message || (next.mode === "custom" && !known)) { setError(message ?? "Wait for audio metadata before saving custom timing."); return; }
    preview.current?.pause(); pending.current = true; setSaving(true); setError(""); setStatus("Saving playback…");
    try { await onPlaybackChange(next, duration); if (alive.current) setStatus("Playback saved"); }
    catch (err) { if (alive.current) { setError(err instanceof Error ? err.message : "Playback could not be saved. Please retry."); setStatus("Not saved"); } }
    finally { pending.current = false; if (alive.current) setSaving(false); }
  };
  const updateNumber = (key: "startTime" | "duration" | "fadeInDuration" | "fadeOutDuration", raw: string) => {
    if (raw.trim() === "" || !Number.isFinite(Number(raw))) { setError("Enter a valid number of seconds."); return; }
    const number = Number(raw);
    const next = { ...settings, [key]: number };
    if (key === "startTime" && known && number >= 0 && number < duration && (next.duration ?? 0) > duration - number) next.duration = Math.floor((duration - number) * 1000) / 1000;
    void commit(next);
  };
  const numeric = (title: string, key: "startTime" | "duration" | "fadeInDuration" | "fadeOutDuration", max?: number) => <label>{title}<input aria-label={`${label} ${title}`} type="number" min={key === "duration" ? 0.001 : 0} max={max} step="0.1" value={numbers[key] ?? String(settings[key] ?? 0)} onChange={e => { setNumbers(n => ({ ...n, [key]: e.target.value })); setStatus("Editing — saves when you leave the field"); }} onBlur={e => { if (e.target.value !== String(settings[key] ?? 0)) updateNumber(key, e.target.value); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label>;
  const unavailableScene = (settings.startAt === "scene" && !activeScenes.includes(settings.startScene!)) || (settings.stopScene && !activeScenes.includes(settings.stopScene));
  return <section className="music-control-card" aria-label={`${label} controls`}>
    <header><h3>{label}</h3><span className="music-duration">{known ? formatAudioTime(duration) : value ? "Duration unavailable" : "No track"}</span></header>
    <div className="music-upload-row">
      {uploading ? <Spinner className="size-5" /> : value && visible ? <audio key={`${value}:${retry}`} ref={preview} aria-label={`${label} preview`} controls preload="metadata" src={value} onLoadedMetadata={e => setMetadata({ source: value, duration: validDuration(e.currentTarget.duration) ? e.currentTarget.duration : undefined, failed: !validDuration(e.currentTarget.duration) })} onDurationChange={e => { if (validDuration(e.currentTarget.duration)) setMetadata({ source: value, duration: e.currentTarget.duration }); }} onError={() => setMetadata({ source: value, failed: true })} /> : <span>{value ? "Open Music to preview" : "No audio set"}</span>}
      <input ref={fileInput} aria-label={`Upload ${label}`} type="file" accept="audio/*" hidden onChange={e => void handleFileChange(e.target.files?.[0])} />
      <fieldset disabled={uploading || saving || disabled}><IconTextButton onClick={() => fileInput.current?.click()}>{value ? "Replace" : "Upload"}</IconTextButton></fieldset>
    </div>
    <p className="music-help">Up to 10MB. Preview player auditions the file; the recipient experience uses your playback settings.</p>
    {onPlaybackChange && value && <>
      <fieldset disabled={uploading || saving || disabled} className="music-settings">
        <label>Playback Mode<select aria-label={`${label} Playback Mode`} value={settings.mode} onChange={e => {
          const mode = e.target.value as AudioPlaybackSettings["mode"];
          const next = { ...settings, mode };
          if (mode === "custom" && known && (next.startTime === undefined || next.duration === undefined || playbackError(next, SCENE_IDS, duration))) { next.startTime = 0; next.duration = Math.floor(duration * 1000) / 1000; }
          void commit(next);
        }}>{PLAYBACK_MODES.map(mode => <option key={mode} value={mode} disabled={mode === "custom" && !known}>{({ full: "Full Song", custom: "Custom segment", untilSceneEnds: "Until scene ends", loop: "Loop" })[mode]}</option>)}</select></label>
        {settings.mode === "custom" && <><div className="music-grid">{numeric("Start Time (seconds)", "startTime", duration)}{numeric("Play Duration (seconds)", "duration", known ? Math.max(0, duration - (settings.startTime ?? 0)) : undefined)}</div><p className="music-end">Calculated end: <strong>{formatAudioTime((settings.startTime ?? 0) + (settings.duration ?? 0))}</strong>{known && ` / ${formatAudioTime(duration)}`}</p></>}
        <div className="music-grid">{numeric("Fade In (seconds)", "fadeInDuration", 60)}{numeric("Fade Out (seconds)", "fadeOutDuration", 60)}</div>
        <label className="music-checkbox"><input type="checkbox" checked={settings.stopImmediately ?? false} onChange={e => void commit({ ...settings, stopImmediately: e.target.checked })} />Stop immediately (skip fade-out)</label>
        <label>Start playback<select aria-label={`${label} Start playback`} value={settings.startAt ?? "default"} onChange={e => {
          const startAt = e.target.value as AudioPlaybackSettings["startAt"];
          void commit({ ...settings, startAt, ...(startAt === "scene" ? { startScene: settings.startScene ?? activeScenes[0] } : {}) });
        }}><option value="default">Original trigger</option><option value="experience">Start with experience</option><option value="scene" disabled={!activeScenes.length}>Start at scene</option></select></label>
        {settings.startAt === "scene" && <label>Start scene<select aria-label={`${label} Start scene`} value={settings.startScene ?? ""} onChange={e => void commit({ ...settings, startScene: e.target.value })}>{SCENE_IDS.map(id => <option key={id} value={id}>{SCENE_REGISTRY[id].label}{activeScenes.includes(id) ? "" : " (disabled / not in sequence)"}</option>)}</select></label>}
        <label>Stop at scene<select aria-label={`${label} Stop at scene`} value={settings.stopScene ?? ""} onChange={e => { const next = { ...settings }; if (e.target.value) next.stopScene = e.target.value; else delete next.stopScene; void commit(next); }}><option value="">No scene stop</option>{SCENE_IDS.map(id => <option key={id} value={id}>{SCENE_REGISTRY[id].label}{activeScenes.includes(id) ? "" : " (disabled / not in sequence)"}</option>)}</select></label>
        <button type="button" onClick={() => { setNumbers({}); void commit({ ...FULL_SONG }); }}>Reset to Full Song</button>
      </fieldset>
      {!playback && <p className="music-help">Original playback is preserved until you change a control. Full Song plays once; Loop repeats.</p>}
      <p className="music-help">Starts after the recipient's first tap. Until scene ends stops when the scene that started this track is left. Fade-out finishes at the segment/song end, or follows a scene stop.</p>
      {unavailableScene && <p className="music-help">A selected scene is disabled or absent. Its audio trigger will not run. Settings are retained.</p>}
      {metadata.failed && <p className="music-help">Metadata could not be read. Full Song, Loop and scene controls remain available; Custom requires a known duration. <button type="button" onClick={() => setRetry(r => r + 1)}>Retry metadata</button></p>}
      {(error || invalid) && <p role="alert" className="music-error">{error || invalid}</p>}
      {error && !invalid && <button type="button" disabled={saving || disabled} onClick={() => void commit(settings)}>Retry playback save</button>}
      <p className="music-save-status" role="status">{status || "Playback controls save automatically"}</p>
    </>}
  </section>;
}
