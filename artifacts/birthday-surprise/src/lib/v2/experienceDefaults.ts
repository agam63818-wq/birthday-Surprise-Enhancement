import type {
  OccasionId,
  ResolvedHeartTunnelConfig,
  ResolvedLoveConfessionConfig,
  ResolvedLoveDriveConfig,
} from "./schema";

/** Shared plain-text guard used while resolving untrusted saved JSON. */
export function isExperiencePlainText(value: unknown, maxLength = 6000): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) &&
    !/<\s*\/?\s*[a-z][^>]*>/i.test(value) &&
    !/(?:javascript|vbscript)\s*:/i.test(value)
  );
}

function isSafePhotoUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (!value) return true;
  if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !/[\s\\]/.test(value);
  } catch {
    return false;
  }
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback: string, maxLength: number): string {
  return isExperiencePlainText(value, maxLength) ? value : fallback;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function merge<T extends object>(base: T, override?: Partial<T>): T {
  return clone({ ...base, ...(override ?? {}) });
}

const HEART_BASE: ResolvedHeartTunnelConfig = {
  startSub: "A SPECIAL",
  startMain: "SURPRISE",
  startSubtitle: "A Special Surprise For You",
  startButton: "Tap To Open Surprise",
  startHint: "🔊 Turn on sound for best experience",
  cinematicSub: "✦ A LITTLE MAGIC ✦",
  cinematicMain: "A Moment For You",
  revealTitle: "A Little\nSurprise",
  coupleNames: "You & Me",
  photoUrl: "",
  caption: "A Moment To Treasure 💕",
  subtitle: "To You & This Beautiful Day",
  yearsNumber: "",
  yearsUnit: "",
  quote: "Every moment with you is a little more special.",
  dateText: "",
  letterButton: "Open My Love Letter",
  letterTitle: "My Dearest,",
  letterBody: [
    "You fill ordinary days with joy, laughter, and warmth. Today is a little celebration of everything that makes you special.",
    "From the small moments to the big adventures, having you in my life is something I never take for granted.",
    "Thank you for the sweet memories, the late-night talks, and for being exactly who you are.",
  ],
  letterHighlight: "Here’s to you, to us, and to many more beautiful memories together! 🥂💖",
  signatureLead: "With All My Heart 💕",
  signatureName: "Someone Who Cares",
  continueButton: "Continue With Love 💕",
  replayButton: "Replay This Surprise 🔄",
};

const HEART_ANNIVERSARY: Partial<ResolvedHeartTunnelConfig> = {
  startSub: "OUR",
  startMain: "ANNIVERSARY",
  cinematicSub: "✦ OUR JOURNEY ✦",
  cinematicMain: "Our Love Story",
  revealTitle: "Happy\nAnniversary",
  coupleNames: "Anu & Sam",
  caption: "Forever My Favorite Person 💕",
  subtitle: "To Us & Our Beautiful Journey",
  yearsNumber: "5",
  yearsUnit: "Years of Love",
  quote: "Every love story is beautiful,\nbut ours is my favorite.",
  dateText: "~ November 2, 2025 ~",
  letterTitle: "My Dearest Love,",
  letterBody: [
    "Happy Anniversary to the person who fills my heart with endless joy, laughter, and warmth every single day.",
    "From the moment we first met, every day with you has been a beautiful adventure. You are my best friend, my calm in the storm, and my favorite part of every memory.",
    "Thank you for all the sweet moments, the late-night talks, the unconditional love, and for building this wonderful life together.",
  ],
  letterHighlight: "Here’s to us, to our forever, and to a million more memories together! 🥂💖",
  signatureLead: "Forever & Always Yours,",
  signatureName: "With All My Heart 💕",
};

const HEART_BIRTHDAY: Partial<ResolvedHeartTunnelConfig> = {
  startSub: "YOUR",
  startMain: "BIRTHDAY",
  cinematicSub: "✦ YOUR SPECIAL DAY ✦",
  cinematicMain: "A Birthday To Remember",
  revealTitle: "Happy\nBirthday",
  caption: "My Favorite Birthday Person 💕",
  subtitle: "To You & Your Beautiful Year Ahead",
  quote: "May your day be as wonderful as the joy you bring to everyone around you.",
  letterTitle: "My Dearest,",
  letterBody: [
    "Happy Birthday to someone who fills my heart with endless joy, laughter, and warmth every single day.",
    "From the little everyday moments to the biggest adventures, knowing you is a gift I will always treasure.",
    "Thank you for the sweet memories, the late-night talks, and for being exactly who you are.",
  ],
  letterHighlight: "Here’s to you, to your dreams, and to a year full of beautiful memories! 🥂💖",
  signatureLead: "With All My Heart 💕",
};

const HEART_ROMANTIC: Partial<ResolvedHeartTunnelConfig> = {
  startSub: "OUR",
  startMain: "LOVE STORY",
  cinematicSub: "✦ OUR JOURNEY ✦",
  cinematicMain: "Our Love Story",
  revealTitle: "With All\nMy Love",
  caption: "Forever My Favorite Person 💕",
  subtitle: "To Us & Our Beautiful Journey",
  quote: "Every love story is beautiful,\nbut ours is my favorite.",
  letterTitle: "My Dearest Love,",
  signatureLead: "Forever & Always Yours,",
  signatureName: "With All My Heart 💕",
};

const HEART_TUNNEL_DEFAULT_TABLE: {
  base: ResolvedHeartTunnelConfig;
  occasions: Partial<Record<OccasionId, Partial<ResolvedHeartTunnelConfig>>>;
} = {
  base: HEART_BASE,
  occasions: {
    birthday: HEART_BIRTHDAY,
    anniversary: HEART_ANNIVERSARY,
    romantic: HEART_ROMANTIC,
    loveday: HEART_ROMANTIC,
    mothersday: { startMain: "MOTHER'S DAY", revealTitle: "Happy\nMother's Day", letterTitle: "Dear Mom," },
    fathersday: { startMain: "FATHER'S DAY", revealTitle: "Happy\nFather's Day", letterTitle: "Dear Dad," },
    rakshabandhan: { startMain: "RAKSHA BANDHAN", revealTitle: "Happy\nRaksha Bandhan", letterTitle: "Dear Sibling," },
    friendship: { startMain: "FRIENDSHIP", cinematicMain: "Our Beautiful Friendship", revealTitle: "Happy\nFriendship Day", letterTitle: "My Dear Friend," },
    congratulations: { startMain: "CONGRATULATIONS", revealTitle: "You Did\nIt!", cinematicMain: "A Moment Worth Celebrating" },
  },
};

export function getHeartTunnelDefaults(occasion: OccasionId): ResolvedHeartTunnelConfig {
  return merge(HEART_TUNNEL_DEFAULT_TABLE.base, HEART_TUNNEL_DEFAULT_TABLE.occasions[occasion]);
}

const HEART_TEXT_KEYS = [
  "startSub", "startMain", "startSubtitle", "startButton", "startHint", "cinematicSub", "cinematicMain",
  "revealTitle", "coupleNames", "caption", "subtitle", "yearsNumber", "yearsUnit", "quote", "dateText",
  "letterButton", "letterTitle", "letterHighlight", "signatureLead", "signatureName", "continueButton", "replayButton",
] as const;
const HEART_LIMITS: Record<string, number> = {
  startSub: 80, startMain: 120, startSubtitle: 300, startButton: 160, startHint: 200,
  cinematicSub: 120, cinematicMain: 300, revealTitle: 300, coupleNames: 200, caption: 300,
  subtitle: 300, yearsNumber: 20, yearsUnit: 80, quote: 2000, dateText: 120, letterButton: 160,
  letterTitle: 300, letterHighlight: 2000, signatureLead: 200, signatureName: 200,
  continueButton: 160, replayButton: 160,
};

export function resolveHeartTunnelConfig(raw: unknown, occasion: OccasionId): ResolvedHeartTunnelConfig {
  const defaults = getHeartTunnelDefaults(occasion);
  const source = object(raw);
  const result: Record<string, unknown> = clone(defaults);
  for (const key of HEART_TEXT_KEYS) result[key] = text(source[key], defaults[key], HEART_LIMITS[key]);
  result.photoUrl = isSafePhotoUrl(source.photoUrl) ? source.photoUrl : defaults.photoUrl;
  if (Array.isArray(source.letterBody) && source.letterBody.length <= 6 && source.letterBody.every(item => isExperiencePlainText(item, 6000))) {
    result.letterBody = [...source.letterBody];
  }
  return result as unknown as ResolvedHeartTunnelConfig;
}

const CONFESSION_BASE: ResolvedLoveConfessionConfig = {
  question: "Do you love me?",
  yesLabel: "Yes",
  noLabel: "No",
  noReaction: "Okay… I’ll keep the Yes button right here for you 🥺💕",
  climaxLine1: "I Love You",
  climaxLine2: "forever & always",
  envelopeLabel: "Open Secret Letter",
  letterTitle: "For You 💌",
  letterBody: "You make my world brighter just by being in it. Every smile you share, every laugh we have, and every tiny moment with you is something I treasure. I am so incredibly lucky to have you in my life. ❤️",
  signatureLead: "Forever Yours,",
  signatureName: "Someone who loves you",
  closeLabel: "Close Letter",
  continueLabel: "Continue With Love 💕",
  replayLabel: "Replay This Feeling 🔄",
  noGiveInAfter: 6,
};

export function getLoveConfessionDefaults(senderName = ""): ResolvedLoveConfessionConfig {
  const defaults = clone(CONFESSION_BASE);
  if (isExperiencePlainText(senderName, 200) && senderName.trim()) defaults.signatureName = senderName;
  return defaults;
}

const CONFESSION_TEXT_KEYS = [
  "question", "yesLabel", "noLabel", "noReaction", "climaxLine1", "climaxLine2", "envelopeLabel",
  "letterTitle", "letterBody", "signatureLead", "signatureName", "closeLabel", "continueLabel", "replayLabel",
] as const;
const CONFESSION_LIMITS: Record<string, number> = {
  question: 600, yesLabel: 120, noLabel: 120, noReaction: 600, climaxLine1: 300, climaxLine2: 300,
  envelopeLabel: 200, letterTitle: 300, letterBody: 6000, signatureLead: 200, signatureName: 200,
  closeLabel: 160, continueLabel: 160, replayLabel: 160,
};

export function resolveLoveConfessionConfig(raw: unknown, senderName = ""): ResolvedLoveConfessionConfig {
  const defaults = getLoveConfessionDefaults(senderName);
  const source = object(raw);
  const result: Record<string, unknown> = clone(defaults);
  for (const key of CONFESSION_TEXT_KEYS) result[key] = text(source[key], defaults[key], CONFESSION_LIMITS[key]);
  result.noGiveInAfter = typeof source.noGiveInAfter === "number" && Number.isInteger(source.noGiveInAfter) && source.noGiveInAfter >= 3 && source.noGiveInAfter <= 12
    ? source.noGiveInAfter
    : defaults.noGiveInAfter;
  return result as unknown as ResolvedLoveConfessionConfig;
}

const DRIVE_BASE: ResolvedLoveDriveConfig = {
  recipientName: "",
  senderName: "",
  missionLabel: "MISSION",
  progressLabel: "Mission Collectibles Progress",
  objective: "Collect the 3 hidden surprises",
  drivingObjective: "Dodge 💔 barriers & catch the glowing surprises",
  exploringObjective: "{remaining} surprise(s) left — keep your hearts safe!",
  allFoundObjective: "All 3 found! Race to the Love Gate 💖",
  completedObjective: "Mission Complete! Happy Birthday! 🎉",
  introToast: "Switch lanes ‹ › · hold ⚡ to boost",
  hintToast: "Dodge the 💔 barriers — grab 💗 for combos!",
  brokenBlockToast: "✨ A surprise is glowing ahead — catch it!",
  collectLabels: { letter: "Love Letter", gift: "Birthday Gift", heart: "Golden Heart" },
  collectedToasts: { letter: "💌 Love Letter Collected!", gift: "🎁 Birthday Gift Collected!", heart: "💛 Golden Heart Collected!" },
  allCollectedToast: "💖 All 3 surprises found! The Love Gate is open!",
  deliveryToast: "Missed it! It will come around again ({remaining} left)",
  finalTitle: "Happy Birthday! ✨",
  finalMessage: "You dodged every heartbreak and found all three surprises! Ready for your special birthday message?",
  letterTitle: "HAPPY BIRTHDAY & I LOVE YOU",
  letterPrompt: "Your Special Birthday Surprise Message:",
  letterBody: "To my favorite person, every road is better with you by my side. You make my heart race more than any engine ever could. Wishing you the happiest birthday filled with love and magic! 💖🎂✨",
  letterFooter: "Screenshot & cherish this special moment 💌",
  continueLabel: "Back to Surprise 💌",
  replayLabel: "Replay Mission 🔄",
  letterReplayLabel: "Keep Driving / Replay 💖",
  pauseLabel: "Pause Game",
  pauseTitle: "Game Paused",
  pauseBody: "Take a breath on the magical road.",
  resumeLabel: "Resume Drive",
  restartLabel: "Restart Mission 🔄",
  skipIntroLabel: "Skip Intro ➔",
  skipRevealLabel: "Skip Reveal ➔",
  closeLabel: "Close message",
  steerLeftLabel: "Steer Left",
  steerRightLabel: "Steer Right",
  brakeLabel: "Brake",
  accelerateLabel: "Boost",
};

const DRIVE_OCCASIONS: Partial<Record<OccasionId, Partial<ResolvedLoveDriveConfig>>> = {
  anniversary: {
    completedObjective: "Mission Complete! Happy Anniversary! 🎉",
    finalTitle: "Happy Anniversary! ✨",
    finalMessage: "You found all three hidden surprises! Ready for your special anniversary message?",
    letterTitle: "HAPPY ANNIVERSARY & I LOVE YOU",
    letterPrompt: "Your Special Anniversary Message:",
    letterBody: "To my favorite person, every road is better with you by my side. Here’s to another year of love, laughter, and beautiful adventures together! 💖✨",
  },
  romantic: {
    completedObjective: "Mission Complete! A Special Surprise! 🎉",
    finalTitle: "A Little Love For You! ✨",
    finalMessage: "You found all three hidden surprises! Ready for your special message?",
    letterTitle: "WITH ALL MY LOVE",
    letterPrompt: "Your Special Love Note:",
  },
  loveday: {
    completedObjective: "Mission Complete! A Special Surprise! 🎉",
    finalTitle: "A Little Love For You! ✨",
    finalMessage: "You found all three hidden surprises! Ready for your special message?",
    letterTitle: "WITH ALL MY LOVE",
    letterPrompt: "Your Special Love Note:",
  },
  custom: {
    completedObjective: "Mission Complete! 🎉",
    finalTitle: "A Special Surprise For You! ✨",
    finalMessage: "You found all three hidden surprises! Ready for your special message?",
    letterTitle: "A SPECIAL MESSAGE FOR YOU",
    letterPrompt: "Your Special Surprise Message:",
  },
};

export function getLoveDriveDefaults(occasion: OccasionId, recipientName = "", senderName = ""): ResolvedLoveDriveConfig {
  const defaults = merge(DRIVE_BASE, DRIVE_OCCASIONS[occasion]);
  if (isExperiencePlainText(recipientName, 120)) defaults.recipientName = recipientName;
  if (isExperiencePlainText(senderName, 120)) defaults.senderName = senderName;
  if (defaults.recipientName.trim()) {
    const name = defaults.recipientName;
    if (occasion === "birthday") defaults.finalTitle = `Happy Birthday, ${name}! ✨`;
    else if (occasion === "anniversary") defaults.finalTitle = `Happy Anniversary, ${name}! ✨`;
    else if (occasion === "romantic" || occasion === "loveday") defaults.finalTitle = `A Little Love For You, ${name}! ✨`;
  }
  return defaults;
}

const DRIVE_TEXT_KEYS = [
  "recipientName", "senderName", "missionLabel", "progressLabel", "objective", "drivingObjective",
  "exploringObjective", "allFoundObjective", "completedObjective", "introToast", "hintToast", "brokenBlockToast",
  "allCollectedToast", "deliveryToast", "finalTitle", "finalMessage", "letterTitle", "letterPrompt", "letterBody",
  "letterFooter", "continueLabel", "replayLabel", "letterReplayLabel", "pauseLabel", "pauseTitle", "pauseBody",
  "resumeLabel", "restartLabel", "skipIntroLabel", "skipRevealLabel", "closeLabel", "steerLeftLabel", "steerRightLabel",
  "brakeLabel", "accelerateLabel",
] as const;
const DRIVE_LIMITS: Record<string, number> = {
  recipientName: 120, senderName: 120, missionLabel: 80, progressLabel: 200, objective: 600,
  drivingObjective: 600, exploringObjective: 600, allFoundObjective: 600, completedObjective: 600,
  introToast: 600, hintToast: 600, brokenBlockToast: 600, allCollectedToast: 600, deliveryToast: 600,
  finalTitle: 300, finalMessage: 2000, letterTitle: 300, letterPrompt: 300, letterBody: 6000,
  letterFooter: 300, continueLabel: 160, replayLabel: 160, letterReplayLabel: 160, pauseLabel: 120,
  pauseTitle: 300, pauseBody: 600, resumeLabel: 160, restartLabel: 160, skipIntroLabel: 160,
  skipRevealLabel: 160, closeLabel: 120, steerLeftLabel: 120, steerRightLabel: 120, brakeLabel: 120,
  accelerateLabel: 120,
};

export function resolveLoveDriveConfig(
  raw: unknown,
  occasion: OccasionId,
  names: { recipientName?: string; senderName?: string } = {},
): ResolvedLoveDriveConfig {
  const defaults = getLoveDriveDefaults(occasion, names.recipientName, names.senderName);
  const source = object(raw);
  const result: Record<string, unknown> = clone(defaults);
  for (const key of DRIVE_TEXT_KEYS) result[key] = text(source[key], defaults[key], DRIVE_LIMITS[key]);
  for (const group of ["collectLabels", "collectedToasts"] as const) {
    const sourceGroup = object(source[group]);
    const defaultGroup = defaults[group];
    result[group] = {
      letter: text(sourceGroup.letter, defaultGroup.letter, 300),
      gift: text(sourceGroup.gift, defaultGroup.gift, 300),
      heart: text(sourceGroup.heart, defaultGroup.heart, 300),
    };
  }
  return result as unknown as ResolvedLoveDriveConfig;
}
