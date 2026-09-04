// Vercel Function (generic /api/* convention — works for any framework on
// Vercel, not only Next.js). Generates a personalized 1200x630 Open Graph
// PNG for a given ?slug=, matching the site's dark-purple night-sky look
// with the recipient's name in a script font.
//
// Uses @vercel/og's ImageResponse (Satori under the hood — only a subset
// of CSS is supported: flexbox, basic gradients, inline styles, fetched
// fonts). No arbitrary CSS.

import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

type SurpriseRow = { config?: { name?: string } | null };

async function fetchName(slug: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey || !slug) return null;
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
    if (!res.ok) return null;
    const data = (await res.json()) as SurpriseRow | SurpriseRow[] | null;
    const row = Array.isArray(data) ? data[0] : data;
    return row?.config?.name?.trim() || null;
  } catch {
    return null;
  }
}

// Fetch a Dancing Script font file for the script heading (documented
// @vercel/og pattern for custom fonts). Falls back gracefully to the
// default sans if the fetch fails.
async function loadScriptFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((r) => r.text());
    const match = css.match(/src:\s*url\(([^)]+\.(?:woff2|woff|ttf))\)/i);
    const fontUrl = match?.[1];
    if (!fontUrl) return null;
    return await fetch(fontUrl).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawSlug = searchParams.get("slug") || "";
  // Slugs are URL-safe tokens; anything else skips the DB lookup and gets
  // the generic card (same as an unknown slug).
  const slug = /^[A-Za-z0-9_-]{1,120}$/.test(rawSlug) ? rawSlug : "";

  const [name, scriptFont] = await Promise.all([fetchName(slug), loadScriptFont()]);
  const heading = name ? `Birthday Surprise for ${name}` : "A Birthday Surprise";

  const fonts = scriptFont
    ? [{ name: "Dancing Script", data: scriptFont, weight: 700 as const, style: "normal" as const }]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          backgroundColor: "#0d0326",
          backgroundImage:
            "radial-gradient(120% 90% at 50% 0%, #1b0a3f 0%, #0d0326 55%, #07011a 100%)",
          color: "#ede9fe",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div style={{ display: "flex", fontSize: 84, marginBottom: 14 }}>💜</div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 8,
            color: "#f5b8e6",
            marginBottom: 22,
          }}
        >
          A SPECIAL SURPRISE
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: scriptFont ? "Dancing Script" : "sans-serif",
            fontSize: name && name.length > 12 ? 86 : 104,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#fbcfe8",
            maxWidth: 1040,
            textAlign: "center",
          }}
        >
          {heading}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(221,214,254,0.8)",
            marginTop: 26,
          }}
        >
          Not just a page… something made only for you ✨
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 44,
            padding: "18px 46px",
            borderRadius: 999,
            fontSize: 30,
            fontWeight: 600,
            color: "#ffffff",
            backgroundImage: "linear-gradient(135deg, #7c3aed, #be185d)",
          }}
        >
          Open It 🎀
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
