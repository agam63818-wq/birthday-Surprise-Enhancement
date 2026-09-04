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
    setSurprise(data as SurpriseRow);
  }, [user?.id]);

  useEffect(() => {
    loadSurprise();
  }, [loadSurprise]);

  const handleShare = async () => {
    if (!surprise) return;
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

  if (loadError || !surprise) {
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
        {tab === "preview" ? (
          <BirthdayExperience config={surprise.config} />
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
              onSurpriseChange={setSurprise}
              onSaved={(updated) => {
                setSurprise(updated);
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
              surprise={surprise}
              onSurpriseChange={setSurprise}
              onSwitchToCustomize={() => setTab("customize")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
