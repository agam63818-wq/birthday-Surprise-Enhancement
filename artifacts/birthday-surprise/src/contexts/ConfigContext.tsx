import { createContext, useContext, type ReactNode } from "react";
import defaultConfig, { type Config } from "@/config";

// Lets BirthdayExperience (and every page/component it renders) read the
// surprise config from wherever it was loaded — the static default, a
// user's own row from `surprises` (dashboard preview), or a publicly
// fetched row via the `get_surprise_by_slug` RPC (public share page) —
// without every page needing a `config` prop threaded through it.
const ConfigContext = createContext<Config>(defaultConfig);

export function ConfigProvider({
  config,
  children,
}: {
  config: Config;
  children: ReactNode;
}) {
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): Config {
  return useContext(ConfigContext);
}
