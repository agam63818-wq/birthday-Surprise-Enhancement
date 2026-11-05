import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import Background from "@/components/Background";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  // Unknown SPA routes are served with HTTP 200 by the Vercel rewrite, so the
  // client-side robots signal is what keeps stray URLs out of the index.
  usePageMeta({ title: "Page not found — Birthday Surprise", noindex: true });

  return (
    <>
      <Background />
      <main className="nf-shell">
        <div className="ui-card nf-card">
          <p className="ui-eyebrow">✦ Birthday Surprise ✦</p>
          <p className="nf-code" aria-hidden="true">404</p>
          <h1 className="ui-heading" style={{ fontSize: "clamp(1.4rem, 4vw, 1.8rem)" }}>This page doesn't exist</h1>
          <p className="ui-lead" style={{ fontSize: ".98rem" }}>
            The link may be mistyped or the page may have moved. Surprise links look like <code>/s/your-link</code>.
          </p>
          <div className="nf-actions">
            <Link href="/" className="ui-btn ui-btn--primary">Go to home</Link>
            <Link href="/dashboard" className="ui-btn ui-btn--secondary">Open dashboard</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
