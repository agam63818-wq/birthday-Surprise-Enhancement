import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigError } from "@/lib/supabase";
import BirthdayExperience from "@/BirthdayExperience";
import LoadingPrelude from "@/components/LoadingPrelude";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Config } from "@/config";

// Public, unauthenticated share page. Renders the full birthday
// experience with zero dashboard chrome, using only the
// `get_surprise_by_slug` RPC — it never queries `surprises` directly
// (RLS would block that anyway for a signed-out visitor).
//
// Reliability upgrades:
// - a hard fetch timeout, so the page can never hang on a loader forever
// - automatic retries with backoff, then a manual \"Try again\" state
// - a minimum prelude time so the cinematic loader never flashes
// - a soft fade-in into the experience instead of an instant swap

const FETCH_TIMEOUT_MS = 12_000;
const MIN_PRELUDE_MS = 1_600;
const MAX_AUTO_RETRIES = 2;

type State =
  | { status: "loading" }
  | { status: "found"; config: Config }
  | { status: "not-found" }
  | { status: "error" };

export default function PublicShare({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [revealed, setRevealed] = useState(false);
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);

  // Share pages are private, per-person content: noindex, no canonical.
  // Social previews are unaffected — link-preview bots are served by
  // middleware.js and never reach this component. The title becomes
  // personalized once the config loads (matches the middleware's OG title).
  const name = state.status === "found" ? state.config.name?.trim() : "";
  usePageMeta({
    title: name ? `${name}'s Birthday Surprise \uD83C\uDF82` : "A Birthday Surprise \uD83C\uDF82",
    description: name
      ? `Someone made something special for ${name}\u2026 open it!`
      : "Someone made something special for you\u2026 open it!",
    noindex: true,
  });

  const load = useCallback(async () => {
    if (!mountedRef.current) return;
    setState({ status: "loading" });
    setRevealed(false);

    // Misconfigured deploy → friendly error instead of a dead spinner.
    if (supabaseConfigError) {
      setState({ status: "error" });
      return;
    }

    const startedAt = Date.now();
    const finish = (next: State) => {
      if (!mountedRef.current) return;
      const wait = Math.max(0, MIN_PRELUDE_MS - (Date.now() - startedAt));
      setTimeout(() => {
        if (mountedRef.current) setState(next);
      }, wait);
    };

    try {
      const rpc = supabase.rpc("get_surprise_by_slug", { p_slug: slug });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("fetch-timeout")), FETCH_TIMEOUT_MS),
      );
      const { data, error } = (await Promise.race([rpc, timeout])) as {
        data: unknown;
        error: unknown;
      };

      if (error) throw error;

      // RPC may return a single row object or an array with one row.
      const row = Array.isArray(data) ? data[0] : data;
      const config = (row as { config?: Config } | null | undefined)?.config;
      if (!config) {
        finish({ status: "not-found" });
        return;
      }
      finish({ status: "found", config });
    } catch {
      // Transient failure (network blip / timeout) → retry with backoff
      // before surfacing the manual retry state.
      if (attemptRef.current < MAX_AUTO_RETRIES) {
        attemptRef.current += 1;
        setTimeout(() => {
          if (mountedRef.current) void load();
        }, 900 * attemptRef.current);
      } else {
        finish({ status: "error" });
      }
    }
  }, [slug]);

  useEffect(() => {
    mountedRef.current = true;
    attemptRef.current = 0;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Soft fade-in once the config arrives.
  useEffect(() => {
    if (state.status !== "found") return;
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, [state.status]);

  const retry = useCallback(() => {
    attemptRef.current = 0;
    void load();
  }, [load]);

  if (state.status === "loading") return <LoadingPrelude state="loading" />;
  if (state.status === "not-found") return <LoadingPrelude state="not-found" />;
  if (state.status === "error") return <LoadingPrelude state="error" onRetry={retry} />;

  return (
    <div
      style={{
        opacity: revealed ? 1 : 0,
        filter: revealed ? "blur(0)" : "blur(6px)",
        transition: "opacity 0.9s ease, filter 0.9s ease",
      }}
    >
      <BirthdayExperience config={state.config} />
    </div>
  );
}
