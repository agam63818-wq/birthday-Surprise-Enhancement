import { useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout, FieldLabel, FormError, FormSuccess, AuthLink } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePageMeta } from "@/hooks/use-page-meta";
import { buildConsentMetadata, validateSignup } from "@/lib/legal/consent";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal/constants";

export default function Signup() {
  // Private/auth route: never indexed (also X-Robots-Tag via vercel.json).
  usePageMeta({ title: "Sign up — Birthday Surprise", noindex: true });

  const { signUp } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmailMessage, setCheckEmailMessage] = useState<string | null>(null);
  // Never pre-checked.
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const consentRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setConsentError(null);

    const problem = validateSignup({ email, password, confirmPassword, agreed });
    if (problem) {
      if (problem.field === "consent") {
        setConsentError(problem.message);
        consentRef.current?.focus();
      } else {
        setError(problem.message);
      }
      return;
    }

    setSubmitting(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp(
      email.trim(),
      password,
      buildConsentMetadata(),
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

        <div className="signup-consent">
          <label className="signup-consent-label">
            <input
              ref={consentRef}
              type="checkbox"
              className="signup-consent-box"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setConsentError(null);
              }}
              disabled={submitting}
              aria-invalid={consentError ? true : undefined}
              aria-describedby={consentError ? "signup-consent-error" : undefined}
              data-testid="signup-consent"
            />
            <span>
              I agree to the{" "}
              <a href={TERMS_PATH} target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>{" "}
              and acknowledge the{" "}
              <a href={PRIVACY_PATH} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </span>
          </label>
          {consentError && (
            <p id="signup-consent-error" className="signup-consent-error" role="alert">
              {consentError}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting} aria-disabled={!agreed || undefined}>
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
