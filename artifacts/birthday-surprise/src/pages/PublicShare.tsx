import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BirthdayExperience from "@/BirthdayExperience";
import { Spinner } from "@/components/ui/spinner";
import type { Config } from "@/config";

type State =
  | { status: "loading" }
  | { status: "found"; config: Config }
  | { status: "not-found" };

// Public, unauthenticated share page. Renders the full birthday
// experience with zero dashboard chrome, using only the
// `get_surprise_by_slug` RPC — it never queries `surprises` directly
// (RLS would block that anyway for a signed-out visitor).
export default function PublicShare({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    setState({ status: "loading" });

    supabase
      .rpc("get_surprise_by_slug", { p_slug: slug })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data) {
          setState({ status: "not-found" });
          return;
        }
        // RPC may return a single row object or an array with one row.
        const row = Array.isArray(data) ? data[0] : data;
        const config = row?.config as Config | undefined;
        if (!config) {
          setState({ status: "not-found" });
          return;
        }
        setState({ status: "found", config });
      }, () => {
        if (mounted) setState({ status: "not-found" });
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div
        className="min-h-screen-dvh"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deep)" }}
      >
        <Spinner className="size-8" style={{ color: "var(--violet)" }} />
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div
        className="min-h-screen-dvh"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          background: "var(--bg-deep)",
          color: "var(--ink)",
        }}
      >
        <p style={{ fontSize: "2.4rem" }}>🎈</p>
        <h1 className="font-serif" style={{ fontSize: "1.8rem" }}>
          This surprise doesn't exist
        </h1>
        <p style={{ color: "var(--ink-soft)", maxWidth: "320px", lineHeight: 1.6 }}>
          The link might be mistyped, or the surprise may no longer be available.
        </p>
      </div>
    );
  }

  return <BirthdayExperience config={state.config} />;
}
