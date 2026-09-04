import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout, FieldLabel, FormError, FormSuccess, AuthLink } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePageMeta } from "@/hooks/use-page-meta";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPassword() {
  // Private/auth route: never indexed (also X-Robots-Tag via vercel.json).
  usePageMeta({ title: "Forgot password — Birthday Surprise", noindex: true });

  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !isValidEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await resetPassword(email.trim());
    setSubmitting(false);

    if (resetError) {
      setError(resetError);
      return;
    }

    setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={sent ? undefined : "We'll email you a link to set a new password."}
      footer={
        <span>
          Remembered it? <AuthLink to="/login">Back to login</AuthLink>
        </span>
      }
    >
      {sent ? (
        <FormSuccess>
          If an account exists for {email.trim()}, we've sent a password reset link. Please check your
          inbox.
        </FormSuccess>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <FormError>{error}</FormError>

          <div style={{ marginBottom: "22px" }}>
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

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner /> Sending…
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
