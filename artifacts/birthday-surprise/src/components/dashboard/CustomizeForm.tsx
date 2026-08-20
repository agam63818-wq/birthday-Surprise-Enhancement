import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AccordionEditorItem from "@/components/AccordionEditorItem";
import ProgressIndicator from "@/components/ProgressIndicator";
import SaveStatusIndicator from "@/components/dashboard/SaveStatusIndicator";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/AuthLayout";
import { TextField, TextAreaField, CheckboxField } from "@/components/dashboard/FormFields";
import CardListEditor from "@/components/dashboard/CardListEditor";
import LinesListEditor from "@/components/dashboard/LinesListEditor";
import PhotoListEditor from "@/components/dashboard/PhotoListEditor";
import AudioField from "@/components/dashboard/AudioField";
import PaywallLock from "@/components/dashboard/PaywallLock";
import FontPicker from "@/components/dashboard/FontPicker";
import { supabase } from "@/lib/supabase";
import type { Config } from "@/config";
import type { SurpriseRow } from "@/types/surprise";
import type { FontPresetId } from "@/lib/fontPresets";
import {
  THEME_PRESETS,
  DEFAULT_THEME_PRESET,
  type ThemePresetId,
} from "@/lib/themePresets";
import { OCCASION_META, OCCASION_DEFAULTS } from "@/lib/occasions";

// ── Occasion options (UI-visible subset; "custom" is reserved for later) ──
const OCCASION_OPTIONS: Array<{
  value: NonNullable<Config["occasionType"]>;
  label: string;
  emoji: string;
}> = [
  { value: "birthday",      label: "Birthday",       emoji: "🎂" },
  { value: "rakshabandhan", label: "Rakshabandhan",  emoji: "🪢" },
  { value: "fathersday",    label: "Father's Day",   emoji: "👨" },
  { value: "mothersday",    label: "Mother's Day",   emoji: "👩" },
  { value: "loveday",       label: "Love Day",       emoji: "💕" },
];

// ── Sub-component: Occasion selector + Theme swatch picker ────────────────
function OccasionAndThemeSection({
  occasionType,
  themeId,
  onOccasionChange,
  onThemeChange,
}: {
  occasionType: Config["occasionType"];
  themeId: Config["themeId"];
  onOccasionChange: (v: NonNullable<Config["occasionType"]>) => void;
  onThemeChange: (v: ThemePresetId) => void;
}) {
  const selectedOccasion = occasionType ?? "birthday";
  const selectedTheme: ThemePresetId = themeId ?? DEFAULT_THEME_PRESET;
  const themeIds = Object.keys(THEME_PRESETS) as ThemePresetId[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Occasion selector ─────────────────────────────────── */}
      <div>
        <p style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(220,185,255,0.7)",
          marginBottom: "10px",
        }}>
          Occasion
        </p>
        <div
          role="radiogroup"
          aria-label="Occasion type"
          style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
        >
          {OCCASION_OPTIONS.map(({ value, label, emoji }) => {
            const isActive = value === selectedOccasion;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onOccasionChange(value)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  lineHeight: 1.2,
                  border: isActive
                    ? "1px solid rgba(236,72,153,0.65)"
                    : "1px solid rgba(167,139,250,0.28)",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(236,72,153,0.28), rgba(124,58,237,0.22))"
                    : "rgba(167,139,250,0.08)",
                  color: isActive ? "#fde68a" : "var(--ink)",
                  boxShadow: isActive
                    ? "0 6px 22px rgba(236,72,153,0.28), 0 0 0 1px rgba(255,255,255,0.04) inset"
                    : "none",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  transition:
                    "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, color 0.25s ease",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: "0.95rem" }}>{emoji}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Color theme swatch picker ─────────────────────────── */}
      <div>
        <p style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(220,185,255,0.7)",
          marginBottom: "10px",
        }}>
          Color theme
        </p>
        <div
          role="radiogroup"
          aria-label="Color theme"
          style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
        >
          {themeIds.map((id) => {
            const preset = THEME_PRESETS[id];
            const isActive = id === selectedTheme;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onThemeChange(id)}
                title={preset.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 12px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  border: isActive
                    ? "2px solid rgba(236,72,153,0.75)"
                    : "2px solid rgba(167,139,250,0.22)",
                  background: isActive
                    ? "rgba(236,72,153,0.12)"
                    : "rgba(167,139,250,0.06)",
                  boxShadow: isActive
                    ? "0 6px 22px rgba(236,72,153,0.28)"
                    : "none",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  transition:
                    "border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
                  minWidth: "72px",
                }}
              >
                {/* Gradient swatch circle */}
                <span
                  aria-hidden="true"
                  style={{
                    display: "block",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: preset.swatchGradient,
                    boxShadow: isActive
                      ? "0 0 14px rgba(236,72,153,0.5)"
                      : "0 2px 8px rgba(0,0,0,0.4)",
                    border: "2px solid rgba(255,255,255,0.12)",
                    flexShrink: 0,
                  }}
                />
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#fde68a" : "var(--ink-soft)",
                  textAlign: "center",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                }}>
                  {preset.emoji} {preset.label}
                </span>
              </button>
            );
          })}
        </div>
        <p style={{
          marginTop: "8px",
          fontSize: "0.75rem",
          color: "rgba(220,185,255,0.6)",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}>
          The theme applies to the public surprise page. Preview it in the Preview tab.
        </p>
      </div>
    </div>
  );
}

// Romantic-theme section icons (kept from the existing emoji set).
// The "cake" entry is a fallback — the accordion label is built dynamically
// from OCCASION_META so it reads e.g. "🪢 Rakhi page" for rakshabandhan.
const SECTION_EMOJI: Record<string, string> = {
  occasionAndTheme: "🎊",
  name: "💖", landing: "🎁", intro: "💌", cutenessMeter: "🥰",
  celebration: "🎉", cake: "🎂", whyYouMatter: "🌟", ourStory: "📖",
  memoryWall: "📸", beforeLeave: "🥺", lastNote: "📝", audio: "🎵",
};

/** One-line preview under a section header (nice-to-have summary). */
const snip = (s: string, n = 36): string | undefined => {
  const t = s.trim();
  if (!t) return undefined;
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const DRAFT_KEY = (surpriseId: string) => `customize-draft:${surpriseId}`;

export default function CustomizeForm({
  surprise,
  onSurpriseChange,
  onSaved,
}: {
  surprise: SurpriseRow;
  onSurpriseChange: (updated: SurpriseRow) => void;
  onSaved: (updated: SurpriseRow) => void;
}) {
  // On mount, restore a saved draft if one exists and differs from the DB config.
  const [config, setConfig] = useState<Config>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(surprise.id));
      if (raw) {
        const draft = JSON.parse(raw) as Config;
        if (JSON.stringify(draft) !== JSON.stringify(surprise.config)) {
          return draft; // will show the "restored" banner below
        }
      }
    } catch { /* ignore corrupt draft */ }
    return structuredClone(surprise.config);
  });

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["name"]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Show the "restored draft" notice only when we actually loaded a draft.
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(surprise.id));
      if (raw) {
        const draft = JSON.parse(raw) as Config;
        return JSON.stringify(draft) !== JSON.stringify(surprise.config);
      }
    } catch { /* ignore */ }
    return false;
  });

  // Debounced autosave to localStorage (~500 ms after last change).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY(surprise.id), JSON.stringify(config));
      } catch { /* storage full — ignore */ }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [config, surprise.id]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY(surprise.id)); } catch { /* ignore */ }
    setDraftRestored(false);
  };

  const discardDraft = () => {
    clearDraft();
    setConfig(structuredClone(surprise.config));
  };

  // Local edits vs the saved row — drives the save-status pill and the
  // smart Save button (same comparison the beforeunload guard uses).
  const dirty = JSON.stringify(config) !== JSON.stringify(surprise.config);

  // Warn before closing/refreshing the page with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(config) !== JSON.stringify(surprise.config)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [config, surprise.config]);

  if (!surprise.is_paid) {
    return (
      <PaywallLock
        surprise={surprise}
        onUnlocked={() => onSurpriseChange({ ...surprise, is_paid: true })}
      />
    );
  }

  const set = <K extends keyof Config>(section: K, patch: Partial<Config[K]>) => {
    setConfig((c) => ({ ...c, [section]: { ...(c[section] as object), ...patch } }));
  };

  // textStyles is a new OPTIONAL top-level key (not a patch to an existing
  // section), so it needs its own setter.
  type FontPageKey = keyof NonNullable<Config["textStyles"]>;
  const setFont = (page: FontPageKey, id: FontPresetId) => {
    setConfig((c) => ({
      ...c,
      textStyles: { ...(c.textStyles ?? {}), [page]: id },
    }));
  };

  // occasionType and themeId are also OPTIONAL top-level keys.
  const setOccasionType = (value: NonNullable<Config["occasionType"]>) => {
    setConfig((c) => ({ ...c, occasionType: value }));
  };
  const setThemeId = (value: ThemePresetId) => {
    setConfig((c) => ({ ...c, themeId: value }));
  };

  // occasionContent is an OPTIONAL top-level key with nested occasion sub-keys.
  // Each sub-key is also optional — only write what the user has filled in.
  type OccasionKey = keyof NonNullable<Config["occasionContent"]>;
  const setOccasionContent = <K extends OccasionKey>(
    occasion: K,
    patch: Partial<NonNullable<NonNullable<Config["occasionContent"]>[K]>>,
  ) => {
    setConfig((c) => ({
      ...c,
      occasionContent: {
        ...(c.occasionContent ?? {}),
        [occasion]: {
          ...(c.occasionContent?.[occasion] ?? {}),
          ...patch,
        },
      },
    }));
  };

  const toggleSection = (key: string) => (open: boolean) =>
    setOpenSections((prev) => (open ? [...prev, key] : prev.filter((k) => k !== key)));

  const isOpen = (key: string) => openSections.includes(key);

  /* ── Per-section completion (required fields filled) ───────── */
  const filled = (s: string) => s.trim().length > 0;
  const completion: Record<string, boolean> = {
    // occasionAndTheme is always "complete" — both fields have safe defaults.
    occasionAndTheme: true,
    name: filled(config.name),
    landing: filled(config.landing.title) && filled(config.landing.subtitle) && filled(config.landing.buttonText),
    intro: filled(config.intro.heading) && filled(config.intro.message),
    cutenessMeter: filled(config.cutenessMeter.title) && filled(config.cutenessMeter.resultMessage),
    celebration: filled(config.celebration.title) && filled(config.celebration.message),
    cake: filled(config.cake.title) && filled(config.cake.message),
    whyYouMatter: filled(config.whyYouMatter.title) && config.whyYouMatter.cards.length > 0,
    ourStory: filled(config.ourStory.title) && config.ourStory.cards.length > 0,
    memoryWall: filled(config.memoryWall.title) && config.memoryWall.photos.length > 0,
    beforeLeave: filled(config.beforeLeave.message) && filled(config.beforeLeave.buttonText),
    lastNote: config.lastNote.lines.length > 0 && filled(config.lastNote.finalLine1) && filled(config.lastNote.finalLine2),
    audio: filled(config.audio.backgroundMusic) && filled(config.audio.birthdaySong),
  };
  const totalSections = Object.keys(completion).length;
  const completedCount = Object.values(completion).filter(Boolean).length;

  const handleSave = async () => {
    const missing: string[] = [];
    if (!config.name.trim()) missing.push("Name");
    if (!config.landing.title.trim()) missing.push("Landing title");
    if (!config.landing.subtitle.trim()) missing.push("Landing subtitle");
    if (!config.intro.heading.trim()) missing.push("Intro heading");
    if (!config.intro.message.trim()) missing.push("Intro message");
    if (!config.lastNote.finalLine1.trim()) missing.push("Last note — final line 1");
    if (!config.lastNote.finalLine2.trim()) missing.push("Last note — final line 2");

    if (missing.length > 0) {
      setValidationError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    setValidationError(null);
    setSaving(true);

    const photo_urls = config.memoryWall.photos.map((p) => p.src).filter(Boolean);
    const audio_urls = [config.audio.backgroundMusic, config.audio.birthdaySong].filter(Boolean);

    const { data, error } = await supabase
      .from("surprises")
      .update({ config, photo_urls, audio_urls })
      .eq("id", surprise.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error("Couldn't save your changes. Please try again.");
      return;
    }

    setLastSavedAt(new Date());
    clearDraft();
    toast.success("Saved! Your surprise has been updated. ✨");
    onSaved(data as SurpriseRow);
  };

  const item = (key: string, title: string, subtitle: string | undefined, children: React.ReactNode, emojiOverride?: string) => (
    <AccordionEditorItem
      key={key}
      icon={emojiOverride ?? SECTION_EMOJI[key] ?? "✨"}
      title={title}
      subtitle={subtitle}
      open={isOpen(key)}
      onToggle={toggleSection(key)}
      complete={completion[key]}
    >
      {children}
    </AccordionEditorItem>
  );

  return (
    <div className="customize-shell" style={{ maxWidth: "560px", width: "100%", margin: "0 auto", padding: "0 4px" }}>
      {/* Draft-restored notice */}
      {draftRestored && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "10px 14px",
            marginBottom: "12px",
            borderRadius: "var(--rad-md)",
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.3)",
            fontSize: "0.8rem",
            color: "var(--ink-soft)",
          }}
        >
          <span>✏️ Restored your unsaved changes.</span>
          <button
            type="button"
            onClick={discardDraft}
            style={{
              background: "none",
              border: "none",
              color: "var(--pink)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "inherit",
              padding: 0,
              flexShrink: 0,
            }}
          >
            Discard
          </button>
        </div>
      )}

      <FormError>{validationError}</FormError>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* ── Occasion & Theme — always at the top ─────────────── */}
        {item("occasionAndTheme", "Occasion & Theme", undefined, (
          <OccasionAndThemeSection
            occasionType={config.occasionType}
            themeId={config.themeId}
            onOccasionChange={setOccasionType}
            onThemeChange={setThemeId}
          />
        ))}

        {item("name", "Name", snip(config.name), (
          <TextField label="Their name" value={config.name} onChange={(v) => setConfig((c) => ({ ...c, name: v }))} />
        ))}

        {item("landing", "Landing page", snip(config.landing.title), (
          <>
            <FontPicker value={config.textStyles?.landing} onChange={(id) => setFont("landing", id)} />
            <TextField label="Title" value={config.landing.title} onChange={(v) => set("landing", { title: v })} />
            <TextField label="Subtitle" value={config.landing.subtitle} onChange={(v) => set("landing", { subtitle: v })} />
            <TextField label="Button text" value={config.landing.buttonText} onChange={(v) => set("landing", { buttonText: v })} />
          </>
        ))}

        {item("intro", "Intro", snip(config.intro.heading), (
          <>
            <FontPicker value={config.textStyles?.intro} onChange={(id) => setFont("intro", id)} />
            <TextField label="Heading" value={config.intro.heading} onChange={(v) => set("intro", { heading: v })} />
            <TextAreaField label="Message" value={config.intro.message} onChange={(v) => set("intro", { message: v })} />
            <TextField label="Loading text" value={config.intro.loadingText} onChange={(v) => set("intro", { loadingText: v })} />
            <TextField label="Button text" value={config.intro.buttonText} onChange={(v) => set("intro", { buttonText: v })} />
          </>
        ))}

        {item("cutenessMeter", "Cuteness meter", snip(config.cutenessMeter.title), (
          <>
            <FontPicker value={config.textStyles?.cutenessMeter} onChange={(id) => setFont("cutenessMeter", id)} />
            <TextField label="Title" value={config.cutenessMeter.title} onChange={(v) => set("cutenessMeter", { title: v })} />
            <TextField label="Subtitle" value={config.cutenessMeter.subtitle} onChange={(v) => set("cutenessMeter", { subtitle: v })} />
            <TextField label="Scanning text" value={config.cutenessMeter.scanningText} onChange={(v) => set("cutenessMeter", { scanningText: v })} />
            <TextField label="Result text" value={config.cutenessMeter.resultText} onChange={(v) => set("cutenessMeter", { resultText: v })} />
            <TextField label="Result headline" value={config.cutenessMeter.resultHeadline} onChange={(v) => set("cutenessMeter", { resultHeadline: v })} />
            <TextAreaField label="Result message" value={config.cutenessMeter.resultMessage} onChange={(v) => set("cutenessMeter", { resultMessage: v })} />
            <TextField label="Button text" value={config.cutenessMeter.buttonText} onChange={(v) => set("cutenessMeter", { buttonText: v })} />
          </>
        ))}

        {item("celebration", "Celebration", snip(config.celebration.title), (
          <>
            <FontPicker value={config.textStyles?.celebration} onChange={(id) => setFont("celebration", id)} />
            <TextField label="Title" value={config.celebration.title} onChange={(v) => set("celebration", { title: v })} />
            <TextField label="Subtitle 1" value={config.celebration.subtitle1} onChange={(v) => set("celebration", { subtitle1: v })} />
            <TextField label="Subtitle 2" value={config.celebration.subtitle2} onChange={(v) => set("celebration", { subtitle2: v })} />
            <TextField label="Badge" value={config.celebration.badge} onChange={(v) => set("celebration", { badge: v })} />
            <TextAreaField label="Message" value={config.celebration.message} onChange={(v) => set("celebration", { message: v })} />
            <TextField label="Button text" value={config.celebration.buttonText} onChange={(v) => set("celebration", { buttonText: v })} />
          </>
        ))}

        {/* ── Occasion-aware hero page section ─────────────────── */}
        {(() => {
          const occ = config.occasionType ?? "birthday";
          const meta = OCCASION_META[occ];
          const sectionEmoji = meta?.emoji ?? SECTION_EMOJI.cake;
          const sectionLabel = occ === "birthday" || occ === "custom"
            ? "Cake page"
            : `${meta?.heroLabel ?? meta?.label ?? "Hero"} page`;
          const sectionSubtitle = occ === "birthday" || occ === "custom"
            ? snip(config.cake.title)
            : snip(config.occasionContent?.[occ as keyof NonNullable<Config["occasionContent"]>]?.title ?? "");

          const el = item("cake", sectionLabel, sectionSubtitle, (() => {
            if (occ === "birthday" || occ === "custom") {
              // ── Birthday / Custom: existing fields unchanged ──────
              return (
                <>
                  <FontPicker value={config.textStyles?.cake} onChange={(id) => setFont("cake", id)} />
                  <TextField label="Title" value={config.cake.title} onChange={(v) => set("cake", { title: v })} />
                  <TextField label="Subtitle" value={config.cake.subtitle} onChange={(v) => set("cake", { subtitle: v })} />
                  <TextField label="Tap hint" value={config.cake.tapHint} onChange={(v) => set("cake", { tapHint: v })} />
                  <CheckboxField
                    label="Use my own cake photo instead of the drawn cake"
                    checked={config.cake.useImage}
                    onChange={(v) => set("cake", { useImage: v })}
                  />
                  <TextAreaField label="Message (shown after cutting)" value={config.cake.message} onChange={(v) => set("cake", { message: v })} />
                  <TextField label="Button text" value={config.cake.buttonText} onChange={(v) => set("cake", { buttonText: v })} />
                </>
              );
            }

            if (occ === "rakshabandhan") {
              const saved = config.occasionContent?.rakshabandhan ?? {};
              const defs = OCCASION_DEFAULTS.rakshabandhan;
              return (
                <>
                  <FontPicker value={config.textStyles?.cake} onChange={(id) => setFont("cake", id)} />
                  <TextField
                    label="Title"
                    value={saved.title ?? ""}
                    onChange={(v) => setOccasionContent("rakshabandhan", { title: v })}
                    placeholder={defs.title}
                  />
                  <TextField
                    label="Sibling's name (optional — woven into the title)"
                    value={saved.siblingName ?? ""}
                    onChange={(v) => setOccasionContent("rakshabandhan", { siblingName: v })}
                    placeholder="e.g. Bhai, Didi…"
                  />
                  <TextAreaField
                    label="Message (shown after tying the rakhi)"
                    value={saved.message ?? ""}
                    onChange={(v) => setOccasionContent("rakshabandhan", { message: v })}
                    placeholder={defs.message}
                  />
                  <TextField
                    label="Button text"
                    value={saved.buttonText ?? ""}
                    onChange={(v) => setOccasionContent("rakshabandhan", { buttonText: v })}
                    placeholder={defs.buttonText}
                  />
                </>
              );
            }

            if (occ === "fathersday") {
              const saved = config.occasionContent?.fathersday ?? {};
              const defs = OCCASION_DEFAULTS.fathersday;
              return (
                <>
                  <FontPicker value={config.textStyles?.cake} onChange={(id) => setFont("cake", id)} />
                  <TextField
                    label="Title"
                    value={saved.title ?? ""}
                    onChange={(v) => setOccasionContent("fathersday", { title: v })}
                    placeholder={defs.title}
                  />
                  <TextAreaField
                    label="Message (shown after the reveal)"
                    value={saved.message ?? ""}
                    onChange={(v) => setOccasionContent("fathersday", { message: v })}
                    placeholder={defs.message}
                  />
                  <TextField
                    label="Button text"
                    value={saved.buttonText ?? ""}
                    onChange={(v) => setOccasionContent("fathersday", { buttonText: v })}
                    placeholder={defs.buttonText}
                  />
                  <p style={{ fontSize: "0.75rem", color: "rgba(220,185,255,0.6)", marginTop: "4px", fontStyle: "italic" }}>
                    Tip: Add a photo in the Memory Wall section — it will appear in the Father's Day frame.
                  </p>
                </>
              );
            }

            if (occ === "mothersday") {
              const saved = config.occasionContent?.mothersday ?? {};
              const defs = OCCASION_DEFAULTS.mothersday;
              return (
                <>
                  <FontPicker value={config.textStyles?.cake} onChange={(id) => setFont("cake", id)} />
                  <TextField
                    label="Title"
                    value={saved.title ?? ""}
                    onChange={(v) => setOccasionContent("mothersday", { title: v })}
                    placeholder={defs.title}
                  />
                  <TextAreaField
                    label="Message (shown after the bloom)"
                    value={saved.message ?? ""}
                    onChange={(v) => setOccasionContent("mothersday", { message: v })}
                    placeholder={defs.message}
                  />
                  <TextField
                    label="Button text"
                    value={saved.buttonText ?? ""}
                    onChange={(v) => setOccasionContent("mothersday", { buttonText: v })}
                    placeholder={defs.buttonText}
                  />
                  <p style={{ fontSize: "0.75rem", color: "rgba(220,185,255,0.6)", marginTop: "4px", fontStyle: "italic" }}>
                    Tip: Add a photo in the Memory Wall section — it will appear in the Mother's Day frame.
                  </p>
                </>
              );
            }

            if (occ === "loveday") {
              const saved = config.occasionContent?.loveday ?? {};
              const defs = OCCASION_DEFAULTS.loveday;
              return (
                <>
                  <FontPicker value={config.textStyles?.cake} onChange={(id) => setFont("cake", id)} />
                  <TextField
                    label="Title"
                    value={saved.title ?? ""}
                    onChange={(v) => setOccasionContent("loveday", { title: v })}
                    placeholder={defs.title}
                  />
                  <TextAreaField
                    label="Message (shown after unlocking the heart)"
                    value={saved.message ?? ""}
                    onChange={(v) => setOccasionContent("loveday", { message: v })}
                    placeholder={defs.message}
                  />
                  <TextField
                    label="Button text"
                    value={saved.buttonText ?? ""}
                    onChange={(v) => setOccasionContent("loveday", { buttonText: v })}
                    placeholder={defs.buttonText}
                  />
                </>
              );
            }

            return null;
          })(), sectionEmoji);

          return el;
        })()}

        {item("whyYouMatter", "Why you matter", `${config.whyYouMatter.cards.length} cards`, (
          <>
            <FontPicker value={config.textStyles?.whyYouMatter} onChange={(id) => setFont("whyYouMatter", id)} />
            <TextField label="Title" value={config.whyYouMatter.title} onChange={(v) => set("whyYouMatter", { title: v })} />
            <TextField label="Subtitle" value={config.whyYouMatter.subtitle} onChange={(v) => set("whyYouMatter", { subtitle: v })} />
            <TextField label="Button text" value={config.whyYouMatter.buttonText} onChange={(v) => set("whyYouMatter", { buttonText: v })} />
            <CardListEditor cards={config.whyYouMatter.cards} onChange={(cards) => set("whyYouMatter", { cards })} />
          </>
        ))}

        {item("ourStory", "Our story", `${config.ourStory.cards.length} moments`, (
          <>
            <FontPicker value={config.textStyles?.ourStory} onChange={(id) => setFont("ourStory", id)} />
            <TextField label="Title" value={config.ourStory.title} onChange={(v) => set("ourStory", { title: v })} />
            <TextField label="Subtitle" value={config.ourStory.subtitle} onChange={(v) => set("ourStory", { subtitle: v })} />
            <TextField label="Button text" value={config.ourStory.buttonText} onChange={(v) => set("ourStory", { buttonText: v })} />
            <CardListEditor cards={config.ourStory.cards} onChange={(cards) => set("ourStory", { cards })} />
          </>
        ))}

        {item("memoryWall", "Memory wall", `${config.memoryWall.photos.length} photos`, (
          <>
            <FontPicker value={config.textStyles?.memoryWall} onChange={(id) => setFont("memoryWall", id)} />
            <TextField label="Title" value={config.memoryWall.title} onChange={(v) => set("memoryWall", { title: v })} />
            <TextField label="Subtitle" value={config.memoryWall.subtitle} onChange={(v) => set("memoryWall", { subtitle: v })} />
            <TextField label="Button text" value={config.memoryWall.buttonText} onChange={(v) => set("memoryWall", { buttonText: v })} />
            <PhotoListEditor
              photos={config.memoryWall.photos}
              onChange={(photos) => set("memoryWall", { photos })}
              userId={surprise.user_id}
            />
          </>
        ))}

        {item("beforeLeave", "Before you leave", snip(config.beforeLeave.message), (
          <>
            <FontPicker value={config.textStyles?.beforeLeave} onChange={(id) => setFont("beforeLeave", id)} />
            <TextAreaField label="Message" value={config.beforeLeave.message} onChange={(v) => set("beforeLeave", { message: v })} rows={2} />
            <TextField label="Button text" value={config.beforeLeave.buttonText} onChange={(v) => set("beforeLeave", { buttonText: v })} />
          </>
        ))}

        {item("lastNote", "Last note", `${config.lastNote.lines.length} lines`, (
          <>
            <FontPicker
              value={config.textStyles?.lastNote}
              onChange={(id) => setFont("lastNote", id)}
              helperText="Tip: 'Clean & Readable' works great for longer Hinglish messages"
            />
            <LinesListEditor lines={config.lastNote.lines} onChange={(lines) => set("lastNote", { lines })} />
            <div style={{ marginTop: "16px" }}>
              <TextAreaField label="Final line 1" value={config.lastNote.finalLine1} onChange={(v) => set("lastNote", { finalLine1: v })} rows={2} />
              <TextAreaField label="Final line 2" value={config.lastNote.finalLine2} onChange={(v) => set("lastNote", { finalLine2: v })} rows={2} />
              <TextField label="Footer text" value={config.lastNote.footerText} onChange={(v) => set("lastNote", { footerText: v })} />
            </div>
          </>
        ))}

        {item("audio", "Music", `${[config.audio.backgroundMusic, config.audio.birthdaySong].filter(Boolean).length} of 2 songs set`, (
          <>
            <AudioField
              label="Background music"
              value={config.audio.backgroundMusic}
              onChange={(url) => set("audio", { backgroundMusic: url })}
              userId={surprise.user_id}
            />
            <AudioField
              label="Birthday song (plays after cutting the cake)"
              value={config.audio.birthdaySong}
              onChange={(url) => set("audio", { birthdaySong: url })}
              userId={surprise.user_id}
            />
            <CheckboxField
              label="Use gentle chime tones if the uploaded songs fail to play"
              checked={config.audio.useFallbackTones}
              onChange={(v) => set("audio", { useFallbackTones: v })}
            />
          </>
        ))}
      </div>

      {/* Sticky save bar — always reachable, with live completion state */}
      <div style={{ position: "sticky", bottom: "calc(12px + env(safe-area-inset-bottom, 0px))", marginTop: "24px", zIndex: 20 }}>
        <div
          style={{
            padding: "12px",
            borderRadius: "var(--rad-md)",
            background: "rgba(10,3,28,0.72)",
            backdropFilter: "blur(var(--blur-soft))",
            WebkitBackdropFilter: "blur(var(--blur-soft))",
            border: "1px solid rgba(167,139,250,0.2)",
            boxShadow: "var(--shadow-medium)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <ProgressIndicator completed={completedCount} total={totalSections} />
          <SaveStatusIndicator dirty={dirty} saving={saving} lastSavedAt={lastSavedAt} />
          <Button className="w-full" size="lg" disabled={saving || !dirty} onClick={handleSave}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : dirty ? (
              "💾 Save changes"
            ) : (
              "✓ All changes saved"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
