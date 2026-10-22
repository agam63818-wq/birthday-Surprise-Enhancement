import type { SurpriseConfig } from "@/lib/v2/schema";
import { countdownActive } from "./defaults";
import { parseUtcIso } from "../../../supabase/functions/_shared/countdownTime";

/**
 * Entry decision for the public route. The gate only ever applies on ENTRY:
 * a visitor already inside the experience is never yanked back.
 * - hard lock says locked           -> gate
 * - countdown OFF / invalid         -> experience (exactly today's behaviour)
 * - unlock instant already passed   -> experience (no 3-2-1)
 */
export function initialGateDecision(config: SurpriseConfig | null, locked: boolean, nowMs: number): "gate" | "experience" {
  if (locked) return "gate";
  if (!config || !countdownActive(config)) return "experience";
  const unlock = parseUtcIso(config.countdown?.unlockAtUtc)!;
  return unlock - nowMs > 0 ? "gate" : "experience";
}

/** Whether the public page needs a trusted clock before deciding. */
export function needsTrustedTime(config: SurpriseConfig | null): boolean {
  return !!config && countdownActive(config);
}
