// ============================================================
//  PRICING — single source of truth for the one-time unlock price.
//
//  Used by the paywall UI, the price guard (src/lib/payments/unlockPayment.ts)
//  and public SEO/FAQ copy (src/lib/siteContent.ts, which is also imported by
//  vite.config.ts at build time).
//
//  RULE: keep this module dependency-free (no "@/" aliases, no DOM, no React)
//  so it can be imported from vite.config.ts / Node.
//
//  NOTE: the amount actually CHARGED is decided server-side by the deployed
//  `create-razorpay-order` Supabase Edge Function (not in this repo). The
//  paywall refuses to open Razorpay Checkout unless the server-returned order
//  matches PRICE_PAISE + CURRENCY, so users are never charged an amount that
//  differs from what is displayed. See docs/price-change.md.
// ============================================================

/** One-time unlock price in whole rupees. */
export const PRICE_INR = 30 as const;

/** Same price in paise (Razorpay's smallest currency unit). */
export const PRICE_PAISE = 3000 as const;

/** ISO currency code expected from the server-created Razorpay order. */
export const CURRENCY = "INR" as const;

/** Display string for a rupee amount, e.g. formatPrice() -> "₹30". */
export function formatPrice(inr: number = PRICE_INR): string {
  const safe = Number.isFinite(inr) ? inr : PRICE_INR;
  const isWhole = Math.round(safe * 100) % 100 === 0;
  return `₹${isWhole ? Math.round(safe).toString() : safe.toFixed(2)}`;
}
