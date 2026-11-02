import { Link } from "wouter";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal/constants";
import { SITE_NAME } from "@/lib/siteContent";

/**
 * Small themed site footer with legal links.
 *
 * Mounted on public pages, auth pages, legal pages and the dashboard
 * (Customize / AI tabs). Deliberately NOT mounted on /s/:slug recipient
 * pages or inside the immersive Preview experience.
 */
export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`site-footer${compact ? " site-footer--compact" : ""}`} data-site-footer>
      <nav aria-label="Legal" className="site-footer-links">
        <Link href="/">Home</Link>
        <span aria-hidden="true">·</span>
        <Link href={PRIVACY_PATH}>Privacy Policy</Link>
        <span aria-hidden="true">·</span>
        <Link href={TERMS_PATH}>Terms &amp; Conditions</Link>
      </nav>
      <p className="site-footer-note">
        © {new Date().getFullYear()} {SITE_NAME} · Share links are unlisted, not private.
      </p>
    </footer>
  );
}
