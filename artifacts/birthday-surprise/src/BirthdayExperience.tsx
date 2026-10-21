import { useState, useCallback, useMemo, useEffect, type ReactNode, type CSSProperties } from "react";
import Background from "@/components/Background";
import MusicToggle, { useBackgroundMusic } from "@/components/MusicPlayer";
import SurprisePopup from "@/components/SurprisePopup";
import FunLayer from "@/components/FunLayer";
import PageLanding from "@/pages/PageLanding";
import PageIntro from "@/pages/PageIntro";
import PageCutenessMeter from "@/pages/PageCutenessMeter";
import PageCelebration from "@/pages/PageCelebration";
import PageCake from "@/pages/PageCake";
import PageRakhi from "@/pages/PageRakhi";
import PageFamilyDay from "@/pages/PageFamilyDay";
import PageLoveDay from "@/pages/PageLoveDay";
import PageWhyYouMatter from "@/pages/PageWhyYouMatter";
import PageOurStory from "@/pages/PageOurStory";
import PageMemoryWall from "@/pages/PageMemoryWall";
import PageBeforeYouLeave from "@/pages/PageBeforeYouLeave";
import PageLastNote from "@/pages/PageLastNote";
import defaultConfig, { type Config } from "@/config";
import { ConfigProvider, useConfig, useNormalizedConfig } from "@/contexts/ConfigContext";
import { FONT_PRESETS } from "@/lib/fontPresets";
import { THEME_PRESETS } from "@/lib/themePresets";
import type { StickersConfig, SurpriseConfig } from "@/lib/v2/schema";
import SceneEngine from "@/scenes/SceneEngine";
import StickerLayer from "@/components/stickers/StickerLayer";
import { resolveActiveSceneKey } from "@/lib/stickers/model";

const PAGES = [
  "landing", "intro", "cuteness", "celebration",
  "cake", "whyYouMatter", "ourStory", "memoryWall",
  "beforeLeave", "lastNote",
] as const;
type Page = typeof PAGES[number];

// Ambient live FX on every page — drifting petals + floating balloons.
// Pure CSS animations (transform/opacity only) so it stays 60fps on phones.
function AmbientFX() {
  const petals = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    id: i,
    left: `${(i * 9.7 + 3) % 96}%`,
    delay: `${(i * 1.9) % 16}s`,
    duration: `${14 + (i * 1.3) % 10}s`,
    size: 10 + (i * 5) % 12,
    glyph: ["✿", "❀", "✧", "❁", "✦"][i % 5],
    color: [
      "rgba(249,168,212,0.5)",
      "rgba(196,181,253,0.45)",
      "rgba(232,121,249,0.4)",
      "rgba(253,224,71,0.3)",
      "rgba(244,114,182,0.45)",
    ][i % 5],
  })), []);

  const balloons = useMemo(() => Array.from({ length: 3 }, (_, i) => ({
    id: i,
    left: `${12 + i * 34}%`,
    delay: `${i * 8 + 4}s`,
    duration: `${20 + i * 4}s`,
    size: 24 + i * 6,
    filter: `hue-rotate(${i * 70}deg) saturate(0.9)`,
  })), []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden" }}>
      {petals.map(p => (
        <span key={p.id} style={{
          position: "absolute", top: "-6vh", left: p.left,
          fontSize: `${p.size}px`, lineHeight: 1, color: p.color,
          animation: `petal-fall ${p.duration} linear ${p.delay} infinite`,
          willChange: "transform, opacity",
        }}>{p.glyph}</span>
      ))}
      {balloons.map(b => (
        <span key={b.id} style={{
          position: "absolute", bottom: "-12vh", left: b.left,
          fontSize: `${b.size}px`, lineHeight: 1,
          filter: b.filter, opacity: 0,
          animation: `balloon-rise ${b.duration} ease-in ${b.delay} infinite`,
          willChange: "transform, opacity",
        }}>🎈</span>
      ))}
    </div>
  );
}

// Renders the full birthday experience for a given `config` — either the
// bundled default (unused now, kept for safety/testing), a user's own live
// row from `surprises` (dashboard Preview tab), or a publicly fetched
// config via the `get_surprise_by_slug` RPC (public share page). Every
// page/component below reads config via `useConfig()` from context instead
// of importing the static config.ts module directly.
//
// `landingFooter` (optional) is rendered BELOW the landing hero only — it is
// used by the public "/" route to show the crawlable About/FAQ section. It is
// never passed for share links or the dashboard preview, so those are
// pixel-identical to before.
const DEV_PREVIEW_STICKERS: StickersConfig = {
  version: 1,
  scenes: {
    landing: {
      enabled: true,
      items: [
        { uid: "dev-landing-1", stickerId: "kitty-22", x: 0.16, y: 0.24, w: 0.16, rotate: -10, z: 1 },
      ],
    },
    intro: {
      enabled: true,
      items: [
        { uid: "dev-intro-1", stickerId: "kitty-02", x: 0.84, y: 0.22, w: 0.18, rotate: 8, z: 1 },
      ],
    },
  },
};

export default function BirthdayExperience({
  config = defaultConfig,
  landingFooter,
}: {
  config?: SurpriseConfig;
  landingFooter?: ReactNode;
}) {
  const effectiveConfig = useMemo(() => {
    if (
      import.meta.env.DEV &&
      !config.stickers &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("devStickers") === "1"
    ) {
      return { ...config, stickers: DEV_PREVIEW_STICKERS };
    }
    return config;
  }, [config]);

  return (
    <ConfigProvider config={effectiveConfig}>
      <ExperienceTheme><BirthdayExperienceInner landingFooter={landingFooter} /></ExperienceTheme>
    </ConfigProvider>
  );
}

function ExperienceTheme({ children }: { children: ReactNode }) {
  const normalized = useNormalizedConfig();
  const vars = THEME_PRESETS[normalized.theme.preset]?.vars ?? THEME_PRESETS.midnightPurple.vars;
  return <div className={normalized.version === 2 ? "experience-root cinematic-experience" : "experience-root"}
    data-theme={normalized.theme.preset} style={{ ...vars, ...(normalized.raw.textStyles?.global ? { "--v2-body-font": FONT_PRESETS[normalized.raw.textStyles.global].fontFamily } : {}), background: "var(--bg-deep)", color: "var(--ink)", minHeight: "100dvh", isolation: "isolate" } as CSSProperties}>{children}</div>;
}

export function renderLegacySceneById(
  sceneId: string,
  occasion: string | undefined,
  onNext: () => void,
  playCakeSongFn?: () => void,
) {
  const renderHero = () => {
    switch (occasion) {
      case "rakshabandhan":
        return <PageRakhi onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "fathersday":
        return <PageFamilyDay occasion="fathersday" onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "mothersday":
        return <PageFamilyDay occasion="mothersday" onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "romantic":
      case "anniversary":
      case "loveday":
        return <PageLoveDay onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "birthday":
      case "custom":
      default:
        return <PageCake onNext={onNext} playCakeSong={playCakeSongFn} />;
    }
  };

  switch (sceneId) {
    case "landing":      return <PageLanding onNext={onNext} />;
    case "intro":        return <PageIntro onNext={onNext} />;
    case "cuteness":     return <PageCutenessMeter onNext={onNext} />;
    case "celebration":  return <PageCelebration onNext={onNext} />;
    case "cake":
    case "rakhiHero":
    case "familyHero":
    case "loveDayHero":  return renderHero();
    case "whyYouMatter": return <PageWhyYouMatter onNext={onNext} />;
    case "ourStory":     return <PageOurStory onNext={onNext} />;
    case "memoryWall":   return <PageMemoryWall onNext={onNext} />;
    case "beforeLeave":  return <PageBeforeYouLeave onNext={onNext} />;
    case "lastNote":     return <PageLastNote />;
    default:             return null;
  }
}

function BirthdayExperienceInner({ landingFooter }: { landingFooter?: ReactNode }) {
  const config = useConfig();
  const normalized = useNormalizedConfig();
  const [page, setPage] = useState<Page>("landing");
  const [transitioning, setTransitioning] = useState(false);
  const { start, stop, playing, playCakeSong, onSceneChange, audioError } = useBackgroundMusic();
  const [musicStarted, setMusicStarted] = useState(false);

  const goTo = useCallback((next: Page) => {
    if (transitioning) return;
    setTransitioning(true);
    if (!musicStarted) { start(); setMusicStarted(true); }
    // 800ms out, then swap and fade back in
    setTimeout(() => {
      setPage(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setTransitioning(false), 80);
    }, 750);
  }, [transitioning, musicStarted, start]);

  const toggleMusic = () => { setMusicStarted(true); playing ? stop() : start(); };
  useEffect(() => { if (normalized.version !== 2) onSceneChange(page, PAGES); }, [page, normalized.version, onSceneChange]);

  // Selects the correct hero page for the "cake" step based on occasionType.
  // Birthday (default) and custom both render PageCake — no behaviour change.
  const renderHeroPage = (onNext: () => void, playCakeSongFn?: () => void) => {
    switch (normalized.occasion) {
      case "rakshabandhan":
        return <PageRakhi onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "fathersday":
        return <PageFamilyDay occasion="fathersday" onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "mothersday":
        return <PageFamilyDay occasion="mothersday" onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "romantic":
      case "anniversary":
      case "loveday":
        return <PageLoveDay onNext={onNext} playCakeSong={playCakeSongFn} />;
      case "birthday":
      case "custom":
      default:
        return <PageCake onNext={onNext} playCakeSong={playCakeSongFn} />;
    }
  };

  const renderPage = () => {
    switch (page) {
      case "landing":      return <PageLanding       onNext={() => goTo("intro")} />;
      case "intro":        return <PageIntro         onNext={() => goTo("cuteness")} />;
      case "cuteness":     return <PageCutenessMeter onNext={() => goTo("celebration")} />;
      case "celebration":  return <PageCelebration   onNext={() => goTo("cake")} />;
      case "cake":         return renderHeroPage(() => goTo("whyYouMatter"), playCakeSong);
      case "whyYouMatter": return <PageWhyYouMatter  onNext={() => goTo("ourStory")} />;
      case "ourStory":     return <PageOurStory      onNext={() => goTo("memoryWall")} />;
      case "memoryWall":   return <PageMemoryWall    onNext={() => goTo("beforeLeave")} />;
      case "beforeLeave":  return <PageBeforeYouLeave onNext={() => goTo("lastNote")} />;
      case "lastNote":     return <PageLastNote />;
      default:             return null;
    }
  };

  const pageIdx = PAGES.indexOf(page);
  const activeLegacySceneKey = resolveActiveSceneKey(page, normalized.occasion) ?? page;

  // ── v2 path: use SceneEngine for configs with explicit scene sequences ──
  // Legacy v1 configs (no _version or _version===1) always use the fixed
  // legacy sequence below — zero behaviour change for existing records.
  if (normalized.version === 2) {
    // Legacy scene renderer: maps scene IDs to existing page components.
    // The SceneEngine calls this for any non-heavy scene in the sequence.
    const renderLegacyScene = (sceneId: string, onNext: () => void) => {
      switch (sceneId) {
        case "landing":      return <PageLanding onNext={onNext} />;
        case "intro":        return <PageIntro onNext={onNext} />;
        case "cuteness":     return <PageCutenessMeter onNext={onNext} />;
        case "celebration":  return <PageCelebration onNext={onNext} />;
        case "cake":
        case "rakhiHero":
        case "familyHero":
        case "loveDayHero":  return renderHeroPage(onNext, () => { if (playing) playCakeSong(); });
        case "whyYouMatter": return <PageWhyYouMatter onNext={onNext} />;
        case "ourStory":     return <PageOurStory onNext={onNext} />;
        case "memoryWall":   return <PageMemoryWall onNext={onNext} />;
        case "beforeLeave":  return <PageBeforeYouLeave onNext={onNext} />;
        case "lastNote":     return <PageLastNote />;
        default:             return null;
      }
    };

    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@500;600;700&family=Poppins:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        <MusicToggle playing={playing} onToggle={toggleMusic} />
        {audioError && <p role="status" className="audio-runtime-notice">{audioError}</p>}
        <SceneEngine
          normalizedConfig={normalized}
          globalMuted={!playing}
          onSceneChange={onSceneChange}
          onInteract={() => { if (!musicStarted) { start(); setMusicStarted(true); } }}
          renderLegacyScene={renderLegacyScene}
        />
      </>
    );
  }

  // ── v1 / legacy path: fixed sequence, completely unchanged ──────────────
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@500;600;700&family=Poppins:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <Background />
      <AmbientFX />
      <FunLayer page={page} />
      <MusicToggle playing={playing} onToggle={toggleMusic} />
        {audioError && <p role="status" className="audio-runtime-notice">{audioError}</p>}
      <SurprisePopup message="You are my favorite person in this entire world. Just wanted you to know that. ❤️" />

      {/* Progress pill — glassmorphism, safe-area aware, hidden on landing */}
      {page !== "landing" && (
        <div style={{
          position: "fixed",
          top: "calc(12px + env(safe-area-inset-top, 0px))",
          left: "50%",
          transform: "translateX(-50%)", zIndex: 200,
          display: "flex", gap: "5px", alignItems: "center",
          padding: "8px 14px",
          borderRadius: "999px",
          background: "rgba(10,3,28,0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(167,139,250,0.14)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        }}>
          {PAGES.slice(1).map((p, i) => {
            const rel = pageIdx - 1;
            return (
              <div key={p} style={{
                width: i === rel ? "22px" : "5px", height: "5px",
                borderRadius: "10px", transition: "all 0.5s ease",
                background: i < rel
                  ? "rgba(236,72,153,0.6)"
                  : i === rel
                  ? "linear-gradient(90deg, #ec4899, #a855f7)"
                  : "rgba(167,139,250,0.15)",
                boxShadow: i === rel ? "0 0 10px rgba(236,72,153,0.6)" : "none",
              }} />
            );
          })}
        </div>
      )}

      {/* Page wrapper with fade+scale transition */}
      <div className="min-h-screen-dvh" style={{
        position: "relative", zIndex: 5,
        opacity: transitioning ? 0 : 1,
        transform: transitioning
          ? "scale(0.95) translateY(16px)"
          : "scale(1) translateY(0)",
        transition: `opacity ${transitioning ? "0.4" : "0.55"}s ease, transform ${transitioning ? "0.4" : "0.55"}s cubic-bezier(0.22,1,0.36,1)`,
        willChange: "opacity, transform",
      }}>
        <div key={page} style={{ position: "relative" }}>
          {renderPage()}
          <StickerLayer sceneKey={activeLegacySceneKey} />
        </div>
        {page === "landing" && landingFooter}
      </div>
    </>
  );
}
