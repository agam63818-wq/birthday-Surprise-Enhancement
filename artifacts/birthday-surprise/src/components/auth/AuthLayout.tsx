import type { ReactNode } from "react";
import { Link } from "wouter";

// Shared glass-card shell for all auth screens, matching the birthday
// experience's dark purple/pink theme (glassmorphism, soft glow, rounded).
// Wrapped in a gradient ring frame with drifting glow orbs behind it.
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
        overflow: "hidden",
      }}
    >
      {/* Ambient glow orbs (decorative) */}
      <div
        className="auth-orb"
        aria-hidden="true"
        style={{
          width: "300px",
          height: "300px",
          top: "10%",
          left: "-70px",
          background: "radial-gradient(circle, rgba(124,58,237,0.5), transparent 70%)",
        }}
      />
      <div
        className="auth-orb"
        aria-hidden="true"
        style={{
          width: "340px",
          height: "340px",
          bottom: "6%",
          right: "-90px",
          background: "radial-gradient(circle, rgba(190,24,93,0.42), transparent 70%)",
          animationDelay: "-7s",
        }}
      />

      <div className="auth-card-frame card-enter" style={{ maxWidth: "410px", width: "100%" }}>
        <div
          className="glass-card-dark"
          style={{
            borderRadius: "27px",
            padding: "clamp(32px, 8vw, 44px) clamp(24px, 6vw, 36px)",
          }}
        >
          <p className="chip" style={{ marginBottom: "18px" }}>
            ✦ Birthday Surprise ✦
          </p>

          <h1
            className="font-serif"
            style={{
              fontSize: "clamp(1.7rem, 5.5vw, 2.2rem)",
              background: "var(--grad-brand)",
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
                marginBottom: "26px",
              }}
            >
              {subtitle}
            </p>
          )}

          {children}

          {footer && (
            <>
              <div
                aria-hidden="true"
                style={{
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)",
                  margin: "24px 0 18px",
                }}
              />
              <div
                style={{
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
            </>
          )}
        </div>
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
