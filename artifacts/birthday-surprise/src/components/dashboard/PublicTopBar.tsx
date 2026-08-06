import { Eye, Wand2, Share2, LogIn, UserPlus, LayoutDashboard, LogOut } from "lucide-react";

// Fixed chrome bar shown on the public "/" route. Mirrors the visual style
// of DashboardTopBar (same dash-topbar / tab-pill / chrome-btn CSS classes)
// but exposes guest-facing actions instead of dashboard tabs.
//
// When `isLoggedIn` is true the Log In / Sign Up buttons are replaced with
// Dashboard and Log Out buttons — all navigation/modal logic is wired in
// PublicHome so this component stays purely presentational.
export default function PublicTopBar({
  onCustomize,
  onShare,
  onLogin,
  onSignup,
  onDashboard,
  onLogout,
  isLoggedIn = false,
}: {
  onCustomize?: () => void;
  onShare?: () => void;
  /** Guest only — open the login modal */
  onLogin?: () => void;
  /** Guest only — open the signup modal */
  onSignup?: () => void;
  /** Logged-in only — navigate to /dashboard */
  onDashboard?: () => void;
  /** Logged-in only — sign out */
  onLogout?: () => void;
  isLoggedIn?: boolean;
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
          onClick={onCustomize}
          aria-label="Customize your surprise"
          className="chrome-btn share"
        >
          <Wand2 size={14} aria-hidden="true" />
          <span className="label">Customize</span>
        </button>

        <button
          onClick={onShare}
          aria-label="Share this surprise"
          className="chrome-btn share"
        >
          <Share2 size={14} aria-hidden="true" />
          <span className="label">Share</span>
        </button>

        {isLoggedIn ? (
          <>
            <button
              onClick={onDashboard}
              aria-label="Go to dashboard"
              className="chrome-btn share"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(190,24,93,0.25))",
                border: "1px solid rgba(124,58,237,0.45)",
                color: "#ddd6fe",
                boxShadow: "0 4px 18px rgba(124,58,237,0.22)",
              }}
            >
              <LayoutDashboard size={14} aria-hidden="true" />
              <span className="label">Dashboard</span>
            </button>

            <button
              onClick={onLogout}
              aria-label="Log out"
              className="chrome-btn logout"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="label">Log Out</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onLogin}
              aria-label="Log in"
              className="chrome-btn logout"
            >
              <LogIn size={14} aria-hidden="true" />
              <span className="label">Log In</span>
            </button>

            <button
              onClick={onSignup}
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
          </>
        )}
      </div>
    </div>
  );
}
