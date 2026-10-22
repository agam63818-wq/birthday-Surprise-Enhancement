import type { OccasionId } from "./schema";

const ROMANTIC: OccasionId[] = ["romantic", "loveday", "anniversary"];

export function isRomanticOccasion(occasion: OccasionId): boolean {
  return ROMANTIC.includes(occasion);
}

export function giftRevealLine(occasion: OccasionId, custom?: string): string {
  switch (occasion) {
    case "birthday":
      return "A little surprise for you 🎁";
    case "anniversary":
      return "A little memory, wrapped just for you.";
    case "friendship":
      return "Something small for one very special friend.";
    case "congratulations":
      return "You did it. This one’s for you. 🎉";
    case "justbecause":
      return "No occasion needed.";
    case "mothersday":
      return "For the heart that taught me love.";
    case "fathersday":
      return "For the one who always showed up.";
    case "rakshabandhan":
      return "A little thread of love, just for you.";
    case "romantic":
    case "loveday":
      return "A little something, wrapped in feeling.";
    case "custom":
      return custom?.trim() || "Made just for you.";
    default:
      return "A little something, just for you.";
  }
}

export function butterflyIntro(occasion: OccasionId): {
  whisper: string;
  cta: string;
  badge: string;
} {
  if (ROMANTIC.includes(occasion)) {
    return {
      whisper: "I have something to tell you...",
      cta: "tap to open your heart",
      badge: "To my favorite person",
    };
  }
  switch (occasion) {
    case "friendship":
      return { whisper: "I made this for you...", cta: "tap to begin", badge: "For a true friend" };
    case "congratulations":
      return { whisper: "This one is all yours...", cta: "tap to open", badge: "You did it" };
    case "mothersday":
    case "fathersday":
      return { whisper: "A small thank you...", cta: "tap to begin", badge: "For you, always" };
    case "rakshabandhan":
      return { whisper: "Something from the heart...", cta: "tap to begin", badge: "Tied with love" };
    case "birthday":
      return { whisper: "I have something for you...", cta: "tap to open", badge: "Made for your day" };
    default:
      return { whisper: "I have something for you...", cta: "tap to begin", badge: "Just for you" };
  }
}

export function butterflyWhispers(occasion: OccasionId): string[] {
  if (ROMANTIC.includes(occasion)) {
    return ["I love you", "always", "forever", "♡", "my love", "💕"];
  }
  if (occasion === "friendship") {
    return ["my friend", "always", "thank you", "♡", "forever", "you"];
  }
  if (occasion === "congratulations") {
    return ["you did it", "so proud", "♡", "bravo", "forever"];
  }
  return ["for you", "always", "thank you", "♡", "forever"];
}

export function youAndMeCaption(occasion: OccasionId): string {
  if (ROMANTIC.includes(occasion)) return "WRITTEN IN THE STARS";
  if (occasion === "friendship") return "TWO SOULS, ONE STORY";
  if (occasion === "congratulations") return "THIS ONE'S FOR YOU";
  return "A STORY OF US";
}

export function letterHints(): string[] {
  return [
    "Open me",
    "For the days you need a smile",
    "One little memory",
    "Keep this close",
    "When you miss this",
    "A note to hold",
  ];
}

export function describeConfigChange(path: string, value: unknown): string {
  if (path === "themePreset") return `Switch theme to ${String(value)}`;
  if (path === "butterfly.message") return "Change the butterfly message";
  if (path === "butterfly.subMessage") return "Change the butterfly note";
  if (path === "roseBloom.text") return "Change the rose message";
  if (path === "scenes") return "Reorder the scene sequence";
  if (path === "occasionId") return `Make this a ${String(value)} surprise`;
  if (path === "countdown.enabled") return value ? "Turn the scheduled countdown on" : "Turn the scheduled countdown off";
  if (path === "countdown.localDate") return `Set the countdown date to ${String(value)}`;
  if (path === "countdown.localTime") return `Set the countdown time to ${String(value)}`;
  if (path === "countdown.timezone") return `Use the ${String(value)} timezone for the countdown`;
  if (path.startsWith("countdown.")) return `Update the countdown ${path.slice("countdown.".length).replace(".", " ")}`;
  if (path.startsWith("features.")) {
    const key = path.slice("features.".length);
    const labels: Record<string, string> = {
      roseBloom: "Rose Bloom",
      butterfly: "Butterfly",
      notebook: "Notebook",
      letters: "Letters",
      giftReveal: "Gift Reveal",
      youAndMe: "You & Me",
    };
    const label = labels[key] ?? key;
    return value ? `Enable ${label}` : `Disable ${label}`;
  }
  return `Update ${path}`;
}
