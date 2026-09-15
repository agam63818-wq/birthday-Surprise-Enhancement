import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import BirthdayExperience from "@/BirthdayExperience";
import DashboardTopBar, { type DashboardTab } from "@/components/dashboard/DashboardTopBar";
import CustomizeForm from "@/components/dashboard/CustomizeForm";
import AIAssistantChat from "@/components/dashboard/AIAssistantChat";
import type { SurpriseConfig } from "@/lib/v2/schema";
import { playbackError, validDuration, type AudioTrackId, type AudioPlaybackSettings } from "../../../supabase/functions/_shared/audioPlayback";
import { SCENE_IDS } from "../../../supabase/functions/_shared/configPatch";
import { validateV2Config } from "../../../supabase/functions/_shared/configPatch";
import type { SurpriseRow } from "@/types/surprise";
import { usePageMeta } from "@/hooks/use-page-meta";

function FullScreenState({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "24px",
        position: "relative",
        zIndex: 5,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

// Real authenticated dashboard: fetches the caller's own row from
// `surprises` (exactly one per user, enforced by RLS + a signup trigger),
// and switches between a live Preview of their surprise and a Customize
// form gated behind the ₹20 paywall stub.
export default function Dashboard() {
  // Private/auth route: never indexed (also X-Robots-Tag via vercel.json).
  usePageMeta({ title: "Dashboard — Birthday Surprise", noindex: true });

  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("preview");
  const [surprise, setSurprise] = useState<SurpriseRow | null>(null);
  const [draft, setDraft] = useState<SurpriseConfig | null>(null);
  const [history, setHistory] = useState<{ before: SurpriseConfig; after: string } | null>(null);
  const config = draft ?? surprise?.config;
  const configRef = useRef(config);
  configRef.current = config;
  const savedRowRef = useRef(surprise);
  savedRowRef.current = surprise;
  const audioQueue = useRef<Promise<void>>(Promise.resolve());
  const [audioPending, setAudioPending] = useState(0);
  const saveAudioPlayback = (track: AudioTrackId, url: string, settings: AudioPlaybackSettings, actualDuration?: number): Promise<void> => {
    const validation = playbackError(settings, SCENE_IDS, actualDuration);
    if (validation || (settings.mode === "custom" && !validDuration(actualDuration))) return Promise.reject(new Error(validation ?? "Audio duration must be known for custom timing."));
    const current = configRef.current;
    if (!current || current.audio[track] !== url) return Promise.reject(new Error("The audio file changed. Please retry for the current track."));
    const next = { ...current, audio: { ...current.audio, playback: { ...current.audio.playback, [track]: settings } } };
    // This is the same canonical draft used by Customize, AI and Preview.
    configRef.current = next; setDraft(next); setHistory(null); setAudioPending(n => n + 1);
    const operation = audioQueue.current.catch(() => {}).then(async () => {
      const row = savedRowRef.current;
      if (!row || row.user_id !== user?.id || configRef.current?.audio[track] !== url) throw new Error("Audio or account changed. Your settings remain in the draft.");
      // Merge only the selected audio file + its controls over the SAVED config.
      // Never auto-publish unrelated draft text, photos, themes or scene changes.
      const savedConfig = { ...row.config, audio: { ...row.config.audio, [track]: url, playback: { ...row.config.audio.playback, [track]: settings } } };
      const audio_urls = [savedConfig.audio.backgroundMusic, savedConfig.audio.birthdaySong].filter(Boolean);
      let query = supabase.from("surprises").update({ config: savedConfig, audio_urls }).eq("id", row.id).eq("user_id", row.user_id);
      if (row.updated_at) query = query.eq("updated_at", row.updated_at);
      const { data, error } = await query.select().single();
      if (error || !data) throw new Error("Playback was not saved. Check your connection or reload if another tab saved newer changes. Your draft is retained.");
      savedRowRef.current = data as SurpriseRow;
      setSurprise(data as SurpriseRow);
    }).finally(() => setAudioPending(n => n - 1));
    audioQueue.current = operation;
    return operation;
  };
  const dirty = !!surprise && !!config && JSON.stringify(config) !== JSON.stringify(surprise.config);
  const canUndo = !!history && JSON.stringify(config) === history.after;
  const undoAI = () => {
    if (!history || !canUndo) { toast.error("Newer edits exist. Undo is blocked to protect them."); return; }
    setDraft(structuredClone(history.before)); setHistory(null);
    toast.success("AI change undone in draft. Save to update the shared experience.");
  };
  const applyAI = (next: SurpriseConfig, base: SurpriseConfig) => {
    if (JSON.stringify(configRef.current) !== JSON.stringify(base)) return false;
    validateV2Config(next);
    setHistory({ before: structuredClone(base), after: JSON.stringify(next) });
    setDraft(next); return true;
  };
  useEffect(() => {
    if (!surprise || !config) return;
    const key = `customize-draft:${surprise.id}`;
    try {
      if (dirty) localStorage.setItem(key, JSON.stringify({ base: JSON.stringify(surprise.config), config }));
      else localStorage.removeItem(key);
    } catch { /* Private mode/full storage: draft remains in memory. */ }
    const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [config, surprise, dirty]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const loadSurprise = useCallback(async () => {
    if (!user?.id) return;
    
    // Only set loading on initial load.
    // Subsequent calls update data in-place without remounting content.
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    setLoadError(null);
    
    const { data, error } = await supabase
      .from("surprises")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    hasLoadedOnce.current = true;
    setLoading(false);
    if (error) {
      setLoadError("Couldn't load your surprise. Please try again.");
      return;
    }
    const row = data as SurpriseRow;
    let restored = row.config;
    try {
      const saved = JSON.parse(localStorage.getItem(`customize-draft:${row.id}`) ?? "null");
      if (saved?.base === JSON.stringify(row.config) && saved?.config) {
        validateV2Config(saved.config); restored = saved.config;
        toast.info("Your unsaved draft has been restored.");
      } else if (saved) toast.info("An older draft was not restored because its saved version could not be verified.");
    } catch { /* Corrupt or invalid drafts never replace the saved config. */ }
    setSurprise(row); setDraft(restored); setHistory(null);
  }, [user?.id]);

  useEffect(() => {
    loadSurprise();
  }, [loadSurprise]);

  const handleShare = async () => {
    if (!surprise) return;
    if (dirty) { toast.info("Save your draft in Customize before sharing. Your link still shows the last saved version."); setTab("customize"); return; }
    const url = `${window.location.origin}/s/${surprise.slug}`;

    // Native share sheet on mobile (WhatsApp, Instagram, SMS, etc.)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A Birthday Surprise \ud83c\udf82",
          text: "I made something special for you\u2026 open it! \ud83d\udc9d",
          url,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // user closed the sheet
        // otherwise fall through to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error(`Couldn't copy automatically. Here's your link: ${url}`);
    }
  };

  // Handle the ?intent=... deep-link set by PublicHome after login/signup
  // (or by a logged-in user clicking Customize/Share on "/").
  //   intent=customize → open the Customize tab
  //   intent=share     → trigger the share sheet / copy once (stays on Preview,
  //                      since Share is an action, not a tab)
  // Runs only once per mount (guarded by handledIntentRef) and only after the
  // surprise has loaded. The URL is cleaned afterwards so refreshing
  // /dashboard doesn't re-trigger the action.
  const handledIntentRef = useRef(false);
  useEffect(() => {
    if (!surprise || handledIntentRef.current) return;
    const intent = new URLSearchParams(window.location.search).get("intent");
    if (!intent) return;
    handledIntentRef.current = true;

    if (intent === "customize") {
      setTab("customize");
    } else if (intent === "share") {
      handleShare();
    }

    // Clean the URL (keep the path, drop the query) so a refresh is safe.
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surprise]);

  if (loading) {
    return (
      <FullScreenState>
        <Spinner className="size-8" style={{ color: "var(--violet)" }} />
      </FullScreenState>
    );
  }

  if (loadError || !surprise || !config) {
    return (
      <FullScreenState>
        <p style={{ color: "var(--ink-soft)", maxWidth: "320px" }}>{loadError}</p>
        <Button onClick={loadSurprise}>Try again</Button>
        <Button variant="secondary" onClick={() => signOut()}>
          Log out
        </Button>
      </FullScreenState>
    );
  }

  return (
    <div>
      <DashboardTopBar
        tab={tab}
        onTabChange={setTab}
        onShare={handleShare}
        onLogout={() => signOut()}
      />
      <div style={{ paddingTop: "calc(56px + env(safe-area-inset-top, 0px))" }}>
        <div className="canonical-status" role="status"><span>{dirty ? "Unsaved draft · Preview includes your changes" : "Saved experience"}</span>
          {dirty && <button type="button" onClick={() => setTab("customize")}>Save in Customize</button>}
          {dirty && <button type="button" disabled={audioPending > 0} onClick={() => { if (window.confirm("Discard all unsaved changes?")) { setDraft(surprise.config); setHistory(null); } }}>Discard draft</button>}
          {history && <button type="button" disabled={!canUndo || audioPending > 0} title={canUndo ? "Restore the exact pre-AI draft" : "Undo blocked because newer changes exist"} onClick={undoAI}>Undo last AI change</button>}
        </div>
        {tab === "preview" ? (
          <BirthdayExperience config={config} />
        ) : tab === "customize" ? (
          <div
            style={{
              padding: "24px 16px 72px",
              position: "relative",
              zIndex: 5,
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            <CustomizeForm
              surprise={surprise}
              config={config}
              onConfigChange={setDraft}
              onAudioPlaybackSave={saveAudioPlayback}
              audioSaving={audioPending > 0}
              onSurpriseChange={setSurprise}
              onSaved={(updated) => {
                setSurprise(updated);
                savedRowRef.current = updated;
                setDraft(current => JSON.stringify(current) === JSON.stringify(config) ? updated.config : current);
                setTab("preview");
              }}
            />
          </div>
        ) : (
          <div
            style={{
              padding: "24px 16px 72px",
              position: "relative",
              zIndex: 5,
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            <AIAssistantChat
              surprise={{ ...surprise, config }}
              onApply={applyAI}
              onSwitchToCustomize={() => setTab("customize")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
