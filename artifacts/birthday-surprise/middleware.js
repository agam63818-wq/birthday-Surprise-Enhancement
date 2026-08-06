// Vercel Edge Middleware (framework-agnostic — works for this Vite SPA,
// not just Next.js). Scoped via `config.matcher` to ONLY /s/:slug paths.
//
// Why this exists: social link-preview crawlers (WhatsApp, Facebook,
// Telegram, etc.) do not execute JavaScript, so they only ever see the
// static Open Graph tags in index.html — identical for every share link.
// This middleware intercepts ONLY crawler requests to /s/:slug and returns
// a tiny pre-rendered HTML document with personalized meta tags (real
// recipient name + a dynamic OG image), then meta-refreshes the crawler
// (and any human who somehow lands here) to the real SPA URL.
//
// Real human browsers are never intercepted: if the User-Agent is not a
// known crawler we return early and the request flows to the normal SPA
// (vercel.json rewrites everything to /index.html).
//
// NOTE: this file is plain JavaScript (not TypeScript) on purpose — the
// .ts version repeatedly failed Vercel's separate "Emit skipped" build
// step for reasons that couldn't be reproduced locally. Plain JS sidesteps
// that build step entirely.

export const config = {
  // Only run for public share links. Nothing else (/, /login, /dashboard,
  // /api/*, static assets) is touched by this middleware.
  matcher: "/s/:path*",
};

// Case-insensitive fragments of known social / link-preview crawler UAs.
const BOT_UA_FRAGMENTS = [
  "facebookexternalhit",
  "whatsapp",
  "twitterbot",
  "telegrambot",
  "slackbot",
  "linkedinbot",
  "discordbot",
  "google-inspectiontool",
  "skypeuripreview",
  "redditbot",
  "pinterest",
  "vkshare",
  "w3c_validator",
];

function isCrawler(userAgent) {
  const ua = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some((frag) => ua.includes(frag));
}

// Minimal HTML-attribute/text escaping so a name can never break out of
// the attribute context or inject markup.
function escapeHtml(input) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fetch the recipient name via the SAME public RPC the app already uses.
// Never throws — on any failure the caller uses the generic fallback.
async function fetchName(slug) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) return { name: null, description: null };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_surprise_by_slug`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_slug: slug }),
    });
    if (!res.ok) return { name: null, description: null };
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    const cfg = row?.config ?? null;
    const name = cfg?.name?.trim() || null;
    const description = cfg?.landing?.subtitle?.trim() || null;
    return { name, description };
  } catch {
    return { name: null, description: null };
  }
}

export default async function middleware(request) {
  const userAgent = request.headers.get("user-agent") || "";

  // Real human browser → do nothing, let the SPA handle it as today.
  if (!isCrawler(userAgent)) return undefined;

  const url = new URL(request.url);
  // matcher guarantees /s/... — grab the slug segment.
  const segments = url.pathname.split("/").filter(Boolean); // ["s", "<slug>"]
  const slug = segments[1] ? decodeURIComponent(segments[1]) : "";

  const { name, description } = slug
    ? await fetchName(slug)
    : { name: null, description: null };

  const safeName = name ? escapeHtml(name) : null;
  const title = safeName ? `${safeName}'s Birthday Surprise \uD83C\uDF82` : "A Birthday Surprise \uD83C\uDF82";
  const desc = safeName
    ? (description ? escapeHtml(description) : `Someone made something special for ${safeName}\u2026 open it! \uD83D\uDC9D`)
    : "Someone made something special for you\u2026 open it! \uD83D\uDC9D";

  // Absolute URLs using the request's own host so preview deployments work.
  const origin = `${url.protocol}//${url.host}`;
  const pageUrl = `${origin}/s/${encodeURIComponent(slug)}`;
  const ogImage = `${origin}/api/og?slug=${encodeURIComponent(slug)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta http-equiv="refresh" content="0; url=${pageUrl}" />
  </head>
  <body>Redirecting to the surprise\u2026</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
