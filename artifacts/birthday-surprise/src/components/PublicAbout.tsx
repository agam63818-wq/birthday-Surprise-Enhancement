import { ABOUT, HOW_IT_WORKS, FEATURES, WHO_FOR, FAQ, SITE_NAME } from "@/lib/siteContent";
import SiteFooter from "@/components/SiteFooter";

// "About / how it works / FAQ" block shown BELOW the hero on the public
// landing page ("/") only. It renders the exact same copy that
// vite.config.ts injects statically into index.html for crawlers, so what a
// search/answer engine reads and what a visitor sees are identical.
//
// Purely presentational: no state, no network, no effect on the experience.
// Styling reuses the existing glass-card / chip tokens so it looks native.

export default function PublicAbout() {
  return (
    <section id="about" aria-label={`About ${SITE_NAME}`} className="pa-shell">
      <header className="pa-head">
        <p className="chip">✦ About {SITE_NAME} ✦</p>
        <h2 className="pa-title">{ABOUT.heading}</h2>
        <div className="pa-intro">
          {ABOUT.paragraphs.map((text) => (
            <p key={text.slice(0, 32)}>{text}</p>
          ))}
        </div>
      </header>

      <article className="pa-grid">
        <div className="pa-card pa-card--steps">
          <h2 className="pa-h2">{HOW_IT_WORKS.heading}</h2>
          <ol className="pa-steps">
            {HOW_IT_WORKS.steps.map((step, i) => (
              <li key={step.slice(0, 32)}>
                <span className="pa-step-num" aria-hidden="true">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pa-card pa-card--features">
          <h2 className="pa-h2">{FEATURES.heading}</h2>
          <ul className="pa-features">
            {FEATURES.items.map((item) => (
              <li key={item.slice(0, 32)}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="pa-card pa-card--who">
          <h2 className="pa-h2">{WHO_FOR.heading}</h2>
          <p className="pa-p">{WHO_FOR.text}</p>
        </div>

        <div className="pa-card pa-card--faq">
          <h2 className="pa-h2">Frequently asked questions</h2>
          <div className="pa-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary><h3>{f.q}</h3></summary>
                <p className="pa-p">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </article>

      <p className="pa-sign">{SITE_NAME} — made with love, shared with one unlisted link.</p>
      <SiteFooter compact />
    </section>
  );
}
