import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import BirthdayExperience from "@/BirthdayExperience";
import DashboardTopBar, { type DashboardTab } from "@/components/dashboard/DashboardTopBar";
import CustomizeForm from "@/components/dashboard/CustomizeForm";
import type { SurpriseRow } from "@/types/surprise";

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
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("preview");
  const [surprise, setSurprise] = useState<SurpriseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSurprise = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("surprises")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setLoading(false);
    if (error) {
      setLoadError("Couldn't load your surprise. Please try again.");
      return;
    }
    setSurprise(data as SurpriseRow);
  }, [user]);

  useEffect(() => {
    loadSurprise();
  }, [loadSurprise]);

  const handleShare = async () => {
    if (!surprise) return;
    const url = `${window.location.origin}/s/${surprise.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error(`Couldn't copy automatically. Here's your link: ${url}`);
    }
  };

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
      <div style={{ paddingTop: "calc(52px + env(safe-area-inset-top, 0px))" }}>
        {tab === "preview" ? (
          <BirthdayExperience config={surprise.config} />
        ) : (
          <div style={{ padding: "20px 16px 60px", position: "relative", zIndex: 5 }}>
            <CustomizeForm
              surprise={surprise}
              onSurpriseChange={setSurprise}
              onSaved={(updated) => {
                setSurprise(updated);
                setTab("preview");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
