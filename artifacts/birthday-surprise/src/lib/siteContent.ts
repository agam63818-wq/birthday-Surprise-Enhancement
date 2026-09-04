// ============================================================
//  SITE CONTENT — single source of truth for public SEO/AEO copy
//
//  Consumed by TWO places so the text can never drift:
//    1. vite.config.ts  → injected into index.html at build time as static,
//       crawlable HTML (inside #root, before React mounts) + JSON-LD.
//    2. <PublicAbout />  → the React-rendered "About / FAQ" section shown
//       below the hero on the public landing page ("/").
//
//  RULES: only describe things that actually exist in this codebase.
//  No statistics, testimonials, awards, ratings or guarantees.
//  This module must stay dependency-free (no "@/" aliases, no DOM) because
//  vite.config.ts imports it outside the app bundle.
// ============================================================

// Production canonical origin. Vercel preview / localhost URLs must never
// leak into canonical, og:url or sitemap values. Override only via
// VITE_SITE_URL if the project ever moves to a custom domain.
export const DEFAULT_SITE_URL = "https://birthday-surprise-enhancement.vercel.app";

export const SITE_NAME = "Birthday Surprise";

export const SITE_TITLE =
  "Birthday Surprise — Create a Personalized Birthday Surprise Website";

export const SITE_DESCRIPTION =
  "Birthday Surprise is a free-to-preview web app for building a personalized, 10-page animated birthday surprise: a tap-to-cut cake, memory wall with your photos, your own music, heartfelt messages and a private share link.";

export const OG_IMAGE_PATH = "/opengraph.jpg";
export const OG_IMAGE_WIDTH = 1536;
export const OG_IMAGE_HEIGHT = 1024;

// ── Answer-oriented "what is it" block ──────────────────────
export const ABOUT = {
  heading: "What is Birthday Surprise?",
  paragraphs: [
    "Birthday Surprise is a web app for creating a personalized, cinematic birthday surprise website for someone you love. Instead of a plain greeting card, the recipient opens a private link and walks through ten animated pages — an intro, a cuteness meter, a celebration, a cake they tap to cut, reasons why they matter, your story together, a memory wall of photos, and a final letter revealed line by line with confetti.",
    "You can preview the full experience on this page for free. To personalize it, create an account, open your dashboard, and edit every message, photo and song — or let the built-in AI assistant draft the whole thing from a few answers. When you are done, share it with a single private link.",
  ],
};

export const HOW_IT_WORKS = {
  heading: "How does Birthday Surprise work?",
  steps: [
    "Preview the default surprise on the home page to see all ten pages in action.",
    "Sign up with your email and open your dashboard, where one surprise is created for you automatically.",
    "Customize the text, photos, music, occasion, colour theme and font style — or answer a few questions in the AI Assistant tab to generate the content.",
    "Copy your private share link (/s/your-link) and send it to the birthday person on WhatsApp, Instagram or anywhere else. The link preview shows their name.",
  ],
};

export const FEATURES = {
  heading: "What can you create with Birthday Surprise?",
  items: [
    "A 10-page step-by-step surprise: Landing, Intro, Cuteness Meter, Celebration, Cake, Why You Matter, Our Story, Memory Wall, Before You Leave and Last Note.",
    "An interactive cake with animated candles — the recipient taps to cut it, confetti bursts and a birthday song plays.",
    "A memory wall of your own photos with captions, shown as a swipeable polaroid gallery.",
    "Your own background music and birthday song (MP3 uploads), with gentle fallback tones if a file fails to play.",
    "Occasion variants beyond birthdays: Rakshabandhan, Father's Day, Mother's Day and Love Day hero pages.",
    "Four colour themes (Midnight Purple, Rose Gold, Deep Emerald, Royal Gold) and four font styles.",
    "An AI Assistant that drafts all the messages from the recipient's name, your relationship, tone and shared memories — using the default AI or your own OpenAI, Gemini or Anthropic API key.",
    "A private share link with a personalized social preview (title, description and image carry the recipient's name).",
  ],
};

export const WHO_FOR = {
  heading: "Who is it for?",
  text: "Anyone who wants to give a friend, partner, sibling or parent something more personal than a text message — no design or coding skills needed. The default copy is written in warm Hinglish, and every line can be rewritten in any language you like.",
};

// ── FAQ (rendered visibly AND mirrored 1:1 in FAQPage JSON-LD) ──
export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Birthday Surprise?",
    a: "Birthday Surprise is a web app that lets you build a personalized, animated birthday surprise website — ten pages of messages, a tap-to-cut cake, a photo memory wall, music and a final letter — and share it with one private link.",
  },
  {
    q: "How does Birthday Surprise work?",
    a: "Preview the default surprise for free, sign up to get your own dashboard, customize the text, photos, songs, theme and occasion (or let the AI Assistant draft it), then copy your private share link and send it to the recipient.",
  },
  {
    q: "What can I create with Birthday Surprise?",
    a: "A 10-page interactive surprise with an intro, cuteness meter, celebration, animated cake, 'why you matter' cards, your story, a memory wall of your photos, a goodbye page and a line-by-line final note with confetti. Variants exist for Rakshabandhan, Father's Day, Mother's Day and Love Day.",
  },
  {
    q: "Can I make a personalized birthday surprise online for free?",
    a: "Previewing the full experience and creating an account are free. Editing the content of your own surprise requires a one-time ₹20 unlock, paid securely through Razorpay, after which your surprise stays yours.",
  },
  {
    q: "Is my surprise public or searchable?",
    a: "No. Each surprise lives at a private /s/ link that is only reachable by people you share it with. Share pages are marked noindex so they are not meant to appear in search engines, while link previews on WhatsApp, Instagram and similar apps still show the recipient's name.",
  },
];

// ── Helpers ─────────────────────────────────────────────────
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Static, crawlable HTML placed inside #root in index.html. React's
 * createRoot().render() replaces it on mount, so humans see the app; crawlers
 * and AI agents that do not execute JavaScript see a meaningful description
 * of the product. Same copy as <PublicAbout /> — never cloaked, never hidden.
 */
export function renderStaticHtml(): string {
  const p = (t: string) => `<p>${escapeHtml(t)}</p>`;
  const li = (t: string) => `<li>${escapeHtml(t)}</li>`;
  return `
      <header style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 20px">
        <p style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;opacity:.75">✦ A Special Surprise ✦</p>
        <h1 style="font-family:'Dancing Script',cursive;font-size:clamp(2.2rem,7vw,3.4rem);line-height:1.15;margin:14px 0">${escapeHtml(SITE_NAME)}</h1>
        <p style="max-width:34rem;opacity:.8;line-height:1.6">${escapeHtml(SITE_DESCRIPTION)}</p>
      </header>
      <main>
        <article style="max-width:42rem;margin:0 auto;padding:0 20px 64px;line-height:1.65">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading">${escapeHtml(ABOUT.heading)}</h2>
            ${ABOUT.paragraphs.map(p).join("\n            ")}
          </section>
          <section aria-labelledby="how-heading">
            <h2 id="how-heading">${escapeHtml(HOW_IT_WORKS.heading)}</h2>
            <ol>${HOW_IT_WORKS.steps.map(li).join("")}</ol>
          </section>
          <section aria-labelledby="features-heading">
            <h2 id="features-heading">${escapeHtml(FEATURES.heading)}</h2>
            <ul>${FEATURES.items.map(li).join("")}</ul>
          </section>
          <section aria-labelledby="who-heading">
            <h2 id="who-heading">${escapeHtml(WHO_FOR.heading)}</h2>
            ${p(WHO_FOR.text)}
          </section>
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading">Frequently asked questions</h2>
            ${FAQ.map((f) => `<h3>${escapeHtml(f.q)}</h3>${p(f.a)}`).join("\n            ")}
          </section>
        </article>
      </main>
      <footer style="text-align:center;padding:24px;opacity:.7;font-size:.85rem">
        <p>${escapeHtml(SITE_NAME)} — made with love, shared with one private link.</p>
      </footer>`;
}

/**
 * JSON-LD graph for the public landing page. Only schema types that the page
 * genuinely supports: WebSite, WebPage, WebApplication and FAQPage (the FAQ
 * is visible on the page). No Organization/Product/Review/Rating — the
 * codebase contains no such data.
 */
export function buildJsonLd(siteUrl: string): string {
  const home = `${siteUrl}/`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        url: home,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "WebPage",
        "@id": `${home}#webpage`,
        url: home,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        isPartOf: { "@id": `${home}#website` },
        about: { "@id": `${home}#app` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}${OG_IMAGE_PATH}`,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
        },
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${home}#app`,
        name: SITE_NAME,
        url: home,
        description: ABOUT.paragraphs[0],
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript",
        featureList: FEATURES.items,
        image: `${siteUrl}${OG_IMAGE_PATH}`,
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${home}#faq`,
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  // "<" is escaped so a literal "</script>" can never terminate the block.
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
