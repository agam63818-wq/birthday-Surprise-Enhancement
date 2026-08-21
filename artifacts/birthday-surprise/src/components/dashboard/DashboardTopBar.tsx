import { Eye, Wand2, Share2, LogOut, Sparkles, Menu, X } from "lucide-react";
import { useTopBarMenu } from "./useTopBarMenu";

export type DashboardTab = "preview" | "customize" | "assistant";

const TAB_META: Record<DashboardTab, { label: string; Icon: typeof Eye }> = {
  preview:   { label: "Preview",       Icon: Eye },
  customize: { label: "Customize",     Icon: Wand2 },
  assistant: { label: "AI Assistant",  Icon: Sparkles },
};

const TAB_ORDER = Object.keys(TAB_META) as DashboardTab[];

// Fixed chrome bar for the dashboard: brand mark, Preview/Customize/AI
// Assistant tabs, a Share button (preview only), and Logout. Sits above the
// rendered BirthdayExperience (which uses its own fixed-position ambient
// layers).
//
// Responsive behaviour (see the `.dash-topbar` rules in index.css):
//   • > 640px — unchanged: brand + inline tab pills on the left, the Share /
//     Log out chrome buttons on the right.
//   • ≤ 640px — the tab group and the chrome buttons collapse into the same
//     "☰" dropdown PublicTopBar already uses. Five items (Preview,
//     Customize, AI Assistant, Share, Log out) can no longer fit inline on a
//     phone, which is what made "Share" overlap the "AI Assistant" label
//     once the third tab was added, so the whole row is swapped for the menu
//     rather than being squeezed further.
export default function DashboardTopBar({
  tab,
  onTabChange,
  onShare,
  onLogout,
}: {
  tab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onShare: () => void;
  onLogout: () => void;
}) {
  const { open: menuOpen, setOpen: setMenuOpen, menuRef, runAndClose } =
    useTopBarMenu();

  return (
    <div className="dash-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
        <span className="dash-brand">✦ Birthday Surprise</span>

        {/* Inline tabs — hidden ≤640px, the dropdown carries them instead */}
        <div className="tab-group" role="tablist" aria-label="Dashboard view">
          {TAB_ORDER.map((t) => {
            const { label, Icon } = TAB_META[t];
            return (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => onTabChange(t)}
                className={`tab-pill${tab === t ? " active" : ""}`}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="tab-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: action buttons (desktop) ──
          Layout lives in CSS (.dash-desktop-actions) rather than an inline
          style so the ≤640px media query can actually hide it — inline
          `display: flex` would win over the stylesheet. */}
      <div className="dash-desktop-actions">
        {tab === "preview" && (
          <button onClick={onShare} aria-label="Copy share link" className="chrome-btn share">
            <Share2 size={14} aria-hidden="true" />
            <span className="label">Share</span>
          </button>
        )}
        <button onClick={onLogout} aria-label="Log out" className="chrome-btn logout">
          <LogOut size={14} aria-hidden="true" />
          <span className="label">Log out</span>
        </button>
      </div>

      {/* ── Right: hamburger + dropdown (≤640px only) ── */}
      <div className="dash-mobile-menu" ref={menuRef}>
        <button
          type="button"
          className="dash-mobile-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls="dashboard-topbar-mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>

        {menuOpen && (
          <div
            id="dashboard-topbar-mobile-menu"
            className="dash-mobile-dropdown"
            role="menu"
            aria-label="Menu"
          >
            {/* One row per tab — the active one gets the same gradient
                treatment as the desktop pill. */}
            {TAB_ORDER.map((t) => {
              const { label, Icon } = TAB_META[t];
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                  className={`dash-mobile-dropdown-item${isActive ? " is-current" : ""}`}
                  onClick={runAndClose(() => onTabChange(t))}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}

            {tab === "preview" && (
              <button
                type="button"
                role="menuitem"
                className="dash-mobile-dropdown-item"
                onClick={runAndClose(onShare)}
              >
                <Share2 size={16} aria-hidden="true" />
                <span>Share</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              className="dash-mobile-dropdown-item is-danger"
              onClick={runAndClose(onLogout)}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
