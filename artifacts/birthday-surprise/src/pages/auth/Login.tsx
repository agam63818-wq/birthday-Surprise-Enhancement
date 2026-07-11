import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout, FieldLabel, FormError, AuthLink } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function Login() {
  const { signIn } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </div>

        <div style={{ marginBottom: "22px" }}>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={submitting}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Logging in…
            </>
          ) : (
            "Log In"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
