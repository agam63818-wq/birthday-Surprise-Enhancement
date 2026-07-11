import type { ReactNode } from "react";
import { Link } from "wouter";

// Shared glass-card shell for all auth screens, matching the birthday
// experience's dark purple/pink theme (glassmorphism, soft glow, rounded).
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="min-h-screen-dvh"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "calc(24px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px))",
        position: "relative",
        zIndex: 5,
      }}
    >
      <div
        className="glass-card-dark card-enter"
        style={{
          maxWidth: "400px",
          width: "100%",
          padding: "clamp(32px, 8vw, 44px) clamp(24px, 6vw, 36px)",
        }}
      >
        <p className="chip" style={{ marginBottom: "18px" }}>
          ✦ Birthday Surprise ✦
        </p>

        <h1
          className="font-serif"
          style={{
            fontSize: "clamp(1.6rem, 5vw, 2.1rem)",
            background: "linear-gradient(135deg, #f9a8d4, #e879f9, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.25,
            marginBottom: subtitle ? "8px" : "24px",
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            style={{
              color: "var(--ink-soft)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            {subtitle}
          </p>
        )}

        {children}

        {footer && (
          <div
            style={{
              marginTop: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "center",
              fontSize: "0.85rem",
              color: "var(--ink-soft)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: "0.8rem",
        fontWeight: 500,
        color: "var(--ink-soft)",
        marginBottom: "6px",
      }}
    >
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p style={{ color: "#fca5c1", fontSize: "0.78rem", marginTop: "6px" }}>{children}</p>
  );
}

export function FormError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <div
      style={{
        background: "rgba(244, 63, 94, 0.12)",
        border: "1px solid rgba(244, 63, 94, 0.35)",
        borderRadius: "12px",
        padding: "10px 14px",
        fontSize: "0.85rem",
        color: "#fda4af",
        marginBottom: "16px",
      }}
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      style={{
        background: "rgba(167, 139, 250, 0.12)",
        border: "1px solid rgba(167, 139, 250, 0.35)",
        borderRadius: "12px",
        padding: "10px 14px",
        fontSize: "0.85rem",
        color: "var(--ink)",
        marginBottom: "16px",
      }}
    >
      {children}
    </div>
  );
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      href={to}
      style={{ color: "var(--pink)", textDecoration: "none", fontWeight: 500 }}
      onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
      onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
    >
      {children}
    </Link>
  );
}
