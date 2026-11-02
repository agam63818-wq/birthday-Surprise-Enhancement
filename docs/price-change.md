# Price change: ₹20 → ₹30

## What changed in the repo
- `src/lib/pricing.ts`: single source of truth. `PRICE_INR = 30`, `PRICE_PAISE = 3000`,
  `CURRENCY = "INR"`, `formatPrice()`. Dependency-free, so `siteContent.ts` / `vite.config.ts`
  can import it.
- Paywall (`PaywallLock.tsx`) shows `formatPrice()` (₹30) in the price and the button.
- FAQ / SEO static HTML (`siteContent.ts`) interpolates the same constant.
- `src/lib/payments/unlockPayment.ts`: the order → checkout → verify flow, extracted and
  unit-tested, plus a **price guard**.

## Price guard
After `create-razorpay-order` returns, the paywall checks `amount === PRICE_PAISE` and
`currency === "INR"` (plus a non-empty `order_id`/`key_id`). If they don't match:
- Razorpay Checkout is **not opened**, so nothing is charged.
- The user sees: "We're updating our price — please refresh in a minute and try again."
- A `console.warn` logs the expected vs received amount/currency.
- The button stays usable for retry.

The rest of the flow is unchanged. Verification and `is_paid` stay fully server-side.

## Rollout order (important)
1. **Deploy the new frontend first.** While the server still returns 2000 paise, the guard
   blocks checkout, so nobody can be charged an amount different from the ₹30 shown.
   Payments are **briefly blocked by design** during this gap.
2. **Then update and deploy the Supabase function** (`supabase/proposals/price-30.md`).
   Payments resume at ₹30.

Do **not** do it the other way round: the old frontend would still show ₹20 while the
server charges ₹30.

## Existing data
- Already-paid surprises stay paid (`is_paid` unchanged).
- Historical `payments` rows with 2000 paise are never edited.
- No re-charge and no migration.
