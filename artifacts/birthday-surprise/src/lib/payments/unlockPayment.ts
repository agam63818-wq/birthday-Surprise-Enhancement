import { CURRENCY, PRICE_PAISE } from "@/lib/pricing";

/**
 * Pure, dependency-injected unlock payment flow so it can be unit-tested
 * without a browser, Supabase or Razorpay.
 *
 *   1. create-razorpay-order (server decides the amount)
 *   2. PRICE GUARD: refuse to open Checkout unless amount/currency match
 *      the displayed price (PRICE_PAISE / CURRENCY)
 *   3. Razorpay Checkout
 *   4. verify-razorpay-payment (server verifies signature and flips is_paid)
 *
 * The client never sets is_paid.
 */

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface CheckoutSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  email?: string;
  onSuccess: (response: CheckoutSuccess) => void;
  onDismiss: () => void;
}

type InvokeResult = { data: unknown; error: { message?: string } | null };

export interface UnlockPaymentDeps {
  invoke: (fn: string, options?: { body?: Record<string, unknown> }) => Promise<InvokeResult>;
  openCheckout: (options: CheckoutOptions) => void;
  warn?: (...args: unknown[]) => void;
}

/** Error messages thrown by startUnlockPayment (used by the UI to pick copy). */
export const UNLOCK_ERRORS = {
  dismissed: "dismissed",
  verificationFailed: "verification_failed",
  priceMismatch: "price_mismatch",
  orderFailed: "order_failed",
} as const;

export type PriceCheck =
  | { ok: true; order: RazorpayOrderResponse }
  | { ok: false; reason: string; expected: { amount: number; currency: string }; received: { amount: unknown; currency: unknown } };

/** Validates the server-created order against the displayed price. */
export function checkOrderMatchesPrice(raw: unknown): PriceCheck {
  const expected = { amount: PRICE_PAISE as number, currency: CURRENCY as string };
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof RazorpayOrderResponse, unknown>>;
  const received = { amount: o.amount, currency: o.currency };

  if (typeof o.order_id !== "string" || !o.order_id || typeof o.key_id !== "string" || !o.key_id) {
    return { ok: false, reason: "incomplete_order", expected, received };
  }
  if (o.currency !== CURRENCY) {
    return { ok: false, reason: "currency_mismatch", expected, received };
  }
  if (o.amount !== PRICE_PAISE) {
    return { ok: false, reason: "amount_mismatch", expected, received };
  }
  return {
    ok: true,
    order: { order_id: o.order_id, key_id: o.key_id, amount: o.amount, currency: o.currency },
  };
}

export async function startUnlockPayment(
  deps: UnlockPaymentDeps,
  userEmail?: string,
): Promise<void> {
  const { data, error } = await deps.invoke("create-razorpay-order");
  if (error || !data) {
    throw new Error(UNLOCK_ERRORS.orderFailed);
  }

  const check = checkOrderMatchesPrice(data);
  if (!check.ok) {
    // Never charge a different amount than the one displayed.
    (deps.warn ?? console.warn)(
      `[paywall] Price guard blocked checkout (${check.reason}). Expected`,
      check.expected,
      "received",
      check.received,
    );
    throw new Error(UNLOCK_ERRORS.priceMismatch);
  }

  const { order } = check;
  return new Promise<void>((resolve, reject) => {
    deps.openCheckout({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      email: userEmail,
      onSuccess: async (response) => {
        try {
          const { data: verifyData, error: verifyError } = await deps.invoke(
            "verify-razorpay-payment",
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            },
          );
          if (verifyError || !(verifyData as { success?: boolean } | null)?.success) {
            reject(new Error(UNLOCK_ERRORS.verificationFailed));
            return;
          }
          resolve();
        } catch {
          reject(new Error(UNLOCK_ERRORS.verificationFailed));
        }
      },
      onDismiss: () => reject(new Error(UNLOCK_ERRORS.dismissed)),
    });
  });
}
