import { useState } from "react";
import { useNormalizedConfig } from "@/contexts/ConfigContext";
import type { SceneComponentProps } from "@/lib/v2/registry";

/** Interactive envelopes reuse canonical lastNote lines; no second letter schema. */
export default function LettersScene({ onNext }: SceneComponentProps) {
  const { raw, recipient } = useNormalizedConfig();
  const [open, setOpen] = useState<number | null>(null);
  return <section style={{ minHeight: "100dvh", padding: "60px 20px", display: "grid", alignContent: "center", gap: 24, maxWidth: 700, margin: "auto" }}>
    <header><p style={{ color: "var(--violet)", letterSpacing: ".16em", fontSize: 11 }}>WORDS TO KEEP</p><h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 6vw, 44px)" }}>Letters for {recipient.name || "you"}</h1><p>Open a note. Take your time.</p></header>
    {raw.lastNote.lines.length ? raw.lastNote.lines.map((line, i) => <div key={i} style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 14, background: "var(--card)" }}>
      <button type="button" aria-expanded={open === i} aria-controls={`letter-${i}`} onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", minHeight: 44, textAlign: "left", color: "var(--ink)" }}>Letter {String(i + 1).padStart(2, "0")} · {open === i ? "Close" : "Open"}</button>
      {open === i && <p id={`letter-${i}`} style={{ marginTop: 16, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{line}</p>}
    </div>) : <p>{raw.celebration.message}</p>}
    <button type="button" onClick={onNext} style={{ minHeight: 48, padding: "12px 24px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--primary)", color: "var(--ink)" }}>Continue</button>
  </section>;
}
