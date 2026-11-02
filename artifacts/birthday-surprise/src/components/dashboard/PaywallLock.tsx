import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { TeddySVGOnly } from "@/components/Teddy";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { SurpriseRow } from "@/types/surprise";
import type { RazorpaySuccessResponse } from "@/types/razorpay";
import { formatPrice } from "@/lib/pricing";
import { startUnlockPayment, UNLOCK_ERRORS } from "@/lib/payments/unlockPayment";

// Real Razorpay checkout flow (see src/lib/payments/unlockPayment.ts):
// 1. Ask our own Edge Function to create a Razorpay order (server-side,
//    using the secret key — never exposed here). The SERVER decides the amount.
// 2. Price guard: only open Checkout if the order matches the displayed
//    price (PRICE_PAISE / INR) — never charge a different amount.
// 3. Open Razorpay's Checkout with that order.
// 4. On successful payment, send the payment id/signature to another
//    Edge Function which verifies the signature server-side and only
//    THEN flips is_paid = true. The client never sets is_paid directly.
function initiatePayment(userEmail: string | undefined): Promise<void> {
  return startUnlockPayment(
    {
      invoke: (fn, options) => supabase.functions.invoke(fn, options),
      openCheckout: (opts) => {
        const razorpay = new window.Razorpay({
          key: opts.key,
          amount: opts.amount,
          currency: opts.currency,
          order_id: opts.order_id,
          name: "Birthday Surprise",
          description: "Unlock customization",
          prefill: opts.email ? { email: opts.email } : undefined,
          theme: { color: "#a78bfa" },
          handler: (response: RazorpaySuccessResponse) => opts.onSuccess(response),
          modal: {
            // User closed the popup without paying — not an error.
            ondismiss: opts.onDismiss,
          },
        });
        razorpay.open();
      },
    },
    userEmail,
  );
}

const FEATURES = [
  "💝 Personalize all 10 pages",
  "📸 Upload your own photos",
  "🎵 Add your special songs",
  "🔗 Share with a private link",
];

export default function PaywallLock({
  surprise,
  onUnlocked,
}: {
  surprise: SurpriseRow;
  onUnlocked: () => void;
}) {
  const { user } = useAuth();
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      await initiatePayment(user?.email);
      toast.success("Unlocked! You can now customize your surprise.");
      onUnlocked();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === UNLOCK_ERRORS.dismissed) {
        // Popup closed without paying — silent, not an error.
      } else if (message === UNLOCK_ERRORS.priceMismatch) {
        // Server order did not match the displayed price: checkout was NOT
        // opened and nothing was charged. Button stays usable for retry.
        toast.error("We're updating our price — please refresh in a minute and try again.");
      } else if (message === UNLOCK_ERRORS.verificationFailed) {
        toast.error(
          "Payment could not be verified. If money was deducted, it will be refunded automatically — please contact support.",
        );
      } else {
        toast.error("Couldn't unlock customization. Please try again.");
      }
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "70vh" }}>
      {/* Blurred preview of what's behind the paywall */}
      <div
        aria-hidden="true"
        style={{ filter: "blur(6px)", opacity: 0.35, pointerEvents: "none", userSelect: "none", padding: "8px" }}
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
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "28px 16px",
        }}
      >
        <div className="auth-card-frame card-enter" style={{ maxWidth: "380px", width: "100%", position: "sticky", top: "calc(76px + env(safe-area-inset-top, 0px))" }}>
          <div className="glass-card-dark" style={{ borderRadius: "27px", padding: "28px 24px 30px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
              <TeddySVGOnly size={90} animate="float" />
            </div>

            <p className="chip" style={{ marginBottom: "14px" }}>🔒 Locked</p>

            <h2
              className="font-serif"
              style={{
                fontSize: "1.7rem",
                marginBottom: "8px",
                background: "var(--grad-brand)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Unlock Customization
            </h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "20px" }}>
              Make every page truly theirs — one tiny payment, endless smiles.
            </p>

            {/* What you get */}
            <div style={{ textAlign: "left", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {FEATURES.map((f) => (
                <div
                  key={f}
                  style={{
                    padding: "9px 12px",
                    borderRadius: "12px",
                    background: "rgba(167,139,250,0.07)",
                    border: "1px solid rgba(167,139,250,0.14)",
                    color: "var(--ink)",
                    fontSize: "0.85rem",
                  }}
                >
                  {f}
                </div>
              ))}
            </div>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "8px", marginBottom: "18px" }}>
              <span
                className="font-serif"
                style={{
                  fontSize: "2.4rem",
                  fontWeight: 700,
                  background: "var(--grad-brand)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {formatPrice()}
              </span>
              <span style={{ color: "var(--ink-soft)", fontSize: "0.78rem" }}>one-time · yours forever</span>
            </div>

            <button className="btn-auth-submit" disabled={unlocking} onClick={handleUnlock}>
              {unlocking ? (
                <>
                  <Spinner /> Unlocking…
                </>
              ) : (
                <>✨ Unlock for {formatPrice()}</>
              )}
            </button>

            <p style={{ color: "var(--ink-soft)", fontSize: "0.72rem", marginTop: "12px", opacity: 0.8 }}>
              Secure & instant · no subscription
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
