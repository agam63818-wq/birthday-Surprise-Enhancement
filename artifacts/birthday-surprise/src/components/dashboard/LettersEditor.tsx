import type { LetterItem, SurpriseConfig } from "@/lib/v2/schema";
import { legacyLetterItems, MAX_LETTERS, resolveLetters } from "@/lib/letters/resolve";

// Interactive Letters content editor. Uses functional updates through the
// canonical draft (Save/Undo/Discard/autosave safe). The first edit copies
// the current letters (from lastNote for old rows) into config.letters so
// nothing already written is lost.
type Update = (fn: (c: SurpriseConfig) => SurpriseConfig) => void;

const LIMITS = { heading: 120, subtitle: 300, signature: 120, title: 120, hint: 80, body: 6000 };

export default function LettersEditor({ config, onChange }: { config: SurpriseConfig; onChange: Update }) {
  const resolved = resolveLetters(config);
  const items: LetterItem[] = config.letters?.items?.length ? config.letters.items : legacyLetterItems(config);

  const setItems = (fn: (list: LetterItem[]) => LetterItem[]) => onChange(c => {
    const current = c.letters?.items?.length ? c.letters.items : legacyLetterItems(c);
    return { ...c, letters: { ...c.letters, items: fn(current.map(i => ({ ...i }))) } };
  });
  const setMeta = (key: "heading" | "subtitle" | "signature", value: string) =>
    onChange(c => ({ ...c, letters: { ...c.letters, items: c.letters?.items?.length ? c.letters.items : legacyLetterItems(c), [key]: value.slice(0, LIMITS[key]) } }));
  const edit = (i: number, key: keyof LetterItem, value: string) => setItems(list => list.map((it, j) => (j === i ? { ...it, [key]: value.slice(0, LIMITS[key]) } : it)));
  const move = (from: number, to: number) => setItems(list => { const next = [...list]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; });

  return (
    <div className="ltx" data-letters-editor>
      <p className="ltx-note">Write each letter below. Recipients open them one by one. {resolved.fromLegacy && "Your existing “Last note” lines are shown here — editing them here keeps the letters separate."}</p>

      <div className="ltx-field">
        <label htmlFor="ltx-heading">Page heading <span>{(config.letters?.heading ?? "").length}/{LIMITS.heading}</span></label>
        <input id="ltx-heading" aria-label="Letters heading" value={config.letters?.heading ?? ""} placeholder={resolved.heading} maxLength={LIMITS.heading} onChange={e => setMeta("heading", e.target.value)} />
      </div>
      <div className="ltx-field">
        <label htmlFor="ltx-sub">Subtitle</label>
        <input id="ltx-sub" aria-label="Letters subtitle" value={config.letters?.subtitle ?? ""} placeholder={resolved.subtitle} maxLength={LIMITS.subtitle} onChange={e => setMeta("subtitle", e.target.value)} />
      </div>
      <div className="ltx-field">
        <label htmlFor="ltx-sign">Signature (shown at the end of every letter)</label>
        <input id="ltx-sign" aria-label="Letters signature" value={config.letters?.signature ?? ""} placeholder={resolved.signature || "With love, …"} maxLength={LIMITS.signature} onChange={e => setMeta("signature", e.target.value)} />
      </div>

      <ol className="ltx-list">
        {items.map((it, i) => (
          <li key={i} className="ltx-item">
            <div className="ltx-item-head">
              <strong>Letter {String(i + 1).padStart(2, "0")}</strong>
              <div className="ltx-actions">
                <button type="button" aria-label={`Move letter ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                <button type="button" aria-label={`Move letter ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>↓</button>
                <button type="button" className="ltx-del" aria-label={`Delete letter ${i + 1}`} disabled={items.length <= 1} onClick={() => { if (window.confirm(`Delete letter ${i + 1}?`)) setItems(list => list.filter((_, j) => j !== i)); }}>Delete</button>
              </div>
            </div>
            <div className="ltx-row">
              <div className="ltx-field">
                <label htmlFor={`ltx-t-${i}`}>Title</label>
                <input id={`ltx-t-${i}`} aria-label={`Letter ${i + 1} title`} value={it.title ?? ""} placeholder={resolved.items[i]?.title} maxLength={LIMITS.title} onChange={e => edit(i, "title", e.target.value)} />
              </div>
              <div className="ltx-field">
                <label htmlFor={`ltx-h-${i}`}>Envelope hint</label>
                <input id={`ltx-h-${i}`} aria-label={`Letter ${i + 1} envelope hint`} value={it.hint ?? ""} placeholder={resolved.items[i]?.hint} maxLength={LIMITS.hint} onChange={e => edit(i, "hint", e.target.value)} />
              </div>
            </div>
            <div className="ltx-field">
              <label htmlFor={`ltx-b-${i}`}>Letter <span>{(it.body ?? "").length}/{LIMITS.body}</span></label>
              <textarea id={`ltx-b-${i}`} aria-label={`Letter ${i + 1} text`} rows={5} value={it.body ?? ""} maxLength={LIMITS.body} placeholder="Write from the heart…" onChange={e => edit(i, "body", e.target.value)} />
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="ltx-add" disabled={items.length >= MAX_LETTERS} onClick={() => setItems(list => [...list, { body: "" }])}>
        + Add letter {items.length >= MAX_LETTERS ? `(max ${MAX_LETTERS})` : ""}
      </button>
    </div>
  );
}
