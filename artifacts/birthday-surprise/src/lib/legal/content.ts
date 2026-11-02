// ============================================================
//  LEGAL PAGE CONTENT — Privacy Policy + Terms & Conditions.
//
//  RULES OF TRUTH: every statement here describes what the code in this
//  repo actually does. Anything that cannot be verified from the code is
//  marked with ownerToConfirm(...) and rendered as a visible highlight.
//  This is plain-language information, NOT legal advice, and it does not
//  claim certification or compliance with any law.
//
//  Kept as data (no React) so it can be unit-tested in Node.
// ============================================================

import { formatPrice, PRICE_INR } from "../pricing";
import { ownerToConfirm, PRIVACY_PATH, SUPPORT_CONTACT, TERMS_PATH } from "./constants";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "note"; text: string };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: LegalSection[];
}

const OPERATOR = ownerToConfirm("operator / business name");

// ── PRIVACY POLICY ──────────────────────────────────────────
export const PRIVACY_POLICY: LegalDocument = {
  path: PRIVACY_PATH,
  title: "Privacy Policy",
  metaTitle: "Privacy Policy — Birthday Surprise",
  metaDescription:
    "How Birthday Surprise handles your account, surprise content, uploaded photos and audio, AI Assistant text and payments, and what an unlisted share link means.",
  intro:
    "This page explains, in plain language, what information Birthday Surprise collects, why, who helps us process it, and the limits of how private your surprise is. It describes what the app does today. It is not legal advice.",
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      blocks: [
        {
          type: "p",
          text: `Birthday Surprise ("we", "us") is a web app for creating personalized, animated surprise pages and sharing them with a link. The service is operated by ${OPERATOR}. You can contact us at ${SUPPORT_CONTACT}.`,
        },
      ],
    },
    {
      id: "information-we-collect",
      title: "Information we collect",
      blocks: [
        { type: "p", text: "We only collect what the app needs to work:" },
        {
          type: "ul",
          items: [
            "Account data: your email address and password. Sign-in, email confirmation and password resets are handled by our authentication provider (Supabase Auth).",
            "Consent record: when you sign up, the date and time you accepted these documents and the versions you accepted are saved with your account.",
            "Surprise content: everything you enter in your dashboard, such as the recipient's name, messages, letters, story cards, captions, occasion, theme, fonts, scene settings, countdown settings and sticker placements.",
            "Photos and audio you upload (images up to 5 MB, audio up to 10 MB).",
            "AI Assistant text: the answers and requests you type into the AI Assistant and, when you ask for changes, the current content of your surprise.",
            `Payment-related data: when you unlock editing, our server creates an order with Razorpay. After you pay, the Razorpay order ID, payment ID and signature are sent to our server so the payment can be verified and your surprise marked as paid. Card, UPI and bank details are entered in Razorpay's checkout, not on our pages. ${ownerToConfirm("exactly which payment fields are stored on our side, and for how long")}`,
            "Data kept in your browser: your login session, an unsaved draft of your surprise, and a few display preferences (for example whether the creator toolbars are collapsed). This stays on your device until you clear it.",
            `Technical data: our hosting and infrastructure providers may automatically record technical information such as IP address, browser type and request times. ${ownerToConfirm("what Vercel and Supabase log for this project and for how long")}`,
          ],
        },
        {
          type: "p",
          text: "The app code does not include advertising or analytics trackers.",
        },
      ],
    },
    {
      id: "how-we-use-it",
      title: "How we use information",
      blocks: [
        {
          type: "ul",
          items: [
            "To create your account, save your surprise and show it to people who open your share link.",
            "To generate link previews (title, description and image with the recipient's name) when your link is shared in apps like WhatsApp or Instagram.",
            "To process the one-time unlock payment and confirm it.",
            "To run the AI Assistant when you ask it to draft or change content.",
            "To send essential account emails, such as email confirmation and password reset.",
            "To keep the service working, prevent misuse and answer support requests.",
          ],
        },
        { type: "p", text: "We do not sell your personal information and we do not show ads." },
      ],
    },
    {
      id: "service-providers",
      title: "Service providers we use",
      blocks: [
        { type: "p", text: "We rely on these third parties to run the app. Their own terms and privacy policies apply to the data they handle:" },
        {
          type: "ul",
          items: [
            "Supabase: authentication, database, file storage for photos and audio, and server functions.",
            "Vercel: website hosting, the code that builds link previews for share pages, preview image generation and a server-time endpoint used by countdowns.",
            "Razorpay: payment processing for the one-time unlock.",
            `An AI service provider: when you use the AI Assistant with the default AI, your text is sent from our server to an AI provider we configure. The code supports OpenAI, Google (Gemini) and Anthropic. Currently configured: ${ownerToConfirm("which AI provider is active")}`,
            "Google Fonts: pages load fonts from Google's servers, so your browser sends a request (including your IP address) to Google.",
            `Email delivery: account emails are sent through Supabase Auth using ${ownerToConfirm("email delivery provider / custom SMTP service")}.`,
          ],
        },
      ],
    },
    {
      id: "own-api-key",
      title: "Using your own AI API key",
      blocks: [
        {
          type: "p",
          text: "The AI Assistant lets you use your own OpenAI, Gemini or Anthropic API key instead of the default AI. When you do:",
        },
        {
          type: "ul",
          items: [
            "The key is kept only in the page's memory while you use the form. It is not saved to your browser's storage and is cleared from the form after the request.",
            "It is sent over HTTPS, together with that one request, to our server function, which uses it only to call the provider you picked for that request.",
            "Our code does not save the key to our database and is written not to include it in error messages.",
            "Your AI provider may bill you for the usage, and its own terms apply.",
          ],
        },
        { type: "note", text: ownerToConfirm("that the hosting platform's request logs do not retain request bodies containing API keys") },
      ],
    },
    {
      id: "photos-audio-privacy",
      title: "Photos, audio and how private your surprise is",
      blocks: [
        { type: "p", text: "Please read this carefully before uploading anything:" },
        {
          type: "ul",
          items: [
            "Uploaded photos and audio are stored at publicly accessible URLs. Anyone who has the direct URL of a file can open it without logging in.",
            "Anyone who has your share link (/s/…) can view the whole surprise page, including names, messages, photos and audio.",
            "Links can be copied, forwarded and screenshotted. Once shared, we cannot control who else receives them.",
            "Your share link is unlisted, not private. It is not password-protected and there is no access control. It is simply not listed anywhere on our site.",
            "Share pages are marked noindex, which asks search engines not to list them. Noindex is not access control and does not stop anyone who has the link.",
            "Link previews in messaging apps show the recipient's name and a preview image.",
          ],
        },
        {
          type: "p",
          text: "Only add content you are comfortable with anyone holding the link seeing, and only upload photos, audio or messages about other people with their permission.",
        },
      ],
    },
    {
      id: "retention-deletion",
      title: "How long we keep data, and deletion",
      blocks: [
        {
          type: "ul",
          items: [
            "We keep your account and surprise content while your account exists.",
            "There is currently no self-service button to delete your account or your uploaded files.",
            `To ask us to delete your account, your surprise or uploaded files, contact ${SUPPORT_CONTACT}. ${ownerToConfirm("deletion process and timeline, including removal of stored media files")}`,
            "We do not promise automatic deletion. Removing a photo or song from your surprise in the editor does not necessarily delete the file from storage.",
            "Copies may remain in backups or third-party caches for some time, and anyone who already saved or downloaded your content may keep it.",
            `Payment records may need to be kept for accounting or legal reasons. ${ownerToConfirm("payment record retention period")}`,
          ],
        },
      ],
    },
    {
      id: "your-rights",
      title: "Your choices and rights",
      blocks: [
        {
          type: "p",
          text: `You can edit most of your surprise yourself in the dashboard. You can also ask us to give you a copy of your data, correct it or delete it by contacting ${SUPPORT_CONTACT}. Depending on where you live, you may have additional rights under applicable law.`,
        },
      ],
    },
    {
      id: "security",
      title: "Security",
      blocks: [
        {
          type: "p",
          text: "We take reasonable measures to protect your information. For example, pages are served over HTTPS and payments are verified on our server, not in your browser. No online service can guarantee complete security, so please use a strong, unique password and keep it safe.",
        },
      ],
    },
    {
      id: "children",
      title: "Children",
      blocks: [
        {
          type: "p",
          text: `Birthday Surprise is meant for people aged 18 or over. If you are under 18, you may use it only with the involvement and consent of a parent or guardian, as described in our Terms & Conditions (${TERMS_PATH}). If you believe a child has given us information without that consent, contact ${SUPPORT_CONTACT}.`,
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      blocks: [
        {
          type: "p",
          text: "We may update this policy as the app changes. When we do, we will update the \"Last updated\" date and the policy version on this page. The version you accepted is saved with your account at signup.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [{ type: "p", text: `Questions or requests about privacy: ${SUPPORT_CONTACT}.` }],
    },
  ],
};

// ── TERMS & CONDITIONS ─────────────────────────────────────
export const TERMS: LegalDocument = {
  path: TERMS_PATH,
  title: "Terms & Conditions",
  metaTitle: "Terms & Conditions — Birthday Surprise",
  metaDescription: `The terms for using Birthday Surprise: accounts, your content, unlisted share links, the one-time ${formatPrice(PRICE_INR)} unlock, acceptable use and more.`,
  intro:
    "These terms explain the rules for using Birthday Surprise. Please read them together with our Privacy Policy. They are written in plain language and are not legal advice.",
  sections: [
    {
      id: "acceptance",
      title: "Accepting these terms",
      blocks: [
        {
          type: "p",
          text: `By creating an account or using Birthday Surprise, you agree to these Terms & Conditions and acknowledge our Privacy Policy (${PRIVACY_PATH}). If you do not agree, please do not use the service. The service is operated by ${OPERATOR}.`,
        },
      ],
    },
    {
      id: "the-service",
      title: "The service",
      blocks: [
        {
          type: "p",
          text: "Birthday Surprise lets you build a personalized, animated surprise page and share it with a link. Previewing the default experience and creating an account are free. Each account currently comes with one surprise.",
        },
      ],
    },
    {
      id: "eligibility",
      title: "Who can use it",
      blocks: [
        {
          type: "p",
          text: "You must be 18 or older to use Birthday Surprise on your own. If you are under 18, you may use it only with the involvement and consent of a parent or guardian, who agrees to these terms on your behalf and is responsible for your use.",
        },
      ],
    },
    {
      id: "accounts",
      title: "Your account",
      blocks: [
        {
          type: "ul",
          items: [
            "Use an email address you control and keep your password safe.",
            "You are responsible for what happens under your account.",
            `Tell us at ${SUPPORT_CONTACT} if you think someone else has accessed your account.`,
          ],
        },
      ],
    },
    {
      id: "your-content",
      title: "Your content and permissions",
      blocks: [
        {
          type: "ul",
          items: [
            "You keep ownership of the messages, photos and audio you add.",
            "You are responsible for your content. You must have the right to use everything you upload, including permission from people who appear in your photos or are mentioned in your messages, and the rights to any music or audio you upload.",
            "You give us a worldwide, non-exclusive, royalty-free licence to host, store, copy, display and transmit your content only as needed to run the service. That includes showing it to anyone who opens your share link and generating link previews.",
            "This licence ends when your content is deleted, except for copies that were already shared, cached or kept in backups.",
          ],
        },
      ],
    },
    {
      id: "prohibited-content",
      title: "What you must not do",
      blocks: [
        { type: "p", text: "Do not use Birthday Surprise to create or share content that is:" },
        {
          type: "ul",
          items: [
            "unlawful, or that encourages illegal activity;",
            "abusive, harassing, hateful, threatening or meant to harm someone;",
            "sexual content involving minors, or any intimate or private images shared without the consent of the people shown;",
            "infringing someone else's copyright, trademark, privacy or other rights;",
            "misleading impersonation, spam, malware, or attempts to break or overload the service.",
          ],
        },
      ],
    },
    {
      id: "sharing-limits",
      title: "Unlisted links and public media",
      blocks: [
        {
          type: "ul",
          items: [
            "Share links are unlisted, not private. Anyone who has the link can view the surprise, and links can be forwarded.",
            "Uploaded photos and audio are served from publicly accessible URLs that anyone with the direct URL can open.",
            "Share pages are marked noindex, but noindex is not access control.",
            "You decide who receives your link. We cannot recall a link once it has been shared.",
          ],
        },
      ],
    },
    {
      id: "ai-assistant",
      title: "AI Assistant",
      blocks: [
        {
          type: "p",
          text: "The AI Assistant drafts content using a third-party AI service. AI output can be inaccurate, inappropriate or not what you meant, so review every change before you save it. You are responsible for the content you choose to save. If you use your own API key, your AI provider's terms and charges apply.",
        },
      ],
    },
    {
      id: "pricing-payment",
      title: "Pricing and payment",
      blocks: [
        {
          type: "ul",
          items: [
            `Editing the content of your surprise requires a one-time unlock of ${formatPrice(PRICE_INR)} (Indian Rupees) per surprise. There is no subscription.`,
            "Payments are processed by Razorpay, and Razorpay's own terms apply. We do not receive your card, UPI or bank details.",
            "The price shown in the app before you pay is the amount you are charged. We do not add other charges.",
            "We may change the price for future purchases. Any change will be shown in the app before you pay.",
            ownerToConfirm("whether the price includes GST or other taxes"),
          ],
        },
      ],
    },
    {
      id: "refunds",
      title: "Refunds and cancellation",
      blocks: [
        {
          type: "p",
          text: `The unlock gives immediate access to the editing features. If money was deducted but your surprise was not unlocked, contact us at ${SUPPORT_CONTACT} with your Razorpay payment ID and we will look into it.`,
        },
        { type: "note", text: ownerToConfirm("refund and cancellation policy") },
      ],
    },
    {
      id: "intellectual-property",
      title: "Our content",
      blocks: [
        {
          type: "p",
          text: "The app's design, code, default templates, animations and stickers belong to us or our licensors. You may use them to create and share your own surprises through the service, but not copy, resell or redistribute them separately.",
        },
      ],
    },
    {
      id: "availability",
      title: "Availability and limitations",
      blocks: [
        {
          type: "p",
          text: "We work to keep Birthday Surprise running well, but it is provided \"as is\" and \"as available\". Features may change, and the service may sometimes be interrupted or behave differently on some devices and browsers. Please keep your own copies of photos and audio you care about.",
        },
        {
          type: "p",
          text: "To the maximum extent permitted by applicable law, we are not liable for indirect or consequential losses, and our total liability to you is limited to the amount you paid us for the service.",
        },
      ],
    },
    {
      id: "termination",
      title: "Suspension and termination",
      blocks: [
        {
          type: "p",
          text: `We may remove content, or suspend or close accounts, that break these terms or the law, or to protect other people. You can stop using the service at any time and ask us to delete your account by contacting ${SUPPORT_CONTACT}.`,
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to the service and these terms",
      blocks: [
        {
          type: "p",
          text: "We may update these terms as the service changes. When we do, we will update the \"Last updated\" date and the terms version on this page. The version you accepted is saved with your account at signup.",
        },
      ],
    },
    {
      id: "governing-law",
      title: "Governing law",
      blocks: [
        {
          type: "p",
          text: `These terms are governed by the laws of India. Courts at ${ownerToConfirm("city / state for jurisdiction")} will have jurisdiction over disputes.`,
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [{ type: "p", text: `Questions about these terms: ${SUPPORT_CONTACT}.` }],
    },
  ],
};

/** All plain text of a document (for tests / search). */
export function documentText(doc: LegalDocument): string {
  const parts: string[] = [doc.title, doc.intro];
  for (const s of doc.sections) {
    parts.push(s.title);
    for (const b of s.blocks) parts.push(b.type === "ul" ? b.items.join("\n") : b.text);
  }
  return parts.join("\n");
}
