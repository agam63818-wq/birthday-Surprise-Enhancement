import { useEffect } from "react";
import { DEFAULT_SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/siteContent";

// Minimal, dependency-free per-route <head> management for the SPA.
//
// index.html ships the full landing-page metadata statically (that is what
// crawlers see). This hook only adjusts the few tags that must differ per
// client-side route — title, description, robots and canonical — and
// restores the landing defaults on unmount so navigating back to "/" is
// exactly the pre-existing state.
//
// Private routes (login/dashboard/…) pass `noindex: true`; the server also
// sends X-Robots-Tag for those paths via vercel.json, so this is the
// belt-and-braces client-side signal for rendering-based crawlers.

interface PageMeta {
  title: string;
  description?: string;
  noindex?: boolean;
  /** Absolute canonical URL. Omit to drop the canonical tag (noindex pages). */
  canonical?: string | null;
}

// Canonical origin: always the production site, never a preview host.
const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, "") ||
  DEFAULT_SITE_URL;

const DEFAULTS: Required<PageMeta> = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  noindex: false,
  canonical: `${SITE_URL}/`,
};

function setMeta(selector: string, attr: "name" | "property", key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function apply(meta: Required<PageMeta>) {
  document.title = meta.title;
  setMeta('meta[name="description"]', "name", "description", meta.description);
  setMeta(
    'meta[name="robots"]',
    "name",
    "robots",
    meta.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
  );
  setCanonical(meta.canonical);
}

export function usePageMeta(meta: PageMeta) {
  const { title, description, noindex, canonical } = meta;
  useEffect(() => {
    apply({
      title,
      description: description ?? DEFAULTS.description,
      noindex: noindex ?? false,
      canonical: canonical === undefined ? (noindex ? null : DEFAULTS.canonical) : canonical,
    });
    return () => apply(DEFAULTS);
  }, [title, description, noindex, canonical]);
}

export { SITE_URL };
