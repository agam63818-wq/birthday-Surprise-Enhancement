import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout, FieldLabel, FormError, AuthLink } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function Login() {
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

    navigate("/dashboard");
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your surprise."
      footer={
        <>
          <span>
            New here? <AuthLink to="/signup">Create an account</AuthLink>
          </span>
          <AuthLink to="/forgot-password">Forgot your password?</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormError>{error}</FormError>

        <div style={{ marginBottom: "16px" }}>
          <FieldLabel>Email</FieldLabel>
          <div className="input-shell">
            <Mail size={16} aria-hidden="true" />
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

        <div style={{ marginBottom: "24px" }}>
          <FieldLabel>Password</FieldLabel>
          <div className="input-shell">
            <Lock size={16} aria-hidden="true" />
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
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-auth-submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Logging in…
            </>
          ) : (
            <>
              <Heart size={16} fill="currentColor" /> Log In
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
