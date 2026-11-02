# Price ₹20 → ₹30 — manual Supabase steps (owner)

The coding agent had **no Supabase access** in its environment, and the source of
`create-razorpay-order`, `verify-razorpay-payment` and the `payments` table/RLS is
**not in this repo**. So no server code was guessed or changed. Do this by hand.

> Do this only AFTER the new frontend (PR "feat(price): ₹30") is deployed.
> See `docs/price-change.md` for why the order matters.

## 1. `create-razorpay-order`
Supabase Dashboard → **Edge Functions** → `create-razorpay-order` → view/edit source.

- Find the order amount. It will look like `amount: 2000` (paise) or `20 * 100`.
- Change it to **3000** paise (₹30). Ideally read it from one constant / env var:
  ```ts
  const PRICE_PAISE = Number(Deno.env.get("PRICE_PAISE") ?? 3000);
  // ...
  amount: PRICE_PAISE, currency: "INR",
  ```
  If you use the env var: Dashboard → Edge Functions → **Secrets** → `PRICE_PAISE=3000`.
- Make sure the amount is computed **server-side only**. Never read an amount from the request body.
- Make sure the response still returns `{ order_id, amount, currency, key_id }`. The frontend
  now **refuses to open Checkout** unless `amount === 3000 && currency === "INR"`.

## 2. `verify-razorpay-payment`
- Search the source for `2000` or `20`. If it compares the paid amount against a hard-coded
  value, change it to `3000` (or the same `PRICE_PAISE` constant/env var).
- Do **not** touch signature verification, idempotency, RLS or the `is_paid` update.

## 3. Deploy
Deploy both functions (Dashboard "Deploy", or `supabase functions deploy create-razorpay-order`
and `supabase functions deploy verify-razorpay-payment`).

## 4. Verification checklist (manual, real payment)
- [ ] Open the Dashboard → Customize on an unpaid account → paywall shows **₹30**.
- [ ] Click "Unlock for ₹30" → the Razorpay modal shows **₹30.00**.
- [ ] Pay (a real ₹30 payment; refundable from the Razorpay dashboard).
- [ ] The surprise unlocks (`is_paid = true`).
- [ ] The newest `payments` row has `amount = 3000`.
- [ ] If the modal does NOT open and you see "We're updating our price…", the server
      still returns the old amount. Re-check step 1 and redeploy.

Review payment history (read-only):
```sql
select amount, count(*) from payments group by 1 order by 1;
```
Historical rows with `2000` stay as they are. Never edit them.

## 5. Please send the function sources
Paste the source of both functions (with secrets/keys removed) so a follow-up PR can add
them under `supabase/functions/` for version control and use one shared price constant.
