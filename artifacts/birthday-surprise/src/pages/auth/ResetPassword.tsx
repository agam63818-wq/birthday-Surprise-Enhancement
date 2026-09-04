import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { AuthLayout, FieldLabel, FormError, FormSuccess, AuthLink } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePageMeta } from "@/hooks/use-page-meta";

// Handles the redirect link from the password-reset email. Supabase's
// detectSessionInUrl (enabled in src/lib/supabase.ts) exchanges the URL's
// recovery token for a session automatically before this page mounts.
export default function ResetPassword() {
  // Private/auth route: never indexed (also X-Robots-Tag via vercel.json).
  usePageMeta({ title: "Reset password — Birthday Surprise", noindex: true });

  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setLinkValid(!!data.session);
      setCheckingLink(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  if (checkingLink) {
    return (
      <AuthLayout title="Reset your password">
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
          <Spinner className="size-6" />
        </div>
      </AuthLayout>
    );
  }

  if (!linkValid && !success) {
    return (
      <AuthLayout
        title="Link expired or invalid"
        subtitle="This password reset link is no longer valid. Please request a new one."
        footer={
          <AuthLink to="/forgot-password">Request a new reset link</AuthLink>
        }
      >
        <></>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password">
      {success ? (
        <FormSuccess>Your password has been updated. Taking you to your dashboard…</FormSuccess>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <FormError>{error}</FormError>

          <div style={{ marginBottom: "16px" }}>
            <FieldLabel>New password</FieldLabel>
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
            <FieldLabel>Confirm new password</FieldLabel>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              disabled={submitting}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner /> Updating…
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
