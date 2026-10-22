// Vercel Function: trusted server time for the Scheduled Surprise Countdown.
// Additive file — does not touch api/og.tsx. Never cached.
export const config = { runtime: "edge" };

export default function handler(): Response {
  const now = Date.now();
  return new Response(JSON.stringify({ now, iso: new Date(now).toISOString() }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex",
    },
  });
}
