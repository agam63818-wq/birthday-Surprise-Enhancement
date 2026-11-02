// ============================================================
//  LEGAL CONSTANTS — versions + last-updated date for the Privacy Policy
//  and Terms & Conditions. Bump a version whenever the matching document
//  changes in substance; the version is recorded at signup.
//
//  Dependency-free on purpose (no "@/" aliases, no DOM).
// ============================================================

export const TERMS_VERSION = "2026-11-02";
export const PRIVACY_VERSION = "2026-11-02";
export const LEGAL_LAST_UPDATED = "2 November 2026";

export const PRIVACY_PATH = "/privacy-policy";
export const TERMS_PATH = "/terms";

/** Visible placeholder for facts only the owner can confirm. */
export function ownerToConfirm(what: string): string {
  return `[Owner to confirm: ${what}]`;
}

export const SUPPORT_CONTACT = ownerToConfirm("support email address");
