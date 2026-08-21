import {
  Eye,
  Wand2,
  Share2,
  LogIn,
  UserPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useTopBarMenu } from "./useTopBarMenu";

// Fixed chrome bar shown on the public "/" route. Mirrors the visual style
// of DashboardTopBar (same dash-topbar / tab-pill / chrome-btn CSS classes)
// but exposes guest-facing actions instead of dashboard tabs.
//
// When `isLoggedIn` is true the Log In / Sign Up buttons are replaced with
// Dashboard and Log Out buttons — all navigation/modal logic is wired in
// PublicHome so this component stays purely presentational.
//
// Responsive behaviour (see `.public-topbar` rules in index.css):
//   • > 640px — unchanged: brand hidden by the shared rule, Preview pill on
//     the left, the full action button row on the right.
//   • ≤ 640px — the action row + Preview pill collapse into a hamburger menu
//     so nothing overlaps at narrow widths (the old ~420px bug where
//     "Customize" sat on top of the "Preview" pill). The brand mark is shown
//     again next to the hamburger, matching the mobile reference design.
//
// The open/close behaviour lives in useTopBarMenu so DashboardTopBar
// collapses through exactly the same mechanism.
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
  // Wraps the hamburger button + dropdown panel so a single ref covers both
  // and clicks inside the menu don't count as "outside".
  const { open: menuOpen, setOpen: setMenuOpen, menuRef, runAndClose } =
    useTopBarMenu();

  return (
    <div className="dash-topbar public-topbar">
      {/* ── Left: brand + active "Preview" pill ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
        <span className="dash-brand">✦ Birthday Surprise</span>

        {/* Single non-interactive pill that shows the current view.
            Hidden ≤640px — the dropdown carries the "Preview" row instead. */}
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

      {/* ── Right: action buttons (desktop) ──
          Layout lives in CSS (.dash-desktop-actions) rather than an inline
          style so the ≤640px media query can actually hide it — inline
          `display: flex` would win over the stylesheet. */}
      <div className="dash-desktop-actions">
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

      {/* ── Right: hamburger + dropdown (≤640px only) ── */}
      <div className="dash-mobile-menu" ref={menuRef}>
        <button
          type="button"
          className="dash-mobile-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls="public-topbar-mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>

        {menuOpen && (
          <div
            id="public-topbar-mobile-menu"
            className="dash-mobile-dropdown"
            role="menu"
            aria-label="Menu"
          >
            {/* Current view — mirrors the desktop Preview pill, not clickable */}
            <div className="dash-mobile-dropdown-item is-current" aria-current="page">
              <Eye size={16} aria-hidden="true" />
              <span>Preview</span>
            </div>

            <button
              type="button"
              role="menuitem"
              className="dash-mobile-dropdown-item"
              onClick={runAndClose(onCustomize)}
            >
              <Wand2 size={16} aria-hidden="true" />
              <span>Customize</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="dash-mobile-dropdown-item"
              onClick={runAndClose(onShare)}
            >
              <Share2 size={16} aria-hidden="true" />
              <span>Share</span>
            </button>

            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="dash-mobile-dropdown-item is-primary"
                  onClick={runAndClose(onDashboard)}
                >
                  <LayoutDashboard size={16} aria-hidden="true" />
                  <span>Dashboard</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="dash-mobile-dropdown-item is-danger"
                  onClick={runAndClose(onLogout)}
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="dash-mobile-dropdown-item"
                  onClick={runAndClose(onLogin)}
                >
                  <LogIn size={16} aria-hidden="true" />
                  <span>Log In</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="dash-mobile-dropdown-item is-primary"
                  onClick={runAndClose(onSignup)}
                >
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Sign Up</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
