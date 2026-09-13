/**
 * SceneEngine — Configurable scene sequencer for v2 configs.
 *
 * Responsibilities:
 * - Reads NormalizedConfig from context
 * - Computes active scene sequence (enabled + valid)
 * - Manages current scene index and transitions
 * - Lazy-loads heavy scene components
 * - Passes isActive, reducedMotion, globalMuted to each scene
 * - Handles empty/invalid sequences gracefully
 * - Exits/unmounts cancel RAF/timers/listeners
 * - Only active scene runs heavy animation
 *
 * This engine is ONLY used for v2 configs with explicit scenes.
 * Legacy v1 configs continue to use BirthdayExperienceInner directly.
 */

import React, {
  useState, useCallback, useEffect, useRef, Suspense, lazy,
  type ComponentType,
} from "react";
import { computeActiveSequence, SCENE_LAZY_LOADERS, SCENE_REGISTRY } from "@/lib/v2/registry";
import type { NormalizedConfig } from "@/lib/v2/schema";
import type { SceneComponentProps } from "@/lib/v2/registry";

// ── Reduced motion detection ─────────────────────────────────────────────
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ── Scene component cache ────────────────────────────────────────────────
// Lazy components are cached so they're only imported once.
const lazyCache = new Map<string, ComponentType<SceneComponentProps>>();

function getLazyScene(sceneId: string): ComponentType<SceneComponentProps> | null {
  const loader = SCENE_LAZY_LOADERS[sceneId as keyof typeof SCENE_LAZY_LOADERS];
  if (!loader) return null;

  if (!lazyCache.has(sceneId)) {
    lazyCache.set(sceneId, lazy(loader));
  }
  return lazyCache.get(sceneId)!;
}

// ── Scene loading fallback ───────────────────────────────────────────────
function SceneLoadingFallback() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-deep, #07011a)",
    }}>
      <div style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "2px solid rgba(167,139,250,0.3)",
        borderTopColor: "var(--violet, #a78bfa)",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Scene error boundary ─────────────────────────────────────────────────
import { Component, type ReactNode } from "react";

class SceneErrorBoundary extends Component<
  { children: ReactNode; onNext: () => void; sceneId: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onNext: () => void; sceneId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[SceneEngine] Scene "${this.props.sceneId}" failed to render:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "32px",
          textAlign: "center",
          background: "var(--bg-deep, #07011a)",
        }}>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            This scene couldn't load. Continuing...
          </p>
          <button
            onClick={this.props.onNext}
            style={{
              padding: "12px 28px",
              borderRadius: "999px",
              border: "1px solid rgba(167,139,250,0.3)",
              background: "rgba(167,139,250,0.1)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            Continue ✨
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Props ────────────────────────────────────────────────────────────────
interface SceneEngineProps {
  normalizedConfig: NormalizedConfig;
  globalMuted: boolean;
  onExperienceComplete?: () => void;
  onInteract?: () => void;
  /**
   * Optional renderer for legacy (non-heavy) scenes.
   * Called when the active scene is a legacy scene ID.
   * If not provided, legacy scenes are skipped with a "Continue" button.
   */
  renderLegacyScene?: (sceneId: string, onNext: () => void, onPrev?: () => void) => React.ReactNode;
}

// ── Main engine ──────────────────────────────────────────────────────────
export default function SceneEngine({
  normalizedConfig,
  globalMuted,
  onExperienceComplete,
  onInteract,
  renderLegacyScene,
}: SceneEngineProps) {
  const reducedMotion = useReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const mountedRef = useRef(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeScenes = computeActiveSequence(normalizedConfig.scenes, normalizedConfig.features);
  const sequenceKey = activeScenes.join("|");
  const boundedIndex = Math.min(sceneIndex, Math.max(0, activeScenes.length - 1));
  const currentSceneId = activeScenes[boundedIndex];
  const isLastScene = boundedIndex >= activeScenes.length - 1;

  useEffect(() => {
    mountedRef.current = true;
    setSceneIndex(0);
    setTransitioning(false);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sequenceKey]);

  const navigate = useCallback((index: number) => {
    if (transitioning || !mountedRef.current) return;
    onInteract?.();
    const swap = () => {
      setSceneIndex(index);
      setTransitioning(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    if (reducedMotion) { swap(); return; }
    setTransitioning(true);
    timerRef.current = setTimeout(swap, 350);
  }, [transitioning, reducedMotion, onInteract]);
  const goNext = () => isLastScene ? onExperienceComplete?.() : navigate(boundedIndex + 1);
  const goPrev = () => navigate(Math.max(0, boundedIndex - 1));

  if (!currentSceneId) return <div role="status" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>No scenes configured. Enable a scene in Customize.</div>;

  // Render current scene
  const renderScene = () => {
    const meta = SCENE_REGISTRY[currentSceneId];
    if (!meta) return null;

    const commonProps: SceneComponentProps = {
      onNext: goNext,
      onPrev: sceneIndex > 0 ? goPrev : undefined,
      isActive: true,
      reducedMotion,
      globalMuted,
    };

    // Heavy scenes: lazy loaded
    if (meta.isHeavy) {
      const LazyScene = getLazyScene(currentSceneId);
      if (!LazyScene) {
        // Loader not found — skip scene
        console.warn(`[SceneEngine] No loader for heavy scene "${currentSceneId}"`);
        return (
          <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button onClick={goNext} style={{ padding: "12px 28px", borderRadius: "999px", border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.1)", color: "var(--ink)", cursor: "pointer" }}>
              Continue ✨
            </button>
          </div>
        );
      }
      return (
        <SceneErrorBoundary key={currentSceneId} onNext={goNext} sceneId={currentSceneId}>
          <Suspense fallback={<SceneLoadingFallback />}>
            <LazyScene {...commonProps} />
          </Suspense>
        </SceneErrorBoundary>
      );
    }

    // Legacy scenes: delegate to the provided renderer if available.
    if (renderLegacyScene) {
      return <>{renderLegacyScene(currentSceneId, goNext, sceneIndex > 0 ? goPrev : undefined)}</>;
    }
    // No legacy renderer provided — show a skip button so the sequence isn't stuck.
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button onClick={goNext} style={{ padding: "12px 28px", borderRadius: "999px", border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.1)", color: "var(--ink)", cursor: "pointer" }}>
          Continue ✨
        </button>
      </div>
    );
  };

  return (
    <div data-scene={currentSceneId} style={{
      position: "relative",
      opacity: transitioning ? 0 : 1,
      transform: !reducedMotion && transitioning ? "scale(0.97) translateY(12px)" : "scale(1) translateY(0)",
      transition: `opacity ${transitioning ? "0.35" : "0.45"}s ease, transform ${transitioning ? "0.35" : "0.45"}s cubic-bezier(0.22,1,0.36,1)`,
      willChange: "opacity, transform",
    }}>
      <nav aria-label="Experience scenes" className="scene-navigation">
        <button type="button" aria-label="Previous scene" disabled={boundedIndex === 0 || transitioning} onClick={goPrev}>Back</button>
        <span aria-live="polite">{boundedIndex + 1} / {activeScenes.length} · {SCENE_REGISTRY[currentSceneId].label}</span>
        <button type="button" aria-label="Next scene" disabled={isLastScene || transitioning} onClick={goNext}>Next</button>
      </nav>
      <div key={currentSceneId} className="scene-content">{renderScene()}</div>
    </div>
  );
}
