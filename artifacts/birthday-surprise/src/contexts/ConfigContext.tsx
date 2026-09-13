import { createContext, useContext, useMemo, type ReactNode } from "react";
import defaultConfig, { type Config } from "@/config";
import { normalizeConfig } from "@/lib/v2/migrate";
import type { NormalizedConfig, SurpriseConfig } from "@/lib/v2/schema";

// Lets BirthdayExperience (and every page/component it renders) read the
// surprise config from wherever it was loaded — the static default, a
// user's own row from `surprises` (dashboard preview), or a publicly
// fetched row via the `get_surprise_by_slug` RPC (public share page) —
// without every page needing a `config` prop threaded through it.
const ConfigContext = createContext<Config>(defaultConfig);

// v2: normalized config context (always fully resolved)
const NormalizedConfigContext = createContext<NormalizedConfig | null>(null);

export function ConfigProvider({
  config,
  children,
}: {
  config: Config;
  children: ReactNode;
}) {
  // Normalize once per config change (pure, non-mutating)
  const normalized = useMemo(
    () => normalizeConfig(config as SurpriseConfig),
    [config],
  );

  return (
    <ConfigContext.Provider value={config}>
      <NormalizedConfigContext.Provider value={normalized}>
        {children}
      </NormalizedConfigContext.Provider>
    </ConfigContext.Provider>
  );
}

export function useConfig(): Config {
  return useContext(ConfigContext);
}

/**
 * Returns the fully normalized v2 config. Always available — even for
 * legacy v1 configs (they get safe defaults for all new fields).
 */
export function useNormalizedConfig(): NormalizedConfig {
  const ctx = useContext(NormalizedConfigContext);
  if (!ctx) {
    // Fallback: normalize the raw config on the fly
    return normalizeConfig(defaultConfig as SurpriseConfig);
  }
  return ctx;
}
