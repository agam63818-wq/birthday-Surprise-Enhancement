import { useState } from "react";
import { TextField, TextAreaField, CheckboxField } from "./FormFields";
import FontPicker from "./FontPicker";
import SceneStickersEditor from "@/components/stickers/SceneStickersEditor";
import ExperienceSceneEditor from "./ExperienceSceneEditor";
import LettersEditor from "./LettersEditor";
import { OCCASION_IDS, OCCASION_META } from "@/lib/occasions";
import { THEME_PRESETS } from "@/lib/themePresets";
import { SCENE_REGISTRY, isSceneEnabled, setSceneEnabled } from "@/lib/v2/registry";
import { normalizeConfig, promoteToCinematic, DEFAULT_V2_SCENE_SEQUENCE, sceneReorder, notebookAddPage, notebookEditPage, notebookDeletePage, notebookReorderPages } from "@/lib/v2/migrate";
import type { SurpriseConfig, SceneId, SceneKey, NotebookPageType, NotebookPage } from "@/lib/v2/schema";
import { applyConfigPatch, PAGE_TYPES } from "../../../supabase/functions/_shared/configPatch";

interface Props { config: SurpriseConfig; onChange: (config: SurpriseConfig) => void }
export default function V2ExperienceEditor({ config, onChange }: Props) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [pageType, setPageType] = useState<NotebookPageType>("letter");
  const [error, setError] = useState("");
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({ letters: true });
  const n = normalizeConfig(config);
  const handleDetailsToggle = (key: string) => (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const open = e.currentTarget.open;
    setOpenDetails((prev) => ({ ...prev, [key]: open }));
  };
  const updateConfig = (next: SurpriseConfig | ((prev: SurpriseConfig) => SurpriseConfig)) =>
    onChange(typeof next === "function" ? next(config) : next);
  const v2Stickers = (sceneKey: SceneKey, label: string) => (
    <SceneStickersEditor
      sceneKey={sceneKey}
      sceneLabel={label}
      config={config}
      onChange={updateConfig}
      panelOpen={Boolean(openDetails[sceneKey])}
    />
  );
  const patch = (path: string, value: unknown) => {
    try { onChange(applyConfigPatch(config, { changes: [{ path, value }] })); setError(""); }
    catch { setError("Please use a valid value (media must be an http(s) URL or a local /path). Text may be up to 6,000 characters."); }
  };
  if (n.version !== 2) return <section className="v2-editor v2-panel">
    <p className="v2-eyebrow">CINEMATIC STUDIO</p><h2>A new way to give a little joy.</h2>
    <p>Your classic experience stays exactly as it is until you choose to upgrade. Names, messages, photos, music and existing custom themes are preserved.</p>
    <button type="button" onClick={() => onChange(promoteToCinematic(config))}>Upgrade to Cinematic Experience</button>
  </section>;
  const order = [...n.scenes, ...(Object.keys(SCENE_REGISTRY) as SceneId[]).filter(id => !n.scenes.includes(id))];
  const notebook = n.notebook;
  const editPage = (id: string, value: Partial<NotebookPage>) => patch("notebook.pages", notebookEditPage(notebook, id, value).pages);
  const text = (label: string, path: string, value: string | undefined, placeholder = "", multiline = false) => multiline
    ? <TextAreaField label={label} value={value ?? ""} onChange={v => patch(path, v)} placeholder={placeholder} />
    : <TextField label={label} value={value ?? ""} onChange={v => patch(path, v)} placeholder={placeholder} />;
  const enabled = (id: SceneId) => isSceneEnabled(id, n.scenes, n.features);
  const toggle = (id: SceneId, value: boolean) => {
    const feature = SCENE_REGISTRY[id].featureKey;
    if (!feature) return;
    const next = setSceneEnabled(n.scenes, n.features, id, value);
    onChange({ ...config, scenes: next.scenes, features: next.features });
  };
  const move = (from: number, to: number) => patch("scenes", sceneReorder(n.scenes, from, to));
  return <div className="v2-editor">
    <header className="v2-panel"><p className="v2-eyebrow">CINEMATIC STUDIO / V2</p><h2>Make it unmistakably yours.</h2><p>Everything here updates your Preview draft. Save when you are ready to share.</p></header>
    {error && <p role="alert">{error}</p>}
    <section className="v2-panel"><h3>Occasion & personalization</h3>
      <label>Occasion<select aria-label="Cinematic occasion" value={n.occasion} onChange={e => patch("occasionId", e.target.value)}>{OCCASION_IDS.map(id => <option key={id} value={id}>{OCCASION_META[id].label}</option>)}</select></label>
      {text("Recipient name", "name", config.name)}
      {text("Sender name", "giftReveal.senderName", config.giftReveal?.senderName)}
      {text("Main message", "celebration.message", config.celebration.message, "A few words from the heart", true)}
      <p>Occasion changes never replace your personal writing. Scene-specific name overrides remain yours.</p>
    </section>
    <section className="v2-panel"><h3>Set the atmosphere</h3><div className="v2-themes" role="group" aria-label="Cinematic themes">
      {Object.entries(THEME_PRESETS).map(([id, theme]) => <button key={id} type="button" aria-pressed={n.theme.preset === id} onClick={() => patch("themePreset", id)}><span className="v2-swatch" style={{ background: theme.swatchGradient }} />{theme.label}</button>)}
    </div></section>
    <section className="v2-panel"><h3>Your scene sequence</h3><p>Drag to arrange. The up/down buttons also work on phones and with a keyboard. Disabled scenes keep all their settings.</p>
      <button type="button" onClick={() => patch("scenes", [...DEFAULT_V2_SCENE_SEQUENCE])}>Restore recommended sequence</button>
      <p>Restores order only, not content or enabled settings.</p>
      <ol className="v2-scene-list">{order.map((id, index) => {
        const meta = SCENE_REGISTRY[id]; const inSequence = n.scenes.includes(id);
        return <li key={id} className="v2-scene-card" draggable={inSequence} onDragStart={e => { setDragged(index); e.dataTransfer.setData("text/plain", id); }} onDragEnd={() => setDragged(null)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragged !== null && inSequence) move(dragged, index); setDragged(null); }}>
          <div className="v2-scene-title"><span aria-hidden="true">{inSequence ? String(index + 1).padStart(2, "0") : "+"}</span><div><strong>{meta.label}</strong><p>{meta.description}</p>{meta.recommendedFor?.includes(n.occasion) && <small>Recommended for this occasion</small>}</div></div>
          <div className="v2-actions"><CheckboxField label={`Enable ${meta.label}`} checked={enabled(id)} onChange={v => toggle(id, v)} /><button type="button" aria-label={`Move ${meta.label} up`} disabled={!inSequence || index === 0} onClick={() => move(index, index - 1)}>Up</button><button type="button" aria-label={`Move ${meta.label} down`} disabled={!inSequence || index === n.scenes.length - 1} onClick={() => move(index, index + 1)}>Down</button></div>
        </li>;
      })}</ol>
    </section>
    <details className="v2-panel" open onToggle={handleDetailsToggle("letters")}><summary>Interactive letters</summary><CheckboxField label="Enable Letters" checked={enabled("letters")} onChange={v => toggle("letters", v)} />
      <LettersEditor config={config} onChange={updateConfig} />
      {v2Stickers("letters", "Interactive letters")}
    </details>
    <details className="v2-panel" onToggle={handleDetailsToggle("butterfly")}><summary>Butterfly reveal</summary><CheckboxField label="Enable Butterfly" checked={enabled("butterfly")} onChange={v => toggle("butterfly", v)} />
      {text("Butterfly message", "butterfly.message", config.butterfly?.message, "A little magic, just for you", true)}{text("Butterfly sub-message", "butterfly.subMessage", config.butterfly?.subMessage, "", true)}
      {v2Stickers("butterfly", "Butterfly reveal")}
    </details>
    <details className="v2-panel" onToggle={handleDetailsToggle("giftReveal")}><summary>Gift reveal</summary><CheckboxField label="Enable Gift Reveal" checked={enabled("giftReveal")} onChange={v => toggle("giftReveal", v)} />
      {text("Gift occasion text", "giftReveal.occasionText", config.giftReveal?.occasionText, `Uses ${OCCASION_META[n.occasion].label} when unset`)}
      {text("Gift recipient override", "giftReveal.recipientName", config.giftReveal?.recipientName, config.name)}
      <button type="button" onClick={() => { const giftReveal = { ...config.giftReveal }; delete giftReveal.recipientName; onChange({ ...config, giftReveal }); }}>Use main recipient name</button>
      {text("Gift sender", "giftReveal.senderName", config.giftReveal?.senderName)}
      {text("Gift message", "giftReveal.message", config.giftReveal?.message, "", true)}{text("Gift photo URL", "giftReveal.photoUrl", config.giftReveal?.photoUrl, "https://…")}
      {v2Stickers("giftReveal", "Gift reveal")}
    </details>
    <details className="v2-panel" onToggle={handleDetailsToggle("youAndMe")}><summary>You & Me</summary><CheckboxField label="Enable You & Me" checked={enabled("youAndMe")} onChange={v => toggle("youAndMe", v)} />
      {text("First name", "youAndMe.name1", config.youAndMe?.name1, n.sender.name)}{text("Second name", "youAndMe.name2", config.youAndMe?.name2, config.name)}
      {v2Stickers("youAndMe", "You & Me")}
    </details>
    <details className="v2-panel" onToggle={handleDetailsToggle("notebook")}><summary>Interactive notebook</summary><CheckboxField label="Enable Notebook" checked={enabled("notebook")} onChange={v => toggle("notebook", v)} />
      <p>Empty notebooks show a reading-only fallback. If all your custom pages are disabled, none are shown.</p>
      <label>New page type<select aria-label="New page type" value={pageType} onChange={e => setPageType(e.target.value as NotebookPageType)}>{PAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
      <button type="button" disabled={notebook.pages.length >= 40} onClick={() => patch("notebook.pages", notebookAddPage(notebook, pageType).pages)}>Add notebook page</button>
      {notebook.pages.map((page, index) => <fieldset key={page.id} className="v2-page-editor"><legend>Page {index + 1} · {page.type}</legend>
        <CheckboxField label={`Enable page ${index + 1}`} checked={page.enabled} onChange={enabled => editPage(page.id, { enabled })} />
        <TextField label="Page title" value={page.title} onChange={title => editPage(page.id, { title })} />
        {page.type === "cover" && <TextAreaField label="Page subtitle" value={page.subtitle} onChange={subtitle => editPage(page.id, { subtitle })} />}
        {page.type === "letter" && <TextAreaField label="Letter content" value={page.content} onChange={content => editPage(page.id, { content })} />}
        {(page.type === "quote" || page.type === "ending") && <TextAreaField label="Page text" value={page.text} onChange={text => editPage(page.id, { text })} />}
        {page.type === "memory" && <><TextField label="Memory image URL" value={page.image ?? ""} onChange={image => editPage(page.id, { image })} /><TextAreaField label="Memory caption" value={page.caption ?? ""} onChange={caption => editPage(page.id, { caption })} /></>}
        <div className="v2-actions"><button type="button" aria-label={`Move page ${index + 1} up`} disabled={index === 0} onClick={() => patch("notebook.pages", notebookReorderPages(notebook, index, index - 1).pages)}>Up</button><button type="button" aria-label={`Move page ${index + 1} down`} disabled={index === notebook.pages.length - 1} onClick={() => patch("notebook.pages", notebookReorderPages(notebook, index, index + 1).pages)}>Down</button><button type="button" onClick={() => patch("notebook.pages", notebookDeletePage(notebook, page.id).pages)}>Delete page</button></div>
      </fieldset>)}
      {v2Stickers("notebook", "Interactive notebook")}
    </details>
    <details className="v2-panel" onToggle={handleDetailsToggle("roseBloom")}><summary>Rose bloom finale</summary><CheckboxField label="Enable Rose Bloom" checked={enabled("roseBloom")} onChange={v => toggle("roseBloom", v)} />
      {text("Rose final text", "roseBloom.text", config.roseBloom?.text, "", true)}
      <label>Bloom speed<select value={n.roseBloom.speed} onChange={e => patch("roseBloom.speed", e.target.value)}>{["slow", "normal", "fast"].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Bloom intensity<select value={n.roseBloom.intensity} onChange={e => patch("roseBloom.intensity", e.target.value)}>{["subtle", "normal", "dramatic"].map(v => <option key={v}>{v}</option>)}</select></label>
      <CheckboxField label="Falling petals" checked={n.roseBloom.fallingPetals !== false} onChange={v => patch("roseBloom.fallingPetals", v)} /><CheckboxField label="Rose sound (respects global mute)" checked={n.roseBloom.soundEnabled !== false} onChange={v => patch("roseBloom.soundEnabled", v)} />
      {v2Stickers("roseBloom", "Rose bloom finale")}
    </details>
    <ExperienceSceneEditor
      sceneId="heartTunnel"
      config={config}
      occasion={n.occasion}
      enabled={enabled("heartTunnel")}
      onToggle={value => toggle("heartTunnel", value)}
      onPatch={patch}
      onDetailsToggle={handleDetailsToggle("heartTunnel")}
      stickers={v2Stickers("heartTunnel", "Heart Tunnel")}
    />
    <ExperienceSceneEditor
      sceneId="loveConfession"
      config={config}
      occasion={n.occasion}
      enabled={enabled("loveConfession")}
      onToggle={value => toggle("loveConfession", value)}
      onPatch={patch}
      onDetailsToggle={handleDetailsToggle("loveConfession")}
      stickers={v2Stickers("loveConfession", "Love Confession")}
    />
    <ExperienceSceneEditor
      sceneId="loveDrive"
      config={config}
      occasion={n.occasion}
      enabled={enabled("loveDrive")}
      onToggle={value => toggle("loveDrive", value)}
      onPatch={patch}
      onDetailsToggle={handleDetailsToggle("loveDrive")}
    />
    <section className="v2-panel"><h3>Typography</h3><p>Global reading style. Individual page choices below still take priority.</p><FontPicker value={config.textStyles?.global ?? "storybook"} onChange={v => patch("textStyles.global", v)} /></section>
  </div>;
}
