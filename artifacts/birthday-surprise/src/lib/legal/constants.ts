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

/** Support / privacy contact (rendered as a mailto: link on the legal pages). */
export const SUPPORT_EMAIL = "agamk5651@gmail.com";
export const SUPPORT_CONTACT = SUPPORT_EMAIL;

/** Who operates the service. */
export const OPERATOR_NAME = "Agam";
export const OPERATOR_DESCRIPTION = `${OPERATOR_NAME}, the independent operator of Birthday Surprise`;
