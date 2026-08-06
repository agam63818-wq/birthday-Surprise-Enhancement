import { X, Lock } from "lucide-react";

// Small centered modal shown when a guest tries to use a feature that
// requires authentication (Customize, Share). Offers two paths:
//   • "Log In"  → opens AuthModal in login mode
//   • "Sign Up" → opens AuthModal in signup mode
//
// Reuses the same overlay/backdrop pattern as SurprisePopup.tsx and the
// glass-card-dark / page-enter CSS classes from the design system.

interface LoginRequiredModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

export default function LoginRequiredModal({
  open,
  onClose,
  onLogin,
  onSignup,
}: LoginRequiredModalProps) {
  if (!open) return null;

  return (
    /* Backdrop — click outside to close */
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Login required"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(6,1,24,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "fade-in-up 0.3s ease",
      }}
    >
      {/* Card — stop propagation so clicks inside don't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card-dark page-enter"
        style={{
          borderRadius: "24px",
          padding: "36px 32px 32px",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
          position: "relative",
          boxShadow:
            "0 0 60px rgba(236,72,153,0.2), 0 20px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "rgba(167,139,250,0.1)",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--ink-soft)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(244,63,94,0.15)";
            (e.currentTarget as HTMLElement).style.color = "#fda4af";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(167,139,250,0.1)";
            (e.currentTarget as HTMLElement).style.color = "var(--ink-soft)";
          }}
        >
          <X size={14} />
        </button>

        {/* Lock icon */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(190,24,93,0.2))",
            border: "1px solid rgba(167,139,250,0.3)",
            marginBottom: "18px",
            boxShadow: "0 0 24px rgba(124,58,237,0.25)",
          }}
        >
          <Lock size={22} color="#c084fc" />
        </div>

        {/* Title */}
        <h2
          className="font-serif"
          style={{
            fontSize: "1.55rem",
            background: "var(--grad-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "10px",
            lineHeight: 1.25,
          }}
        >
          Login Required 💗
        </h2>

        {/* Subtitle */}
        <p
          style={{
            color: "var(--ink-soft)",
            fontSize: "0.88rem",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          Please login or create an account to continue.
        </p>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexDirection: "column",
          }}
        >
          {/* Sign Up — gradient primary */}
          <button
            onClick={onSignup}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #be185d)",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(124,58,237,0.4)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 6px 24px rgba(124,58,237,0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 18px rgba(124,58,237,0.4)";
            }}
          >
            Sign Up
          </button>

          {/* Log In — secondary */}
          <button
            onClick={onLogin}
            style={{
              width: "100%",
              padding: "11px 20px",
              borderRadius: "999px",
              border: "1px solid rgba(167,139,250,0.35)",
              background: "rgba(167,139,250,0.08)",
              color: "var(--ink-soft)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(167,139,250,0.16)";
              (e.currentTarget as HTMLElement).style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(167,139,250,0.08)";
              (e.currentTarget as HTMLElement).style.color = "var(--ink-soft)";
            }}
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
