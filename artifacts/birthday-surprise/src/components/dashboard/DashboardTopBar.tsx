import { Eye, Wand2, Share2, LogOut, Sparkles } from "lucide-react";

export type DashboardTab = "preview" | "customize" | "assistant";

const TAB_META: Record<DashboardTab, { label: string; Icon: typeof Eye }> = {
  preview:   { label: "Preview",       Icon: Eye },
  customize: { label: "Customize",     Icon: Wand2 },
  assistant: { label: "AI Assistant",  Icon: Sparkles },
};

// Fixed chrome bar for the dashboard: brand mark, Preview/Customize tabs,
// a Share button (preview only), and Logout. Sits above the rendered
// BirthdayExperience (which uses its own fixed-position ambient layers).
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
  return (
    <div className="dash-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
        <span className="dash-brand">✦ Birthday Surprise</span>

        <div className="tab-group" role="tablist" aria-label="Dashboard view">
          {(Object.keys(TAB_META) as DashboardTab[]).map((t) => {
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

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
    </div>
  );
}
