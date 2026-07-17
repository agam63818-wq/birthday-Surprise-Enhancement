import { useEffect, useState } from "react";
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

// Romantic-theme section icons (kept from the existing emoji set)
const SECTION_EMOJI: Record<string, string> = {
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

export default function CustomizeForm({
  surprise,
  onSurpriseChange,
  onSaved,
}: {
  surprise: SurpriseRow;
  onSurpriseChange: (updated: SurpriseRow) => void;
  onSaved: (updated: SurpriseRow) => void;
}) {
  const [config, setConfig] = useState<Config>(() => structuredClone(surprise.config));
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["name"]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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

  const toggleSection = (key: string) => (open: boolean) =>
    setOpenSections((prev) => (open ? [...prev, key] : prev.filter((k) => k !== key)));

  const isOpen = (key: string) => openSections.includes(key);

  /* ── Per-section completion (required fields filled) ───────── */
  const filled = (s: string) => s.trim().length > 0;
  const completion: Record<string, boolean> = {
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
    toast.success("Saved! Your surprise has been updated. ✨");
    onSaved(data as SurpriseRow);
  };

  const item = (key: string, title: string, subtitle: string | undefined, children: React.ReactNode) => (
    <AccordionEditorItem
      key={key}
      icon={SECTION_EMOJI[key] ?? "✨"}
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
      <FormError>{validationError}</FormError>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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

        {item("cake", "Cake page", snip(config.cake.title), (
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
        ))}

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
