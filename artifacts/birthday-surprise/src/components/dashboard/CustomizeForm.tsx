import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/AuthLayout";
import { TextField, TextAreaField, CheckboxField } from "@/components/dashboard/FormFields";
import CardListEditor from "@/components/dashboard/CardListEditor";
import LinesListEditor from "@/components/dashboard/LinesListEditor";
import PhotoListEditor from "@/components/dashboard/PhotoListEditor";
import AudioField from "@/components/dashboard/AudioField";
import PaywallLock from "@/components/dashboard/PaywallLock";
import { supabase } from "@/lib/supabase";
import type { Config } from "@/config";
import type { SurpriseRow } from "@/types/surprise";

const SECTION_EMOJI: Record<string, string> = {
  Name: "💖", "Landing page": "🎁", Intro: "💌", "Cuteness meter": "🥰",
  Celebration: "🎉", "Cake page": "🎂", "Why you matter": "🌟", "Our story": "📖",
  "Memory wall": "📸", "Before you leave": "🥺", "Last note": "📝", Music: "🎵",
};

function SectionTitle({ children }: { children: string }) {
  return (
    <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.05rem", display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <span aria-hidden="true" style={{ fontSize: "1rem" }}>{SECTION_EMOJI[children] ?? "✨"}</span>
      {children}
    </span>
  );
}

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

    toast.success("Saved! Your surprise has been updated.");
    onSaved(data as SurpriseRow);
  };

  return (
    <div className="customize-shell" style={{ maxWidth: "560px", width: "100%", margin: "0 auto", padding: "0 4px" }}>
      <FormError>{validationError}</FormError>

      <Accordion type="multiple" defaultValue={["name"]}>
        <AccordionItem value="name">
          <AccordionTrigger><SectionTitle>Name</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Their name" value={config.name} onChange={(v) => setConfig((c) => ({ ...c, name: v }))} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="landing">
          <AccordionTrigger><SectionTitle>Landing page</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Title" value={config.landing.title} onChange={(v) => set("landing", { title: v })} />
            <TextField label="Subtitle" value={config.landing.subtitle} onChange={(v) => set("landing", { subtitle: v })} />
            <TextField label="Button text" value={config.landing.buttonText} onChange={(v) => set("landing", { buttonText: v })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="intro">
          <AccordionTrigger><SectionTitle>Intro</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Heading" value={config.intro.heading} onChange={(v) => set("intro", { heading: v })} />
            <TextAreaField label="Message" value={config.intro.message} onChange={(v) => set("intro", { message: v })} />
            <TextField label="Loading text" value={config.intro.loadingText} onChange={(v) => set("intro", { loadingText: v })} />
            <TextField label="Button text" value={config.intro.buttonText} onChange={(v) => set("intro", { buttonText: v })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cutenessMeter">
          <AccordionTrigger><SectionTitle>Cuteness meter</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Title" value={config.cutenessMeter.title} onChange={(v) => set("cutenessMeter", { title: v })} />
            <TextField label="Subtitle" value={config.cutenessMeter.subtitle} onChange={(v) => set("cutenessMeter", { subtitle: v })} />
            <TextField label="Scanning text" value={config.cutenessMeter.scanningText} onChange={(v) => set("cutenessMeter", { scanningText: v })} />
            <TextField label="Result text" value={config.cutenessMeter.resultText} onChange={(v) => set("cutenessMeter", { resultText: v })} />
            <TextField label="Result headline" value={config.cutenessMeter.resultHeadline} onChange={(v) => set("cutenessMeter", { resultHeadline: v })} />
            <TextAreaField label="Result message" value={config.cutenessMeter.resultMessage} onChange={(v) => set("cutenessMeter", { resultMessage: v })} />
            <TextField label="Button text" value={config.cutenessMeter.buttonText} onChange={(v) => set("cutenessMeter", { buttonText: v })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="celebration">
          <AccordionTrigger><SectionTitle>Celebration</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Title" value={config.celebration.title} onChange={(v) => set("celebration", { title: v })} />
            <TextField label="Subtitle 1" value={config.celebration.subtitle1} onChange={(v) => set("celebration", { subtitle1: v })} />
            <TextField label="Subtitle 2" value={config.celebration.subtitle2} onChange={(v) => set("celebration", { subtitle2: v })} />
            <TextField label="Badge" value={config.celebration.badge} onChange={(v) => set("celebration", { badge: v })} />
            <TextAreaField label="Message" value={config.celebration.message} onChange={(v) => set("celebration", { message: v })} />
            <TextField label="Button text" value={config.celebration.buttonText} onChange={(v) => set("celebration", { buttonText: v })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cake">
          <AccordionTrigger><SectionTitle>Cake page</SectionTitle></AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="whyYouMatter">
          <AccordionTrigger><SectionTitle>Why you matter</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Title" value={config.whyYouMatter.title} onChange={(v) => set("whyYouMatter", { title: v })} />
            <TextField label="Subtitle" value={config.whyYouMatter.subtitle} onChange={(v) => set("whyYouMatter", { subtitle: v })} />
            <TextField label="Button text" value={config.whyYouMatter.buttonText} onChange={(v) => set("whyYouMatter", { buttonText: v })} />
            <CardListEditor cards={config.whyYouMatter.cards} onChange={(cards) => set("whyYouMatter", { cards })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ourStory">
          <AccordionTrigger><SectionTitle>Our story</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Title" value={config.ourStory.title} onChange={(v) => set("ourStory", { title: v })} />
            <TextField label="Subtitle" value={config.ourStory.subtitle} onChange={(v) => set("ourStory", { subtitle: v })} />
            <TextField label="Button text" value={config.ourStory.buttonText} onChange={(v) => set("ourStory", { buttonText: v })} />
            <CardListEditor cards={config.ourStory.cards} onChange={(cards) => set("ourStory", { cards })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="memoryWall">
          <AccordionTrigger><SectionTitle>Memory wall</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextField label="Title" value={config.memoryWall.title} onChange={(v) => set("memoryWall", { title: v })} />
            <TextField label="Subtitle" value={config.memoryWall.subtitle} onChange={(v) => set("memoryWall", { subtitle: v })} />
            <TextField label="Button text" value={config.memoryWall.buttonText} onChange={(v) => set("memoryWall", { buttonText: v })} />
            <PhotoListEditor
              photos={config.memoryWall.photos}
              onChange={(photos) => set("memoryWall", { photos })}
              userId={surprise.user_id}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beforeLeave">
          <AccordionTrigger><SectionTitle>Before you leave</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <TextAreaField label="Message" value={config.beforeLeave.message} onChange={(v) => set("beforeLeave", { message: v })} rows={2} />
            <TextField label="Button text" value={config.beforeLeave.buttonText} onChange={(v) => set("beforeLeave", { buttonText: v })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="lastNote">
          <AccordionTrigger><SectionTitle>Last note</SectionTitle></AccordionTrigger>
          <AccordionContent>
            <LinesListEditor lines={config.lastNote.lines} onChange={(lines) => set("lastNote", { lines })} />
            <div style={{ marginTop: "16px" }}>
              <TextAreaField label="Final line 1" value={config.lastNote.finalLine1} onChange={(v) => set("lastNote", { finalLine1: v })} rows={2} />
              <TextAreaField label="Final line 2" value={config.lastNote.finalLine2} onChange={(v) => set("lastNote", { finalLine2: v })} rows={2} />
              <TextField label="Footer text" value={config.lastNote.footerText} onChange={(v) => set("lastNote", { footerText: v })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="audio">
          <AccordionTrigger><SectionTitle>Music</SectionTitle></AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div style={{ position: "sticky", bottom: "calc(12px + env(safe-area-inset-bottom, 0px))", marginTop: "24px", zIndex: 20 }}>
        <div
          style={{
            padding: "10px",
            borderRadius: "18px",
            background: "rgba(10,3,28,0.72)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(167,139,250,0.2)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
        >
          <Button className="w-full" size="lg" disabled={saving} onClick={handleSave}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : (
              "💾 Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
