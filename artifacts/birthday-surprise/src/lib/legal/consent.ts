import { PRIVACY_VERSION, TERMS_VERSION } from "./constants";

/**
 * Consent record stored in Supabase auth `user_metadata` at signup.
 *
 * NOTE: user_metadata is client-writable, so this is a convenience record,
 * not tamper-proof evidence. See supabase/proposals/consent-table.sql for an
 * optional stronger, server-side record.
 */
export interface ConsentMetadata {
  terms_accepted_at: string;
  terms_version: string;
  privacy_version: string;
}

export function buildConsentMetadata(now: Date = new Date()): ConsentMetadata {
  return {
    terms_accepted_at: now.toISOString(),
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
  };
}

interface SignUpCapable<R> {
  signUp(credentials: {
    email: string;
    password: string;
    options?: { data?: object };
  }): Promise<R>;
}

/** Calls supabase.auth.signUp, attaching consent metadata when provided. */
export function performSignUp<R>(
  auth: SignUpCapable<R>,
  email: string,
  password: string,
  consent?: ConsentMetadata,
): Promise<R> {
  return auth.signUp(
    consent ? { email, password, options: { data: { ...consent } } } : { email, password },
  );
}

export type SignupField = "email" | "password" | "confirmPassword" | "consent";

export interface SignupInput {
  email: string;
  password: string;
  confirmPassword: string;
  agreed: boolean;
}

/** Pure signup form validation. Returns the first problem, or null. */
export function validateSignup(input: SignupInput): { field: SignupField; message: string } | null {
  const email = input.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { field: "email", message: "Please enter a valid email address." };
  }
  if (input.password.length < 8) {
    return { field: "password", message: "Password must be at least 8 characters long." };
  }
  if (input.password !== input.confirmPassword) {
    return { field: "confirmPassword", message: "Passwords don't match." };
  }
  if (!input.agreed) {
    return {
      field: "consent",
      message: "Please agree to the Terms & Conditions and acknowledge the Privacy Policy to continue.",
    };
  }
  return null;
}
