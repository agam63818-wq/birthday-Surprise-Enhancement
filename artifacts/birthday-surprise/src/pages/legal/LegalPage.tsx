import { Link } from "wouter";
import { usePageMeta, SITE_URL } from "@/hooks/use-page-meta";
import SiteFooter from "@/components/SiteFooter";
import { LEGAL_LAST_UPDATED, PRIVACY_VERSION, SUPPORT_EMAIL, TERMS_VERSION } from "@/lib/legal/constants";
import type { LegalBlock, LegalDocument } from "@/lib/legal/content";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TOKEN_RE = new RegExp(`(\\[Owner to confirm:[^\\]]*\\]|${escapeRe(SUPPORT_EMAIL)})`, "g");

/** Renders text, highlighting "[Owner to confirm: …]" and linking the support email. */
function Rich({ text }: { text: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (part === SUPPORT_EMAIL) {
          return <a key={i} className="legal-mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
        }
        if (part.startsWith("[Owner to confirm:")) {
          return <mark key={i} className="legal-owner">{part}</mark>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === "ul") {
    return (
      <ul className="legal-list">
        {block.items.map((item) => (
          <li key={item}><Rich text={item} /></li>
        ))}
      </ul>
    );
  }
  if (block.type === "note") {
    return <p className="legal-note"><Rich text={block.text} /></p>;
  }
  return <p className="legal-p"><Rich text={block.text} /></p>;
}

export default function LegalPage({ doc }: { doc: LegalDocument }) {
  usePageMeta({
    title: doc.metaTitle,
    description: doc.metaDescription,
    canonical: `${SITE_URL}${doc.path}`,
  });

  const version = doc.path === "/terms" ? TERMS_VERSION : PRIVACY_VERSION;

  return (
    <div className="legal-shell">
      <main className="legal-main" id="main">
        <Link href="/" className="legal-back">← Back to home</Link>

        <article className="glass-card-dark legal-card" aria-labelledby="legal-title">
          <p className="chip legal-chip">✦ Birthday Surprise ✦</p>
          <h1 id="legal-title" className="legal-title">{doc.title}</h1>
          <p className="legal-meta">
            Last updated: {LEGAL_LAST_UPDATED} · Version {version}
          </p>
          <p className="legal-intro">{doc.intro}</p>

          <nav className="legal-toc" aria-label="Table of contents">
            <h2 className="legal-toc-title">Contents</h2>
            <ol>
              {doc.sections.map((s) => (
                <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="legal-section" aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`} className="legal-h2">
                <span className="legal-num">{i + 1}.</span> {s.title}
              </h2>
              {s.blocks.map((b, j) => <Block key={j} block={b} />)}
            </section>
          ))}

          <p className="legal-disclaimer">
            This page is plain-language information about how the app works today. It is not legal advice and does
            not claim certification or compliance with any specific law.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
