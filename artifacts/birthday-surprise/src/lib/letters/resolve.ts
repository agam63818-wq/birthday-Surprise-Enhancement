import type { LetterItem, SurpriseConfig } from "@/lib/v2/schema";
import { letterHints } from "@/lib/v2/cinematicCopy";

export const MAX_LETTERS = 12;

export interface ResolvedLetter { title: string; hint: string; body: string }
export interface ResolvedLetters { heading: string; subtitle: string; signature: string; items: ResolvedLetter[]; fromLegacy: boolean }

/**
 * Letters content. Explicit `config.letters.items` wins; otherwise (old rows)
 * letters are derived from lastNote.lines exactly like before, so nothing an
 * existing creator wrote is lost.
 */
export function legacyLetterItems(config: SurpriseConfig): LetterItem[] {
  const lines = (config.lastNote?.lines ?? []).filter(l => l.trim());
  if (lines.length) return lines.slice(0, MAX_LETTERS).map(body => ({ body }));
  return [{ body: config.celebration?.message || "Some words are better kept close." }];
}

export function resolveLetters(config: SurpriseConfig): ResolvedLetters {
  const name = config.name?.trim() || "you";
  const explicit = Array.isArray(config.letters?.items) && config.letters!.items!.length > 0;
  const source = explicit ? config.letters!.items! : legacyLetterItems(config);
  const hints = letterHints();
  const items = source.slice(0, MAX_LETTERS).map((it, i) => ({
    title: it.title?.trim() || `For ${name}`,
    hint: it.hint?.trim() || hints[i % hints.length],
    body: it.body ?? "",
  }));
  return {
    heading: config.letters?.heading?.trim() || `Letters for ${name}`,
    subtitle: config.letters?.subtitle?.trim() || "Some words are meant to stay. Open a note when you are ready.",
    signature: config.letters?.signature?.trim() || (config.giftReveal?.senderName?.trim() ? `With love, ${config.giftReveal.senderName.trim()}` : ""),
    items,
    fromLegacy: !explicit,
  };
}
