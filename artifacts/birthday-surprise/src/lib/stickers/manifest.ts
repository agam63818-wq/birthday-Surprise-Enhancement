// ============================================================
//  STICKER MANIFEST — Single canonical source of truth
//
//  Every sticker asset path, label, category, intrinsic geometry,
//  duration, byte weight, and heavy-asset gating flag lives HERE.
//  Nowhere else in the codebase may hardcode "/stickers/..." paths.
//
//  Measured render strategy (verified on Headless Chromium 153 + sharp/ffprobe):
//  1. Default renderer: <img src={sticker.webp} loading="lazy" decoding="async" />
//     - Universal alpha support across Safari/iOS WebKit, Chrome, Firefox
//     - Clean compositing inside backdrop-filter (.glass-card-dark) & Reveal wrappers
//     - No autoplay policy gate; 2.2x–3.1x faster initial decode than <video>
//     - Strictly smaller than .webm on 7/22 stickers and near-equal on 11/22
//  2. Selective WebM upgrade (<video muted loop autoPlay playsInline />):
//     - Enabled ONLY in full-scene playback when VP9 alpha is supported AND
//       .webm saves >= 150 KB (kitty-01, kitty-05, kitty-06, kitty-08,
//       capturing 1,437 KB = 81.7% of all catalog byte savings)
//     - Immediate fallback to <img src={sticker.webp} /> on error or autoplay block
//     - NEVER use mix-blend-mode (breaks inside backdrop-filter / isolation stacks)
//  3. Lazy loading & heavy sticker gating:
//     - Picker grid previews lazy-load animated WebP
//     - Stickers with heavy === true (> 600 KB: kitty-06, 1.41 MB) load ONLY on explicit select
// ============================================================

export const STICKER_CATEGORIES = ["love", "cute", "celebrate", "funny"] as const;
export type StickerCategory = (typeof STICKER_CATEGORIES)[number];

export const STICKER_IDS = [
  "kitty-01",
  "kitty-02",
  "kitty-03",
  "kitty-04",
  "kitty-05",
  "kitty-06",
  "kitty-07",
  "kitty-08",
  "kitty-09",
  "kitty-10",
  "kitty-11",
  "kitty-12",
  "kitty-13",
  "kitty-14",
  "kitty-15",
  "kitty-16",
  "kitty-17",
  "kitty-18",
  "kitty-19",
  "kitty-20",
  "kitty-21",
  "kitty-22",
] as const;
export type StickerId = (typeof STICKER_IDS)[number];

export interface StickerManifestItem {
  readonly id: StickerId;
  readonly name: string;
  readonly category: StickerCategory;
  readonly webp: string;
  readonly webm: string;
  readonly width: number;
  readonly height: number;
  readonly aspect: number;
  readonly durationMs: number;
  readonly bytes: number;
  readonly heavy: boolean;
}

/** Threshold above which a sticker WebP is flagged heavy and gated behind explicit user selection (600 KB). */
export const HEAVY_STICKER_THRESHOLD_BYTES = 614400;

/** Minimum byte savings required before upgrading full-scene playback from <img> WebP to <video> VP9+alpha WebM. */
export const WEBM_UPGRADE_MIN_SAVINGS_BYTES = 153600;

export const STICKER_MANIFEST: readonly StickerManifestItem[] = [
  {
    id: "kitty-01",
    name: "Wiping Your Tears",
    category: "cute",
    webp: "/stickers/kitty-01.webp",
    webm: "/stickers/kitty-01.webm",
    width: 320,
    height: 205,
    aspect: 1.561,
    durationMs: 5583,
    bytes: 531444,
    heavy: false,
  },
  {
    id: "kitty-02",
    name: "Cozy Back Hug",
    category: "love",
    webp: "/stickers/kitty-02.webp",
    webm: "/stickers/kitty-02.webm",
    width: 320,
    height: 300,
    aspect: 1.0667,
    durationMs: 3749,
    bytes: 287592,
    heavy: false,
  },
  {
    id: "kitty-03",
    name: "Heart-Filled Hug",
    category: "love",
    webp: "/stickers/kitty-03.webp",
    webm: "/stickers/kitty-03.webm",
    width: 320,
    height: 284,
    aspect: 1.1268,
    durationMs: 1999,
    bytes: 106916,
    heavy: false,
  },
  {
    id: "kitty-04",
    name: "Rolling With Laughter",
    category: "funny",
    webp: "/stickers/kitty-04.webp",
    webm: "/stickers/kitty-04.webm",
    width: 320,
    height: 260,
    aspect: 1.2308,
    durationMs: 2083,
    bytes: 168016,
    heavy: false,
  },
  {
    id: "kitty-05",
    name: "Playful Forehead Hold",
    category: "funny",
    webp: "/stickers/kitty-05.webp",
    webm: "/stickers/kitty-05.webm",
    width: 320,
    height: 284,
    aspect: 1.1268,
    durationMs: 4999,
    bytes: 384506,
    heavy: false,
  },
  {
    id: "kitty-06",
    name: "Birthday Cake Delivery",
    category: "celebrate",
    webp: "/stickers/kitty-06.webp",
    webm: "/stickers/kitty-06.webm",
    width: 320,
    height: 519,
    aspect: 0.6166,
    durationMs: 10166,
    bytes: 1443010,
    heavy: true,
  },
  {
    id: "kitty-07",
    name: "Pinky Promise",
    category: "love",
    webp: "/stickers/kitty-07.webp",
    webm: "/stickers/kitty-07.webm",
    width: 320,
    height: 320,
    aspect: 1,
    durationMs: 1999,
    bytes: 113998,
    heavy: false,
  },
  {
    id: "kitty-08",
    name: "Forever Promise",
    category: "love",
    webp: "/stickers/kitty-08.webp",
    webm: "/stickers/kitty-08.webm",
    width: 320,
    height: 315,
    aspect: 1.0159,
    durationMs: 1999,
    bytes: 383994,
    heavy: false,
  },
  {
    id: "kitty-09",
    name: "Surprise Kiss",
    category: "love",
    webp: "/stickers/kitty-09.webp",
    webm: "/stickers/kitty-09.webm",
    width: 320,
    height: 269,
    aspect: 1.1896,
    durationMs: 1999,
    bytes: 194084,
    heavy: false,
  },
  {
    id: "kitty-10",
    name: "Big Thank You",
    category: "cute",
    webp: "/stickers/kitty-10.webp",
    webm: "/stickers/kitty-10.webm",
    width: 320,
    height: 272,
    aspect: 1.1765,
    durationMs: 1833,
    bytes: 254820,
    heavy: false,
  },
  {
    id: "kitty-11",
    name: "Gentle Head Pat",
    category: "cute",
    webp: "/stickers/kitty-11.webp",
    webm: "/stickers/kitty-11.webm",
    width: 320,
    height: 232,
    aspect: 1.3793,
    durationMs: 499,
    bytes: 45616,
    heavy: false,
  },
  {
    id: "kitty-12",
    name: "Playful Toy Hammer",
    category: "funny",
    webp: "/stickers/kitty-12.webp",
    webm: "/stickers/kitty-12.webm",
    width: 320,
    height: 316,
    aspect: 1.0127,
    durationMs: 749,
    bytes: 121800,
    heavy: false,
  },
  {
    id: "kitty-13",
    name: "Struck by Love",
    category: "love",
    webp: "/stickers/kitty-13.webp",
    webm: "/stickers/kitty-13.webm",
    width: 320,
    height: 272,
    aspect: 1.1765,
    durationMs: 1916,
    bytes: 148008,
    heavy: false,
  },
  {
    id: "kitty-14",
    name: "Cupid's Heart Arrow",
    category: "love",
    webp: "/stickers/kitty-14.webp",
    webm: "/stickers/kitty-14.webm",
    width: 320,
    height: 251,
    aspect: 1.2749,
    durationMs: 1916,
    bytes: 128840,
    heavy: false,
  },
  {
    id: "kitty-15",
    name: "Teary Bye-Bye",
    category: "cute",
    webp: "/stickers/kitty-15.webp",
    webm: "/stickers/kitty-15.webm",
    width: 320,
    height: 272,
    aspect: 1.1765,
    durationMs: 999,
    bytes: 167556,
    heavy: false,
  },
  {
    id: "kitty-16",
    name: "Jump Into My Arms",
    category: "love",
    webp: "/stickers/kitty-16.webp",
    webm: "/stickers/kitty-16.webm",
    width: 320,
    height: 315,
    aspect: 1.0159,
    durationMs: 999,
    bytes: 74090,
    heavy: false,
  },
  {
    id: "kitty-17",
    name: "Fierce Stick Snap",
    category: "funny",
    webp: "/stickers/kitty-17.webp",
    webm: "/stickers/kitty-17.webm",
    width: 320,
    height: 320,
    aspect: 1,
    durationMs: 2083,
    bytes: 214594,
    heavy: false,
  },
  {
    id: "kitty-18",
    name: "Confetti Happy Dance",
    category: "celebrate",
    webp: "/stickers/kitty-18.webp",
    webm: "/stickers/kitty-18.webm",
    width: 320,
    height: 273,
    aspect: 1.1722,
    durationMs: 1249,
    bytes: 218122,
    heavy: false,
  },
  {
    id: "kitty-19",
    name: "Drum & Dance Party",
    category: "celebrate",
    webp: "/stickers/kitty-19.webp",
    webm: "/stickers/kitty-19.webm",
    width: 320,
    height: 248,
    aspect: 1.2903,
    durationMs: 1999,
    bytes: 252894,
    heavy: false,
  },
  {
    id: "kitty-20",
    name: "Swinging Together",
    category: "cute",
    webp: "/stickers/kitty-20.webp",
    webm: "/stickers/kitty-20.webm",
    width: 320,
    height: 171,
    aspect: 1.8713,
    durationMs: 1583,
    bytes: 141904,
    heavy: false,
  },
  {
    id: "kitty-21",
    name: "Bouquet Surprise",
    category: "celebrate",
    webp: "/stickers/kitty-21.webp",
    webm: "/stickers/kitty-21.webm",
    width: 320,
    height: 271,
    aspect: 1.1808,
    durationMs: 1916,
    bytes: 230202,
    heavy: false,
  },
  {
    id: "kitty-22",
    name: "Blowing a Big Heart",
    category: "love",
    webp: "/stickers/kitty-22.webp",
    webm: "/stickers/kitty-22.webm",
    width: 320,
    height: 281,
    aspect: 1.1388,
    durationMs: 999,
    bytes: 87834,
    heavy: false,
  },
] as const;

/** Companion WebM byte sizes indexed by StickerId for measured render-format selection. */
export const STICKER_WEBM_BYTES: Readonly<Record<StickerId, number>> = {
  "kitty-01": 182893,
  "kitty-02": 188744,
  "kitty-03": 69446,
  "kitty-04": 113204,
  "kitty-05": 159749,
  "kitty-06": 752025,
  "kitty-07": 91008,
  "kitty-08": 211201,
  "kitty-09": 190628,
  "kitty-10": 279556,
  "kitty-11": 48597,
  "kitty-12": 120017,
  "kitty-13": 181040,
  "kitty-14": 82854,
  "kitty-15": 120147,
  "kitty-16": 79714,
  "kitty-17": 226486,
  "kitty-18": 270545,
  "kitty-19": 234384,
  "kitty-20": 145887,
  "kitty-21": 144042,
  "kitty-22": 48231,
};

/** Stickers where VP9+alpha WebM saves >= 150 KB over animated WebP on supported browsers. */
export const PREFER_WEBM_STICKER_IDS: ReadonlySet<StickerId> = new Set<StickerId>([
  "kitty-01",
  "kitty-05",
  "kitty-06",
  "kitty-08",
]);

/** Fast O(1) lookup table indexed by StickerId. */
export const STICKERS_BY_ID: Readonly<Record<StickerId, StickerManifestItem>> =
  Object.fromEntries(STICKER_MANIFEST.map((item) => [item.id, item])) as Record<
    StickerId,
    StickerManifestItem
  >;

export function getStickerById(id: string | null | undefined): StickerManifestItem | undefined {
  if (!id) return undefined;
  return STICKERS_BY_ID[id as StickerId];
}

export function shouldPreferWebm(id: StickerId): boolean {
  return PREFER_WEBM_STICKER_IDS.has(id);
}
