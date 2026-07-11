import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";
import type { SurpriseRow } from "@/types/surprise";

// Dev-only stub paywall: unlocking flips `is_paid` directly via the
// Supabase client. Real payment collection (Razorpay) is not wired up yet.
//
// TODO: replace this stub with a real Razorpay checkout flow before
// launch — this currently unlocks customization without collecting any
// payment, which is only acceptable for local development/testing.
async function initiatePayment(surpriseId: string): Promise<void> {
  const { error } = await supabase
    .from("surprises")
    .update({ is_paid: true })
    .eq("id", surpriseId);
  if (error) throw new Error(error.message);
}

export default function PaywallLock({
  surprise,
  onUnlocked,
}: {
  surprise: SurpriseRow;
  onUnlocked: () => void;
}) {
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      await initiatePayment(surprise.id);
      toast.success("Unlocked! You can now customize your surprise.");
      onUnlocked();
    } catch {
      toast.error("Couldn't unlock customization. Please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "60vh" }}>
      {/* Blurred preview of what's behind the paywall */}
      <div
        aria-hidden="true"
        style={{ filter: "blur(6px)", opacity: 0.4, pointerEvents: "none", userSelect: "none", padding: "8px" }}
      >
        {["Name", "Landing page", "Intro message", "Cuteness meter", "Celebration", "Cake page", "Why you matter", "Our story", "Memory wall", "Before you leave", "Last note", "Audio"].map(
          (section) => (
            <div
              key={section}
              className="glass-card-dark"
              style={{ padding: "16px 20px", marginBottom: "12px" }}
            >
              <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.1rem", color: "var(--ink)" }}>
                {section}
              </div>
              <div style={{ height: "8px", width: "70%", background: "rgba(167,139,250,0.25)", borderRadius: "4px", marginTop: "10px" }} />
              <div style={{ height: "8px", width: "45%", background: "rgba(167,139,250,0.15)", borderRadius: "4px", marginTop: "8px" }} />
            </div>
          )
        )}
      </div>

      {/* Unlock card */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div className="glass-card-dark card-enter" style={{ maxWidth: "360px", width: "100%", padding: "36px 28px", textAlign: "center" }}>
          <p className="chip" style={{ marginBottom: "16px" }}>🔒 Locked</p>
          <h2
            className="font-serif"
            style={{
              fontSize: "1.6rem",
              marginBottom: "10px",
              background: "linear-gradient(135deg, #f9a8d4, #e879f9, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Unlock Customization
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "24px" }}>
            Pay ₹20 once to personalize every page — name, photos, messages, music, and more.
          </p>
          <Button className="w-full" size="lg" disabled={unlocking} onClick={handleUnlock}>
            {unlocking ? (
              <>
                <Spinner /> Unlocking…
              </>
            ) : (
              "Unlock for ₹20"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
