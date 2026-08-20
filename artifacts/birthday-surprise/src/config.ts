// ============================================================
//  BIRTHDAY SURPRISE — EASY CUSTOMIZATION CONFIG
//  Edit this file to personalize the experience!
// ============================================================

import type { FontPresetId } from "@/lib/fontPresets";
import type { ThemePresetId } from "@/lib/themePresets";

const config = {
  // ── Person's name ──────────────────────────────────────────
  name: "Zoya",

  // ── Page messages ──────────────────────────────────────────
  landing: {
    title: "Ek chhota sa birthday gift tumhare liye",
    subtitle: "Not just a page… something I made only for you ✨",
    buttonText: "Open It 🎀",
  },

  intro: {
    heading: "Zoya, My Birthday Bestie",
    message: "Aaj ka din special hai… but sach bolu, tum usse bhi zyada special ho. Isliye ye chhota sa surprise banaya hai… sirf tumhare liye.",
    loadingText: "Collecting our beautiful memories… ✨",
    buttonText: "Open Bestie Birthday Surprise 🎁",
  },

  cutenessMeter: {
    title: "Cuteness Meter 😍",
    subtitle: "Checking your cuteness level before unlocking the surprise ✨",
    scanningText: "Scanning cuteness... 🌙",
    resultText: "CERTIFIED 100% ADORABLE",
    resultHeadline: "Too Cute!",
    resultMessage: "Zoya, sach bolu… tumhari cuteness measure hi nahi ho sakti. System bhi confuse ho gaya 😌",
    buttonText: "Open Celebration 🎊",
  },

  celebration: {
    title: "Our Little Celebration",
    subtitle1: "Birthday vibes unlocked for Zoya",
    subtitle2: "Bas tum… aur ye feeling",
    badge: "NOT PERFECT… BUT REAL ♥",
    message: "Tumhare saath cheezein extraordinary nahi hoti… bas normal bhi special lagta hai.",
    buttonText: "Continue With Love 💕",
  },

  cake: {
    title: "Happy Birthday To You, Zoya",
    subtitle: "A little page full of love, smiles, and warm wishes.",
    tapHint: "Tap the cake to cut it! 🎂",
    // false = beautifully designed cake with the name written on it (recommended)
    // true  = use your own photo from images.cake below
    useImage: false,
    message: "ज़ोया… 💜 तुम्हारी sweetness के सामने हर cake, हर gift सच में छोटा लगता है… क्योंकि तुम्हारी एक मुस्कान ही सबसे खूबसूरत चीज़ है। 😊 इस खास दिन पर बस दिल से ये दुआ है — जो भी तुम चाहो, वो तुम्हें जरूर मिले। ✨ और अगर कभी तुम hurt हुई हो… तो आने वाले time में तुम्हें उससे कई गुना ज्यादा खुशियाँ मिलें। 💫 तुम बस हमेशा ऐसे ही मुस्कुराती रहो… क्योंकि सच में, तुम्हारी smile बहुत special है। ❤️",
    buttonText: "Continue Your Magic ✨",
  },

  whyYouMatter: {
    title: "Why You Matter To Me",
    subtitle: "Not big speeches. Just a few real reasons why you are so important to me.",
    cards: [
      { icon: "🎧", title: "Listening Always", desc: "Tumse baat karke lagta hai jaise sab kuch halka ho gaya. Tum sunti ho, samajhti ho — aur yahi sabse bada gift hai." },
      { icon: "⭐", title: "Support System", desc: "Jab bhi kuch achha ya bura hota hai, sabse pehle tumhe hi batane ka mann karta hai. Tum ho toh sab thoda aasan lagta hai." },
      { icon: "🤝", title: "Never Leaving", desc: "Kitna kuch ho gaya ab tak, phir bhi hum sath hain. Bas yahi dua hai ki ye dosti hamesha aise hi bani rahe." },
      { icon: "🤣", title: "Pagal But Precious", desc: "Tumhari batein, tumhara pagalpan, sab kuch alag hi vibe deta hai. Jaisi bhi ho, tum bilkul perfect ho apne tarike se." },
    ],
    buttonText: "Open Memory Wall ❤️",
  },

  ourStory: {
    title: "Us… 🕊️",
    subtitle: "Hamara safar yahi se shuru hua tha, aur abhi bahut aage tak jayega.",
    cards: [
      { icon: "🐻", title: "Random Shuruaat", desc: "Pata nahi tha ki ek random si baat itni badi dosti ban jayegi. Ab sochta/sochti hoon toh lagta hai — best decision tha." },
      { icon: "💗", title: "Roz Ki Baatein", desc: "Dheere dheere baatein karte karte pata hi nahi chala kab tum itni important ban gayi. Time flies, but memories stay." },
      { icon: "😂", title: "No Long Gussa", desc: "Chhoti chhoti baaton pe gussa, phir wahi purani masti — yahi toh sabse fun part hai hamari dosti ka." },
      { icon: "💗", title: "Pagal But Precious", desc: "Hum dono thoda zyada hi sochte hain, but tumse baat karke life ka rang hi badal gaya hai. Bahut kuch dekha hai saath mein, phir bhi ye dosti kabhi tooti nahi." },
    ],
    buttonText: "Open Grand Finale 🎉",
  },

  memoryWall: {
    title: "Memory Wall 📸",
    subtitle: "Every moment treasured forever",
    photos: [
      {
        src: "/photos/photo1.png",
        caption: "my favorite pic 💗",
        rotate: -3,
      },
      {
        src: "/photos/photo2.jpg",
        caption: "cutest one 💗",
        rotate: 4,
      },
      {
        src: "/photos/photo3.jpg",
        caption: "isme bahut beautiful lagti ho 🌙",
        rotate: -2,
      },
      {
        src: "/photos/photo4.jpg",
        caption: "amazing look",
        rotate: 3,
      },
      {
        src: "/photos/photo5.jpg",
        caption: "Always there 💛",
        rotate: -4,
      },
      {
        src: "/photos/photo6.jpg",
        caption: "Golden memories ✨",
        rotate: 2,
      },
    ],
    buttonText: "Before You Leave... 💌",
  },

  beforeLeave: {
    message: "Before you leave... I have one last thing to say.",
    buttonText: "💌 Open My Last Note",
  },

  lastNote: {
    lines: [
      "Hello Zoya... 😊",
      "Aaj tumhara birthday hai 😊 na chaand chahiye, na sitare chahiye, bas tumhari ek muskaan kaafi hai. Is khaas din pe bas yahi dua hai meri, tum hamesha aise hi khush raho… yahi kaafi hai. 🎂✨",
      "ज़ोया… 💜 तुम हमेशा मेरी सबसे special दोस्तों में से एक रहोगी। Future में सab kaisa hoga pata nahi, but itna zaroor lagta hai ki abhi se behtar hi hoga. ❤️",
      "Aaj tumhara birthday hai, toh jo bhi tumhara mann kare wahi karna… aur khoob enjoy karna, kyunki tum isi din ki hakdaar ho. 😊",
      "Kabhi kabhi purani baatein yaad aati hain, aur lagta hai kitna kuch badal gaya, phir bhi kuch cheezein waisi ki waisi hi rehti hain — jaise ye dosti. 🌙",
      "Bas itna chahta/chahti hoon ki tum hamesha aise hi khush raho, aur jo bhi karo, dil se karo. 🤍",
      "Tumhare liye ye chhota sa digital surprise banane mein sach mein maza aaya… kuch dinon se bas isi mein laga hua tha. ✨",
      "Bas ek chhoti si wish hai — tum kabhi apni smile lose mat karna, kyunki kisi ke liye wahi uski muskaan ki wajah hai. 💫",
      "Tumhari life perfect ho ya na ho, par tum hamesha strong raho… aur waise hi real jaise ab ho 💫 🌻",
      "Cake cut karna… candles bujhana… wish maangna… aur haan, is din ko poora enjoy karna 😂 ❤️",
    ],
    finalLine1: "Aaj ka din special hai… kyunki aaj hi ke din tum paida hui thi, aur ye duniya thodi zyada achhi ban gayi thi. 🎂 💜",
    finalLine2: "Kuch log life mein aise aa jaate hain jo bas achhe lagte hain — bina kisi wajah ke. Tum unmein se ek ho. Happy Birthday, Zoya 🎂💜 Stay exactly the way you are.",
    footerText: "Made with love, only for Zoya.",
  },

// ── Audio ───────────────────────────────────
audio: {
  backgroundMusic: "/audio/background-music.mp3",
  birthdaySong: "/audio/birthday-song.mp3",
  useFallbackTones: true,
},

// ── Images ─────────────────────────────
images: {
  cake: "/assets/cake.png",
  cakeCut: "/assets/cake.png",
  teddy: "/assets/teddy.png",
}

};

export default config;

// Base type derived from the config literal above.
type BaseConfig = typeof config;

// Public Config type. Adds OPTIONAL top-level fields that are absent from
// older saved rows — all are optional (with `?`) so existing surprises keep
// working without a database migration. Everything is stored inside the
// existing `config` jsonb column.
export type Config = BaseConfig & {
  // Per-page font-style overrides (Part 1 — Font Picker).
  textStyles?: Partial<Record<
    "landing" | "intro" | "cutenessMeter" | "celebration" | "cake" |
    "whyYouMatter" | "ourStory" | "memoryWall" | "beforeLeave" | "lastNote",
    FontPresetId
  >>;

  // Occasion type — determines which occasion-specific pages/copy to show.
  // Defaults to "birthday" when absent so every existing row keeps working.
  // "custom" is reserved for future use and is not exposed in the UI yet.
  occasionType?: "birthday" | "rakshabandhan" | "fathersday" | "mothersday" | "loveday" | "custom";

  // Color theme — maps to a ThemePresetId defined in src/lib/themePresets.ts.
  // Defaults to "midnightPurple" (= the current live look) when absent.
  themeId?: ThemePresetId;

  // Per-occasion hero page content. Every field is optional — the page
  // falls back to warm Hinglish defaults from src/lib/occasions.ts when
  // a field is absent or blank. No database migration needed.
  occasionContent?: {
    rakshabandhan?: {
      title?: string;
      message?: string;
      siblingName?: string;
      buttonText?: string;
    };
    fathersday?: {
      title?: string;
      message?: string;
      buttonText?: string;
    };
    mothersday?: {
      title?: string;
      message?: string;
      buttonText?: string;
    };
    loveday?: {
      title?: string;
      message?: string;
      buttonText?: string;
    };
  };
};
