import React, {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  EXPERIENCE_PROTOCOL_VERSION,
  isFrameToHostMessage,
  isHostToFrameMessage,
  type ExperienceErrorMessage,
  type ExperienceId,
  type ExperienceTheme,
  type HostToFrameMessage,
  type JsonObject,
} from "@/lib/experiences/protocol";

const READY_TIMEOUT_MS = 8000;
const EMPTY_CONFIG: JsonObject = {};
const EMPTY_THEME: ExperienceTheme = {};

const DEFAULT_TITLES: Record<ExperienceId, string> = {
  "heart-tunnel": "Heart Tunnel interactive experience",
  "love-confession": "Love Confession interactive experience",
  "love-drive": "Love Drive interactive experience",
};

export interface ExperienceFrameProps {
  experience: ExperienceId;
  /** The experience-owned, optional JSON slice. No HTML is accepted by the protocol. */
  config?: JsonObject;
  theme?: ExperienceTheme;
  occasion?: string;
  isActive?: boolean;
  reducedMotion?: boolean;
  globalMuted?: boolean;
  onNext: () => void;
  /** Finale notification; it does not advance unless advanceOnComplete is true. */
  onComplete?: () => void;
  onReplayed?: () => void;
  onError?: (error: ExperienceErrorMessage) => void;
  /** Increment to request replay without remounting the iframe or scene engine. */
  replayToken?: number;
  /** Defaults to false: a complete event is a notification, not auto-navigation. */
  advanceOnComplete?: boolean;
  title?: string;
  /** Optional scene-owned label for the recoverable error navigation button. */
  continueLabel?: string;
}

interface InnerProps extends ExperienceFrameProps {
  onRetry: () => void;
  advanceOnce: () => void;
}

interface BoundaryProps {
  children: ReactNode;
  title: string;
  continueLabel?: string;
  onRetry: () => void;
  onSkip: () => void;
}

interface BoundaryState {
  hasError: boolean;
}

const shellStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  minWidth: 0,
  minHeight: 0,
  isolation: "isolate",
};

const iframeStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "block",
  border: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  paddingTop: "calc(24px + env(safe-area-inset-top))",
  paddingRight: "calc(24px + env(safe-area-inset-right))",
  paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
  paddingLeft: "calc(24px + env(safe-area-inset-left))",
  textAlign: "center",
  color: "var(--ink, #f3ecff)",
  background: "var(--bg-deep, #07011a)",
};

const buttonStyle: CSSProperties = {
  minHeight: 44,
  padding: "10px 20px",
  borderRadius: 999,
  border: "1px solid rgba(167,139,250,0.45)",
  color: "var(--ink, #f3ecff)",
  background: "rgba(167,139,250,0.14)",
  cursor: "pointer",
  font: "inherit",
};

function RecoveryUI({
  title,
  message,
  continueLabel = "Skip scene",
  onRetry,
  onSkip,
}: {
  title: string;
  message?: string;
  continueLabel?: string;
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    <div style={overlayStyle} role="alert" data-experience-error="true">
      <strong>{title} could not load.</strong>
      <p style={{ maxWidth: 440, margin: 0 }}>{message || "You can retry this scene or continue without it."}</p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        <button type="button" style={buttonStyle} onClick={onRetry}>Retry</button>
        <button type="button" style={buttonStyle} onClick={onSkip}>{continueLabel}</button>
      </div>
    </div>
  );
}

/** React render errors get the same recoverable path as frame/runtime errors. */
class ExperienceFrameErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[ExperienceFrame] ${this.props.title} render failure`, error);
  }

  render() {
    if (this.state.hasError) {
      return <RecoveryUI title={this.props.title} continueLabel={this.props.continueLabel} onRetry={this.props.onRetry} onSkip={this.props.onSkip} />;
    }
    return this.props.children;
  }
}

function ExperienceFrameInner(props: InnerProps) {
  const {
    experience,
    config = EMPTY_CONFIG,
    theme = EMPTY_THEME,
    occasion = "custom",
    isActive = true,
    reducedMotion = false,
    globalMuted = true,
    replayToken,
    advanceOnComplete = false,
    title = DEFAULT_TITLES[experience],
    onRetry,
    advanceOnce,
  } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const failedRef = useRef(false);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReplayRef = useRef(false);
  const previousReplayTokenRef = useRef(replayToken);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<ExperienceErrorMessage | null>(null);

  const clearReadyTimeout = useCallback(() => {
    if (readyTimeoutRef.current !== null) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
  }, []);

  const postToFrame = useCallback((message: HostToFrameMessage): boolean => {
    const target = iframeRef.current?.contentWindow;
    if (!target || !isHostToFrameMessage(message)) return false;
    // A sandbox without allow-same-origin has an opaque ("null") origin.
    // "*" is therefore required; incoming messages are still pinned to this
    // exact contentWindow and checked against the closed protocol schema.
    target.postMessage(message, "*");
    return true;
  }, []);

  const fail = useCallback((code: string, message: string) => {
    if (!mountedRef.current || failedRef.current) return;
    failedRef.current = true;
    clearReadyTimeout();
    const frameError: ExperienceErrorMessage = {
      v: EXPERIENCE_PROTOCOL_VERSION,
      type: "error",
      code: code.slice(0, 64),
      message: message.slice(0, 200),
    };
    setError(frameError);
    setLoadState("error");
    propsRef.current.onError?.(frameError);
  }, [clearReadyTimeout]);

  useEffect(() => {
    mountedRef.current = true;
    readyRef.current = false;
    failedRef.current = false;
    const iframe = iframeRef.current;

    const onMessage = (event: MessageEvent) => {
      if (!mountedRef.current || failedRef.current) return;
      if (!iframe || event.source !== iframe.contentWindow || !isFrameToHostMessage(event.data)) return;
      const message = event.data;
      if (message.type === "ready") {
        if (readyRef.current) return;
        const current = propsRef.current;
        const init: HostToFrameMessage = {
          v: EXPERIENCE_PROTOCOL_VERSION,
          type: "init",
          experience,
          config: current.config ?? EMPTY_CONFIG,
          theme: current.theme ?? EMPTY_THEME,
          reducedMotion: current.reducedMotion ?? false,
          muted: current.globalMuted ?? true,
          occasion: current.occasion ?? "custom",
        };
        if (!postToFrame(init)) {
          fail("INVALID_INIT", "The scene configuration could not be sent safely.");
          return;
        }
        readyRef.current = true;
        clearReadyTimeout();
        setLoadState("ready");
        if (pendingReplayRef.current) {
          pendingReplayRef.current = false;
          postToFrame({ v: EXPERIENCE_PROTOCOL_VERSION, type: "replay" });
        }
        if (current.isActive === false) {
          postToFrame({ v: EXPERIENCE_PROTOCOL_VERSION, type: "pause" });
        }
        return;
      }
      if (!readyRef.current) return;
      if (message.type === "next") {
        advanceOnce();
      } else if (message.type === "complete") {
        propsRef.current.onComplete?.();
        if (propsRef.current.advanceOnComplete) advanceOnce();
      } else if (message.type === "replayed") {
        propsRef.current.onReplayed?.();
      } else if (message.type === "error") {
        fail(message.code, message.message);
      }
    };

    window.addEventListener("message", onMessage);
    readyTimeoutRef.current = setTimeout(() => {
      if (!readyRef.current) {
        fail("READY_TIMEOUT", "The scene took too long to respond. Retry or skip this scene.");
      }
    }, READY_TIMEOUT_MS);

    return () => {
      mountedRef.current = false;
      clearReadyTimeout();
      window.removeEventListener("message", onMessage);
      // React removes the iframe after this cleanup. Removing the document is
      // the final teardown for its rAF, timers, audio and WebGL context.
    };
  }, [advanceOnce, clearReadyTimeout, experience, fail, postToFrame]);

  const themeKey = JSON.stringify(theme);
  useEffect(() => {
    if (!readyRef.current || failedRef.current) return;
    postToFrame({
      v: EXPERIENCE_PROTOCOL_VERSION,
      type: "update",
      muted: globalMuted,
      reducedMotion,
      theme,
    });
  }, [globalMuted, postToFrame, reducedMotion, theme, themeKey]);

  useEffect(() => {
    if (!readyRef.current || failedRef.current) return;
    postToFrame({ v: EXPERIENCE_PROTOCOL_VERSION, type: isActive ? "resume" : "pause" });
  }, [isActive, postToFrame]);

  useEffect(() => {
    if (previousReplayTokenRef.current === replayToken) return;
    previousReplayTokenRef.current = replayToken;
    if (!readyRef.current || failedRef.current) {
      pendingReplayRef.current = true;
      return;
    }
    postToFrame({ v: EXPERIENCE_PROTOCOL_VERSION, type: "replay" });
  }, [postToFrame, replayToken]);

  return (
    <div style={shellStyle} data-experience-frame={experience}>
      <iframe
        ref={iframeRef}
        title={title}
        src={`/experiences/${experience}/index.html`}
        sandbox="allow-scripts"
        scrolling="no"
        style={iframeStyle}
        aria-label={title}
      />
      {loadState === "loading" && (
        <div style={{ ...overlayStyle, pointerEvents: "none" }} role="status" data-experience-loading="true">
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "3px solid rgba(167,139,250,0.25)",
              borderTopColor: "var(--violet, #a78bfa)",
              animation: reducedMotion ? "none" : "experience-frame-spin 0.9s linear infinite",
            }}
          />
          <span>Loading scene…</span>
          <style>{`@keyframes experience-frame-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {loadState === "error" && (
        <RecoveryUI title={title} message={error?.message} continueLabel={props.continueLabel} onRetry={onRetry} onSkip={advanceOnce} />
      )}
    </div>
  );
}

export default function ExperienceFrame(props: ExperienceFrameProps) {
  const [attempt, setAttempt] = useState(0);
  const onNextRef = useRef(props.onNext);
  onNextRef.current = props.onNext;
  const advancedRef = useRef(false);
  const advanceOnce = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    onNextRef.current();
  }, []);
  const retry = useCallback(() => {
    // Retry is a new frame mount, so its one-shot navigation guard starts over.
    advancedRef.current = false;
    setAttempt((value) => value + 1);
  }, []);
  const title = props.title ?? DEFAULT_TITLES[props.experience];

  return (
    <ExperienceFrameErrorBoundary key={attempt} title={title} continueLabel={props.continueLabel} onRetry={retry} onSkip={advanceOnce}>
      <ExperienceFrameInner key={attempt} {...props} onRetry={retry} advanceOnce={advanceOnce} />
    </ExperienceFrameErrorBoundary>
  );
}

export { READY_TIMEOUT_MS };
