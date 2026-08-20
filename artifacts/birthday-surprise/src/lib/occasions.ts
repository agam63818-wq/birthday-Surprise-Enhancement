// ============================================================
//  OCCASIONS — single source of truth for occasion copy/labels
//  Used by: hero pages (PageRakhi, PageFamilyDay, PageLoveDay)
//           and CustomizeForm (accordion labels + placeholders).
//  Never duplicate strings between pages and the dashboard.
// ============================================================

import type { Config } from "@/config";

// Re-export the union so callers don't need to import Config just for the type.
export type OccasionId = NonNullable<Config["occasionType"]>;

export const OCCASION_IDS: OccasionId[] = [
  "birthday",
  "rakshabandhan",
  "fathersday",
  "mothersday",
  "loveday",
  "custom",
];

// ── Display metadata ──────────────────────────────────────────────────────
export const OCCASION_META: Record<
  OccasionId,
  { label: string; emoji: string; heroLabel: string }
> = {
  birthday:      { label: "Birthday",      emoji: "🎂", heroLabel: "Birthday" },
  rakshabandhan: { label: "Rakshabandhan", emoji: "🪢", heroLabel: "Rakhi" },
  fathersday:    { label: "Father's Day",  emoji: "👨‍👧", heroLabel: "Father's Day" },
  mothersday:    { label: "Mother's Day",  emoji: "👩‍👧", heroLabel: "Mother's Day" },
  loveday:       { label: "Love Day",      emoji: "❤️", heroLabel: "Love Day" },
  custom:        { label: "Custom",        emoji: "✨", heroLabel: "Special Day" },
};

// ── Warm Hinglish defaults per occasion ──────────────────────────────────
// Short, emotional, not cringe. 1–3 sentences each.
export const OCCASION_DEFAULTS: Record<
  OccasionId,
  { title: string; message: string; buttonText: string; siblingName?: string }
> = {
  birthday: {
    title: "Happy Birthday! 🎂",
    message: "Aaj ka din sirf tumhara hai. Dil se dua hai ki ye saal tumhare liye bahut khaas ho.",
    buttonText: "Continue ✨",
  },
  rakshabandhan: {
    title: "Happy Rakhi! 🪢",
    message:
      "Ye dhaaga chhota hai, par isme poori zindagi ka pyaar bandha hai. Tum hamesha mere saath ho — aur main hamesha tumhare saath.",
    buttonText: "Continue ✨",
    siblingName: "",
  },
  fathersday: {
    title: "Happy Father's Day! 👨‍👧",
    message:
      "Aapki har baat mein ek sabak tha, aur aapki har muskaan mein ek duniya. Thank you for being my strength.",
    buttonText: "Continue ✨",
  },
  mothersday: {
    title: "Happy Mother's Day! 👩‍👧",
    message:
      "Aapke haath ki warmth aur aapki awaaz ki thandak — koi cheez replace nahi kar sakti. Love you, Maa.",
    buttonText: "Continue ✨",
  },
  loveday: {
    title: "Happy Love Day! ❤️",
    message:
      "Tumse milna ek accident tha, par tumhare saath rehna meri choice hai. Aur main ye choice baar baar karunga.",
    buttonText: "Continue ✨",
  },
  custom: {
    title: "A Special Day ✨",
    message: "Ye pal sirf tumhare liye hai. Dil se.",
    buttonText: "Continue ✨",
  },
};

// ── Resolver ─────────────────────────────────────────────────────────────
// Returns fully-populated content by merging saved values over defaults.
// Treats empty/whitespace strings as absent (falls back to default).

function nonEmpty(s: string | undefined): string | undefined {
  return s && s.trim().length > 0 ? s : undefined;
}

export function getOccasionContent(
  config: Config,
  occasion: OccasionId,
): { title: string; message: string; buttonText: string; siblingName?: string } {
  const defaults = OCCASION_DEFAULTS[occasion];
  const saved = config.occasionContent;

  switch (occasion) {
    case "rakshabandhan": {
      const s = saved?.rakshabandhan;
      const siblingName = nonEmpty(s?.siblingName) ?? nonEmpty(defaults.siblingName);
      return {
        title: nonEmpty(s?.title) ?? defaults.title,
        message: nonEmpty(s?.message) ?? defaults.message,
        buttonText: nonEmpty(s?.buttonText) ?? defaults.buttonText,
        ...(siblingName !== undefined ? { siblingName } : {}),
      };
    }
    case "fathersday": {
      const s = saved?.fathersday;
      return {
        title: nonEmpty(s?.title) ?? defaults.title,
        message: nonEmpty(s?.message) ?? defaults.message,
        buttonText: nonEmpty(s?.buttonText) ?? defaults.buttonText,
      };
    }
    case "mothersday": {
      const s = saved?.mothersday;
      return {
        title: nonEmpty(s?.title) ?? defaults.title,
        message: nonEmpty(s?.message) ?? defaults.message,
        buttonText: nonEmpty(s?.buttonText) ?? defaults.buttonText,
      };
    }
    case "loveday": {
      const s = saved?.loveday;
      return {
        title: nonEmpty(s?.title) ?? defaults.title,
        message: nonEmpty(s?.message) ?? defaults.message,
        buttonText: nonEmpty(s?.buttonText) ?? defaults.buttonText,
      };
    }
    default:
      return {
        title: defaults.title,
        message: defaults.message,
        buttonText: defaults.buttonText,
      };
  }
}
