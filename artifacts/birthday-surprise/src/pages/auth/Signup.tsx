import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout, FieldLabel, FormError, FormSuccess, AuthLink } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function Signup() {
  const { signUp } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmailMessage, setCheckEmailMessage] = useState<string | null>(null);

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
    const { error: signUpError, needsEmailConfirmation } = await signUp(email.trim(), password);
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

    navigate("/dashboard");
  };

  if (checkEmailMessage) {
    return (
      <AuthLayout
        title="Check your email"
        footer={
          <span>
            Already confirmed? <AuthLink to="/login">Log in</AuthLink>
          </span>
        }
      >
        <FormSuccess>{checkEmailMessage}</FormSuccess>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your birthday surprise."
      footer={
        <span>
          Already have an account? <AuthLink to="/login">Log in</AuthLink>
        </span>
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

        <div style={{ marginBottom: "16px" }}>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={submitting}
          />
        </div>

        <div style={{ marginBottom: "22px" }}>
          <FieldLabel>Confirm password</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            disabled={submitting}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
