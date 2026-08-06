import { useState, useEffect, type FormEvent } from "react";
import { X, Mail, Lock, Eye, EyeOff, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { FieldLabel, FormError, FormSuccess } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

// Two-column auth modal (login left, signup right) for desktop.
// On mobile it collapses to a single-column stacked form with a tab toggle.
//
// Props:
//   open          – controls visibility
//   initialMode   – which side/tab to show first ("login" | "signup")
//   onClose       – called when the user dismisses the modal
//   onAuthSuccess – called after a successful signIn or signUp (no error)

type Mode = "login" | "signup";

interface AuthModalProps {
  open: boolean;
  initialMode: Mode;
  onClose: () => void;
  onAuthSuccess: () => void;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({
  onSuccess,
  onSwitchToSignup,
  onClose,
  compact = false,
}: {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
  onClose: () => void;
  compact?: boolean;
}) {
  const { signIn } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    onSuccess();
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Column heading */}
      <div style={{ marginBottom: "22px" }}>
        <h3
          className="font-serif"
          style={{
            fontSize: compact ? "1.35rem" : "1.5rem",
            background: "var(--grad-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.25,
            marginBottom: "6px",
          }}
        >
          Welcome Back
        </h3>
        <p style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>
          Log in to continue your surprise.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <FormError>{error}</FormError>

        <div style={{ marginBottom: "14px" }}>
          <FieldLabel>Email</FieldLabel>
          <div className="input-shell">
            <Mail size={15} aria-hidden="true" />
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
            />
          </div>
        </div>

        <div style={{ marginBottom: "8px" }}>
          <FieldLabel>Password</FieldLabel>
          <div className="input-shell">
            <Lock size={15} aria-hidden="true" />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              style={{ paddingRight: "42px" }}
            />
            <button
              type="button"
              className="eye-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Forgot password link — uses wouter navigation to avoid full reload */}
        <div style={{ textAlign: "right", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => { onClose(); navigate("/forgot-password"); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--pink)",
              fontSize: "0.78rem",
              textDecoration: "none",
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
            }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLElement).style.textDecoration =
                "underline")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLElement).style.textDecoration = "none")
            }
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          className="btn-auth-submit"
          disabled={submitting}
          style={{ width: "100%" }}
        >
          {submitting ? (
            <>
              <Spinner /> Logging in…
            </>
          ) : (
            <>
              <Heart size={15} fill="currentColor" /> Log In
            </>
          )}
        </button>
      </form>

      {/* Switch mode link (shown in single-column / mobile view) */}
      {compact && (
        <p
          style={{
            marginTop: "18px",
            textAlign: "center",
            fontSize: "0.83rem",
            color: "var(--ink-soft)",
          }}
        >
          New here?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            style={{
              background: "none",
              border: "none",
              color: "var(--pink)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "inherit",
              padding: 0,
            }}
          >
            Create an account
          </button>
        </p>
      )}
    </div>
  );
}

// ── Signup form ───────────────────────────────────────────────────────────────
function SignupForm({
  onSuccess,
  onSwitchToLogin,
  compact = false,
}: {
  onSuccess: () => void;
  /** Switches to login tab on mobile; on desktop both forms are visible so this is a no-op. */
  onSwitchToLogin: () => void;
  compact?: boolean;
}) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmailMessage, setCheckEmailMessage] = useState<string | null>(
    null,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !isValidEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp(
      email.trim(),
      password,
    );
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    if (needsEmailConfirmation) {
      setCheckEmailMessage(
        `We've sent a confirmation link to ${email.trim()}. Please check your email to activate your account.`,
      );
      return;
    }

    onSuccess();
  };

  // Email confirmation state — show success message inside the modal
  if (checkEmailMessage) {
    return (
      <div style={{ width: "100%" }}>
        <div style={{ marginBottom: "22px" }}>
          <h3
            className="font-serif"
            style={{
              fontSize: compact ? "1.35rem" : "1.5rem",
              background: "var(--grad-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.25,
              marginBottom: "6px",
            }}
          >
            Check your email 💌
          </h3>
        </div>
        <FormSuccess>{checkEmailMessage}</FormSuccess>
        <p
          style={{
            marginTop: "16px",
            textAlign: "center",
            fontSize: "0.83rem",
            color: "var(--ink-soft)",
          }}
        >
          Already confirmed?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: "none",
              border: "none",
              color: "var(--pink)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "inherit",
              padding: 0,
            }}
          >
            Log in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Column heading */}
      <div style={{ marginBottom: "22px" }}>
        <h3
          className="font-serif"
          style={{
            fontSize: compact ? "1.35rem" : "1.5rem",
            background: "var(--grad-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.25,
            marginBottom: "6px",
          }}
        >
          Create Account
        </h3>
        <p style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>
          Set up your birthday surprise.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <FormError>{error}</FormError>

        <div style={{ marginBottom: "14px" }}>
          <FieldLabel>Email</FieldLabel>
          <div className="input-shell">
            <Mail size={15} aria-hidden="true" />
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
            />
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <FieldLabel>Password</FieldLabel>
          <div className="input-shell">
            <Lock size={15} aria-hidden="true" />
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={submitting}
            />
          </div>
        </div>

        <div style={{ marginBottom: "22px" }}>
          <FieldLabel>Confirm password</FieldLabel>
          <div className="input-shell">
            <Lock size={15} aria-hidden="true" />
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              disabled={submitting}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-auth-submit"
          disabled={submitting}
          style={{ width: "100%" }}
        >
          {submitting ? (
            <>
              <Spinner /> Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Switch mode link (shown in single-column / mobile view) */}
      {compact && (
        <p
          style={{
            marginTop: "18px",
            textAlign: "center",
            fontSize: "0.83rem",
            color: "var(--ink-soft)",
          }}
        >
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: "none",
              border: "none",
              color: "var(--pink)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "inherit",
              padding: 0,
            }}
          >
            Log In
          </button>
        </p>
      )}
    </div>
  );
}

// ── AuthModal root ────────────────────────────────────────────────────────────
export default function AuthModal({
  open,
  initialMode,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  // Mobile tab state — tracks which form is visible in single-column layout.
  const [mobileMode, setMobileMode] = useState<Mode>(initialMode);

  // Fix A: sync mobileMode whenever the modal transitions from closed → open,
  // or when initialMode changes while already open (e.g. gate → login vs signup).
  useEffect(() => {
    if (open) setMobileMode(initialMode);
  }, [open, initialMode]);

  // Fix E: lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Fix E: close on Escape key.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(6,1,24,0.88)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fade-in-up 0.3s ease",
        overflowY: "auto",
      }}
    >
      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card-dark page-enter"
        style={{
          borderRadius: "24px",
          padding: "32px 28px",
          width: "100%",
          maxWidth: "760px",
          position: "relative",
          boxShadow:
            "0 0 80px rgba(124,58,237,0.2), 0 24px 70px rgba(0,0,0,0.85)",
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
            zIndex: 1,
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

        {/* ── Desktop two-column layout (≥ 600 px) ── */}
        <div
          className="auth-modal-desktop"
          style={{
            display: "flex",
            gap: "0",
            alignItems: "flex-start",
          }}
        >
          {/* Login column */}
          <div style={{ flex: 1, paddingRight: "28px" }}>
            <LoginForm
              onSuccess={onAuthSuccess}
              onSwitchToSignup={() => setMobileMode("signup")}
              onClose={onClose}
              compact={false}
            />
          </div>

          {/* "OR" divider */}
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "1px",
                flex: 1,
                minHeight: "60px",
                background:
                  "linear-gradient(180deg, transparent, rgba(167,139,250,0.3), transparent)",
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              OR
            </span>
            <div
              style={{
                width: "1px",
                flex: 1,
                minHeight: "60px",
                background:
                  "linear-gradient(180deg, transparent, rgba(167,139,250,0.3), transparent)",
              }}
            />
          </div>

          {/* Signup column */}
          <div style={{ flex: 1, paddingLeft: "28px" }}>
            <SignupForm
              onSuccess={onAuthSuccess}
              onSwitchToLogin={() => setMobileMode("login")}
              compact={false}
            />
          </div>
        </div>

        {/* ── Mobile single-column layout (< 600 px) ── */}
        <div className="auth-modal-mobile">
          {/* Tab toggle */}
          <div
            role="tablist"
            aria-label="Auth mode"
            style={{
              display: "flex",
              background: "rgba(167,139,250,0.08)",
              borderRadius: "999px",
              padding: "4px",
              marginBottom: "24px",
              border: "1px solid rgba(167,139,250,0.18)",
            }}
          >
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mobileMode === m}
                onClick={() => setMobileMode(m)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.83rem",
                  fontWeight: 600,
                  transition: "all 0.22s ease",
                  background:
                    mobileMode === m
                      ? "linear-gradient(135deg, #7c3aed, #be185d)"
                      : "transparent",
                  color: mobileMode === m ? "#fff" : "var(--ink-soft)",
                  boxShadow:
                    mobileMode === m
                      ? "0 4px 14px rgba(124,58,237,0.4)"
                      : "none",
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Active form */}
          {mobileMode === "login" ? (
            <LoginForm
              onSuccess={onAuthSuccess}
              onSwitchToSignup={() => setMobileMode("signup")}
              onClose={onClose}
              compact
            />
          ) : (
            <SignupForm
              onSuccess={onAuthSuccess}
              onSwitchToLogin={() => setMobileMode("login")}
              compact
            />
          )}
        </div>
      </div>

      {/* Responsive visibility styles injected inline so we don't need a
          separate CSS file. The breakpoint mirrors the modal's max-width. */}
      <style>{`
        .auth-modal-desktop { display: flex; }
        .auth-modal-mobile  { display: none; }
        @media (max-width: 599px) {
          .auth-modal-desktop { display: none !important; }
          .auth-modal-mobile  { display: block !important; }
        }
      `}</style>
    </div>
  );
}
