import { Share2, LogOut } from "lucide-react";

export type DashboardTab = "preview" | "customize";

// Fixed chrome bar for the dashboard: Preview/Customize tabs, a Share
// button (preview only), and Logout. Sits above the rendered
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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: "calc(52px + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        background: "rgba(7,1,26,0.82)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(167,139,250,0.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "rgba(167,139,250,0.08)",
          border: "1px solid rgba(167,139,250,0.18)",
          borderRadius: "12px",
          padding: "3px",
        }}
      >
        {(["preview", "customize"] as DashboardTab[]).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            style={{
              padding: "6px 14px",
              borderRadius: "9px",
              fontSize: "0.8rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              textTransform: "capitalize",
              background: tab === t ? "linear-gradient(135deg, #7c3aed, #be185d)" : "transparent",
              color: tab === t ? "#fff" : "var(--ink-soft)",
              transition: "all 0.2s ease",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        {tab === "preview" && (
          <button
            onClick={onShare}
            aria-label="Copy share link"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(236,72,153,0.3)",
              background: "rgba(236,72,153,0.1)",
              color: "#f9a8d4",
              fontSize: "0.78rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Share2 size={14} /> Share
          </button>
        )}
        <button
          onClick={onLogout}
          aria-label="Log out"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid rgba(167,139,250,0.25)",
            background: "rgba(167,139,250,0.06)",
            color: "var(--ink-soft)",
            fontSize: "0.78rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
