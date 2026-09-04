import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import {
  DEFAULT_SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
  escapeHtml,
  renderStaticHtml,
  buildJsonLd,
} from "./src/lib/siteContent";

// Canonical production origin. Always the production domain — never the
// Vercel preview URL or localhost — unless explicitly overridden for a
// custom domain via VITE_SITE_URL. Trailing slashes are stripped so the
// templates below can append "/" exactly once.
function resolveSiteUrl(): string {
  const raw = (process.env.VITE_SITE_URL || "").trim();
  const candidate = raw || DEFAULT_SITE_URL;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "https:" || /localhost|127\.0\.0\.1/.test(u.hostname)) {
      return DEFAULT_SITE_URL;
    }
    return u.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

// Fills the __SEO_*__ placeholders in index.html from src/lib/siteContent.ts
// so title/description/canonical/OG/JSON-LD and the static crawlable body
// all come from ONE source and stay in sync with the React <PublicAbout />.
function seoHtml(): Plugin {
  const siteUrl = resolveSiteUrl();
  return {
    name: "birthday-surprise:seo-html",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html
          .replace(/__SITE_URL__/g, siteUrl)
          .replace(/__SEO_TITLE__/g, escapeHtml(SITE_TITLE))
          .replace(/__SEO_DESCRIPTION__/g, escapeHtml(SITE_DESCRIPTION))
          .replace("__JSON_LD__", buildJsonLd(siteUrl))
          .replace("__STATIC_CONTENT__", renderStaticHtml());
      },
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  // Expose SUPABASE_* secrets (set directly as Repl env vars, not via a
  // .env file) to client code as import.meta.env.SUPABASE_URL /
  // import.meta.env.SUPABASE_ANON_KEY, in addition to the default VITE_ prefix.
  envPrefix: ["VITE_", "SUPABASE_"],
  plugins: [
    seoHtml(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
