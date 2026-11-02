import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { documentText, PRIVACY_POLICY, TERMS } from "@/lib/legal/content";
import { buildConsentMetadata, performSignUp, validateSignup } from "@/lib/legal/consent";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal/constants";
import { formatPrice } from "@/lib/pricing";

const APP = path.resolve("artifacts/birthday-surprise");

describe("legal documents", () => {
  const privacy = documentText(PRIVACY_POLICY);
  const terms = documentText(TERMS);

  it("privacy policy contains the key disclosures", () => {
    expect(privacy).toMatch(/publicly accessible URLs/);
    expect(privacy).toMatch(/unlisted, not private/);
    expect(privacy).toMatch(/noindex is not access control/i);
    expect(privacy).toMatch(/AI provider/);
    expect(privacy).toMatch(/Google Fonts/);
    expect(privacy).toMatch(/no self-service button to delete/);
    expect(privacy).toMatch(/do not promise automatic deletion/);
  });

  it("terms use the shared price and Razorpay", () => {
    expect(terms).toContain(`${formatPrice()} (Indian Rupees)`);
    expect(terms).toMatch(/Razorpay/);
    expect(terms).toMatch(/laws of India/);
  });

  it("never invents certifications or automatic refunds", () => {
    for (const t of [privacy, terms]) {
      expect(t).not.toMatch(/fully compliant|certified|GDPR compliant|automatic refund|end-to-end encrypt/i);
    }
    expect(terms).toMatch(/\[Owner to confirm: refund and cancellation policy\]/);
  });

  it("has unique section ids for the table of contents", () => {
    for (const doc of [PRIVACY_POLICY, TERMS]) {
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("signup consent", () => {
  const base = { email: "a@b.co", password: "12345678", confirmPassword: "12345678" };

  it("blocks submit until the checkbox is checked", () => {
    expect(validateSignup({ ...base, agreed: false })?.field).toBe("consent");
    expect(validateSignup({ ...base, agreed: true })).toBeNull();
  });

  it("passes consent metadata to supabase.auth.signUp", async () => {
    const signUp = vi.fn(async () => ({ data: {}, error: null }));
    const consent = buildConsentMetadata(new Date("2026-11-02T10:00:00Z"));
    await performSignUp({ signUp }, "a@b.co", "12345678", consent);
    expect(signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "12345678",
      options: { data: { terms_accepted_at: "2026-11-02T10:00:00.000Z", terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION } },
    });
  });
});

describe("site wiring", () => {
  it("sitemap lists the legal pages", () => {
    const xml = fs.readFileSync(path.join(APP, "public/sitemap.xml"), "utf8");
    expect(xml).toContain("/privacy-policy</loc>");
    expect(xml).toContain("/terms</loc>");
  });

  it("no 'private link' wording remains in user-facing source", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "__tests__") walk(full); continue; }
        if (!/\.(tsx?|html|txt|xml)$/.test(e.name)) continue;
        if (/private (share )?link|one private link/i.test(fs.readFileSync(full, "utf8"))) offenders.push(full);
      }
    };
    walk(path.join(APP, "src"));
    walk(path.join(APP, "public"));
    expect(offenders).toEqual([]);
  });
});
