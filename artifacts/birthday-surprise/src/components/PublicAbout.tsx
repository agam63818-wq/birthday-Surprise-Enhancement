import { ABOUT, HOW_IT_WORKS, FEATURES, WHO_FOR, FAQ, SITE_NAME } from "@/lib/siteContent";

// "About / how it works / FAQ" block shown BELOW the hero on the public
// landing page ("/") only. It renders the exact same copy that
// vite.config.ts injects statically into index.html for crawlers, so what a
// search/answer engine reads and what a visitor sees are identical.
//
// Purely presentational: no state, no network, no effect on the experience.
// Styling reuses the existing glass-card / chip tokens so it looks native.

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-script)",
  fontSize: "clamp(1.6rem, 5vw, 2.1rem)",
  lineHeight: 1.2,
  color: "var(--ink)",
  marginBottom: "12px",
};

const pStyle: React.CSSProperties = {
  color: "var(--ink-soft)",
  fontSize: "0.98rem",
  lineHeight: 1.7,
  marginBottom: "12px",
};

const listStyle: React.CSSProperties = {
  ...pStyle,
  paddingLeft: "1.25rem",
  display: "grid",
  gap: "8px",
};

const sectionStyle: React.CSSProperties = {
  padding: "clamp(24px, 6vw, 36px)",
  marginBottom: "18px",
};

export default function PublicAbout() {
  return (
    <section
      id="about"
      aria-label={`About ${SITE_NAME}`}
      style={{
        position: "relative",
        zIndex: 5,
        maxWidth: "44rem",
        margin: "0 auto",
        padding: "8px 20px calc(48px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <p className="chip" style={{ display: "flex", width: "fit-content", margin: "0 auto 22px" }}>
        ✦ About {SITE_NAME} ✦
      </p>

      <article>
        <div className="glass-card-dark" style={sectionStyle}>
          <h2 style={h2Style}>{ABOUT.heading}</h2>
          {ABOUT.paragraphs.map((text) => (
            <p key={text.slice(0, 32)} style={pStyle}>{text}</p>
          ))}
        </div>

        <div className="glass-card-dark" style={sectionStyle}>
          <h2 style={h2Style}>{HOW_IT_WORKS.heading}</h2>
          <ol style={listStyle}>
            {HOW_IT_WORKS.steps.map((step) => (
              <li key={step.slice(0, 32)}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="glass-card-dark" style={sectionStyle}>
          <h2 style={h2Style}>{FEATURES.heading}</h2>
          <ul style={listStyle}>
            {FEATURES.items.map((item) => (
              <li key={item.slice(0, 32)}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="glass-card-dark" style={sectionStyle}>
          <h2 style={h2Style}>{WHO_FOR.heading}</h2>
          <p style={{ ...pStyle, marginBottom: 0 }}>{WHO_FOR.text}</p>
        </div>

        <div className="glass-card-dark" style={sectionStyle}>
          <h2 style={h2Style}>Frequently asked questions</h2>
          {FAQ.map((f) => (
            <div key={f.q} style={{ marginTop: "14px" }}>
              <h3 style={{ color: "var(--ink)", fontSize: "1.02rem", fontWeight: 600, marginBottom: "6px" }}>
                {f.q}
              </h3>
              <p style={{ ...pStyle, marginBottom: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </article>

      <footer style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: "0.8rem", marginTop: "8px" }}>
        <p>{SITE_NAME} — made with love, shared with one private link.</p>
      </footer>
    </section>
  );
}
