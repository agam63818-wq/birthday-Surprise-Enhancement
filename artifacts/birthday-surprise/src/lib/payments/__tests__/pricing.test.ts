import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CURRENCY, formatPrice, PRICE_INR, PRICE_PAISE } from "@/lib/pricing";
import {
  checkOrderMatchesPrice,
  startUnlockPayment,
  UNLOCK_ERRORS,
  type CheckoutOptions,
} from "@/lib/payments/unlockPayment";
import { FAQ } from "@/lib/siteContent";

const SRC = path.resolve("artifacts/birthday-surprise/src");

describe("pricing.ts", () => {
  it("exposes a consistent ₹30 price", () => {
    expect(PRICE_INR).toBe(30);
    expect(PRICE_PAISE).toBe(3000);
    expect(PRICE_PAISE).toBe(PRICE_INR * 100);
    expect(CURRENCY).toBe("INR");
  });

  it("formats prices", () => {
    expect(formatPrice()).toBe("₹30");
    expect(formatPrice(49)).toBe("₹49");
    expect(formatPrice(12.5)).toBe("₹12.50");
    expect(formatPrice(Number.NaN)).toBe("₹30");
  });

  it("FAQ/SEO copy uses the shared price", () => {
    const text = JSON.stringify(FAQ);
    expect(text).toContain(formatPrice());
  });
});

describe("no stale ₹20 price literals in src/", () => {
  it("scans every source file", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!/\.(tsx?|jsx?|css|html|json|md)$/.test(entry.name)) continue;
        if (full.endsWith(path.join("payments", "__tests__", "pricing.test.ts"))) continue;
        const body = fs.readFileSync(full, "utf8");
        if (/₹\s?20(?!\d)/.test(body) || /20 rupee/i.test(body)) offenders.push(path.relative(SRC, full));
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });
});

const goodOrder = { order_id: "order_1", key_id: "rzp_test_x", amount: PRICE_PAISE, currency: "INR" };

function makeDeps(order: unknown, verify: unknown = { success: true }) {
  const opened: CheckoutOptions[] = [];
  const invoke = vi.fn(async (fn: string) =>
    fn === "create-razorpay-order" ? { data: order, error: null } : { data: verify, error: null },
  );
  const warn = vi.fn();
  return { opened, invoke, warn, deps: { invoke, warn, openCheckout: (o: CheckoutOptions) => { opened.push(o); } } };
}

describe("price guard", () => {
  it("accepts an order matching the displayed price", () => {
    expect(checkOrderMatchesPrice(goodOrder).ok).toBe(true);
  });

  it("rejects old 2000-paise orders, wrong currency and incomplete orders", () => {
    expect(checkOrderMatchesPrice({ ...goodOrder, amount: 2000 })).toMatchObject({ ok: false, reason: "amount_mismatch" });
    expect(checkOrderMatchesPrice({ ...goodOrder, amount: "3000" })).toMatchObject({ ok: false, reason: "amount_mismatch" });
    expect(checkOrderMatchesPrice({ ...goodOrder, currency: "USD" })).toMatchObject({ ok: false, reason: "currency_mismatch" });
    expect(checkOrderMatchesPrice({ amount: 3000, currency: "INR" })).toMatchObject({ ok: false, reason: "incomplete_order" });
    expect(checkOrderMatchesPrice(null).ok).toBe(false);
  });

  it("matching amount opens checkout and verifies payment", async () => {
    const { deps, opened, invoke } = makeDeps(goodOrder);
    const p = startUnlockPayment(deps, "a@b.c");
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0]).toMatchObject({ amount: 3000, currency: "INR", order_id: "order_1", key: "rzp_test_x", email: "a@b.c" });
    opened[0].onSuccess({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" });
    await expect(p).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("verify-razorpay-payment", expect.objectContaining({ body: expect.objectContaining({ razorpay_payment_id: "pay_1" }) }));
  });

  it("2000 paise does NOT open checkout and warns expected vs received", async () => {
    const { deps, opened, warn } = makeDeps({ ...goodOrder, amount: 2000 });
    await expect(startUnlockPayment(deps)).rejects.toThrow(UNLOCK_ERRORS.priceMismatch);
    expect(opened).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("amount_mismatch"), { amount: 3000, currency: "INR" }, "received", { amount: 2000, currency: "INR" });
  });

  it("wrong currency does NOT open checkout", async () => {
    const { deps, opened } = makeDeps({ ...goodOrder, currency: "USD" });
    await expect(startUnlockPayment(deps)).rejects.toThrow(UNLOCK_ERRORS.priceMismatch);
    expect(opened).toHaveLength(0);
  });

  it("order creation failure and dismissal map to distinct errors", async () => {
    const failing = { invoke: vi.fn(async () => ({ data: null, error: { message: "x" } })), openCheckout: vi.fn() };
    await expect(startUnlockPayment(failing)).rejects.toThrow(UNLOCK_ERRORS.orderFailed);
    expect(failing.openCheckout).not.toHaveBeenCalled();

    const { deps, opened } = makeDeps(goodOrder);
    const p = startUnlockPayment(deps);
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    opened[0].onDismiss();
    await expect(p).rejects.toThrow(UNLOCK_ERRORS.dismissed);
  });

  it("failed verification rejects", async () => {
    const { deps, opened } = makeDeps(goodOrder, { success: false });
    const p = startUnlockPayment(deps);
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    opened[0].onSuccess({ razorpay_order_id: "o", razorpay_payment_id: "p", razorpay_signature: "s" });
    await expect(p).rejects.toThrow(UNLOCK_ERRORS.verificationFailed);
  });
});
