import { Eye, Wand2, Share2, LogIn, UserPlus } from "lucide-react";

// Fixed chrome bar shown on the public "/" route. Mirrors the visual style
// of DashboardTopBar (same dash-topbar / tab-pill / chrome-btn CSS classes)
// but exposes guest-facing actions instead of dashboard tabs.
//
// onClick handlers are intentionally left as console.log placeholders —
// real navigation/modal logic is wired up in Part 2.
export default function PublicTopBar({
  onCustomize,
  onShare,
  onLogin,
  onSignup,
}: {
  onCustomize?: () => void;
  onShare?: () => void;
  onLogin?: () => void;
  onSignup?: () => void;
}) {
  return (
    <div className="dash-topbar">
      {/* ── Left: brand + active "Preview" pill ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
        <span className="dash-brand">✦ Birthday Surprise</span>

        {/* Single non-interactive pill that shows the current view */}
        <div className="tab-group" role="tablist" aria-label="Current view">
          <button
            role="tab"
            aria-selected={true}
            className="tab-pill active"
            style={{ cursor: "default" }}
            tabIndex={-1}
          >
            <Eye size={14} aria-hidden="true" />
            Preview
          </button>
        </div>
      </div>

      {/* ── Right: action buttons ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => {
            console.log("[PublicTopBar] Customize clicked");
            onCustomize?.();
          }}
          aria-label="Customize your surprise"
          className="chrome-btn share"
        >
          <Wand2 size={14} aria-hidden="true" />
          <span className="label">Customize</span>
        </button>

        <button
          onClick={() => {
            console.log("[PublicTopBar] Share clicked");
            onShare?.();
          }}
          aria-label="Share this surprise"
          className="chrome-btn share"
        >
          <Share2 size={14} aria-hidden="true" />
          <span className="label">Share</span>
        </button>

        <button
          onClick={() => {
            console.log("[PublicTopBar] Log In clicked");
            onLogin?.();
          }}
          aria-label="Log in"
          className="chrome-btn logout"
        >
          <LogIn size={14} aria-hidden="true" />
          <span className="label">Log In</span>
        </button>

        <button
          onClick={() => {
            console.log("[PublicTopBar] Sign Up clicked");
            onSignup?.();
          }}
          aria-label="Sign up"
          className="chrome-btn share"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(190,24,93,0.25))",
            border: "1px solid rgba(124,58,237,0.45)",
            color: "#ddd6fe",
            boxShadow: "0 4px 18px rgba(124,58,237,0.22)",
          }}
        >
          <UserPlus size={14} aria-hidden="true" />
          <span className="label">Sign Up</span>
        </button>
      </div>
    </div>
  );
}
