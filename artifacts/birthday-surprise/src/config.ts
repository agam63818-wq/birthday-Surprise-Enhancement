// ============================================================
//  BIRTHDAY SURPRISE — EASY CUSTOMIZATION CONFIG
//  Edit this file to personalize the experience!
// ============================================================

const config = {
  // ── Person's name ──────────────────────────────────────────
  name: "Nandini",

  // ── Page messages ──────────────────────────────────────────
  landing: {
    title: "Ek chhota sa birthday gift tumhare liye",
    subtitle: "Not just a page… something I made only for you ✨",
    buttonText: "Open It 🎀",
  },

  intro: {
    heading: "Nandini, My Birthday Bestie",
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
    resultMessage: "Nandini Sach bolu… tumhari cuteness measure hi nahi ho sakti. System bhi confuse ho gaya 😌",
    buttonText: "Open Celebration 🎊",
  },

  celebration: {
    title: "Our Little Celebration",
    subtitle1: "Birthday vibes unlocked for Nandini",
    subtitle2: "Bas tum… aur ye feeling",
    badge: "NOT PERFECT… BUT REAL ♥",
    message: "Tumhare saath cheezein extraordinary nahi hoti… bas normal bhi special lagta hai.",
    buttonText: "Continue With Love 💕",
  },

  cake: {
    title: "Happy Birthday To You, Nandini",
    subtitle: "A little page full of love, smiles, and warm wishes.",
    tapHint: "Tap the cake to cut it! 🎂",
    // false = beautifully designed cake with the name written on it (recommended)
    // true  = use your own photo from images.cake below
    useImage: false,
    message: "नंदिनी… 💜 तुम्हारी sweetness के सामने हर cake, हर gift सच में छोटा लगता है… क्योंकि तुम्हारी एक मुस्कान ही सबसे खूबसूरत चीज़ है। 😊 इस खास दिन पर बस दिल से ये दुआ है — जो भी तुम चाहो, वो तुम्हें जरूर मिले। ✨और अगर कभी तुम hurt हुई हो… तो आने वाले time में तुम्हें उससे कई गुना ज्यादा खुशियाँ मिलें। 💫 तुम बस हमेशा ऐसे ही मुस्कुराती रहो… क्योंकि सच में, तुम्हारी smile बहुत special है। ❤️",
    buttonText: "Continue Your Magic ✨",
  },

  whyYouMatter: {
    title: "Why You Matter To Me",
    subtitle: "Not big speeches. Just a few real reasons why you are so important to me.",
    cards: [
      { icon: "🎧", title: "Listening Always", desc: "Tum mere liye sabse special person ho nandini tumhari baatein meri dil ko chhu jati hai same to same mere jaisi ho tum" },
      { icon: "⭐", title: "Support System", desc: "Mai kitna lucky hu jo tumhari jaisi dost mili mujhe tum jab se meri life me aai ho na mujhe phir se kuch bara karne ka reason mil gaya hai tum hamesha mera achha sochti ho." },
      { icon: "🤝", title: "Never Leaving", desc: "hamari dosti kitni gehri hai kitna baar heart break hua phir bhi ham sath hai i pray to god hamari dosti kabhi na tute hamesha sath rahe." },
      { icon: "🤣", title: "Pagal But Precious", desc: "tumhari soch mujhe bhaut achhi lagti hai but tumhare andar ek baat mujhe achhi nhi lagti tumhara mindset baar baar badalta rehta hai but jo bhi ho tum to hamesha mere liye special ho nadini." },
    ],
    buttonText: "Open Memory Wall ❤️",
  },

  ourStory: {
    title: "Us… 🕊️",
    subtitle: "Hamara safar 11th se 12th tak hai abhi to aur dur tak jayega.",
    cards: [
      { icon: "🐻", title: "Random", desc: "hamari to online dosti hui hai mujhe nhi laga tha ki tum meri future best friend ban jaogi but ye meri life ka game changer moment tha nandini pata nhi tum mujhe pahle kya samajh rahi hogi😂" },
      { icon: "💗", title: "online chating", desc: "dheere dheere tumhari help karne ke chakkar me deeply tumse attached ho gaya 😂 but sahi hi hai time ke sath aage badhte badhte pata hi nhi chalta ki ham yaha tak aagaye kaise." },
      { icon: "😂", title: "No Long Gussa", desc: "tumhe gussa itna aata tha na ki kya hi bolu nanadini har baat pe tab gussa hone lagti thi but jo bhi ho tumhare sath prank kar kar ke bhaut maja aata tha." },
      { icon: "💗", title: "Pagal But Precious", desc: "Overthinking ki factory ham dono hai baut tum kuch jyada hi karti ho nandini but tumhare sath baat kar kar ke meri life ka colour change ho gaya meri soch bhi tumhari tarah bante ja rahi hai jo ki mere liye bhaut achhi baat hai hamari life me to bhaut heart break hai phir bhi hamari dosti yesi hai ki kuch bhi ho jaye but hamari dosti kabhi tutti nhi." },
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
          caption: "my cuite radha 💗",
          rotate: 4,
        },
        {
          src: "/photos/photo3.jpg",
          caption: "isme bhaut beautyfull lagti ho 🌙",
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
      "Hello Nandini... 😊",
      "Aaj tumhara birthday hai😊 ना चाँद चाहिए, ना सितारे चाहिए, बस तुम्हारी एक मुस्कान काफी है।इस खास दिन पर बस यही दुआ है मेरी,तुम हमेशा ऐसे ही खुश रहो… यही काफी है। 🎂✨☁️",
      "नंदिनी… 💜 तुम हमेशा मेरी सबसे special, मेरी first और last friend रहोगी। ये तो नहीं जानता कि future में हमारा रिश्ता कैसा होगा…लेकिन इतना जरूर लगता है कि अभी से बेहतर ही होगा शायद। ❤️",
      "आज तुम्हारा birthday है, तो जो भी तुम्हारा मन करे वो करना नंदिनी… और तुम मुझे जो भी बोलोगी, मैं वो करूंगा।मैं बस तुम्हें खुश देखना चाहता हूँ। 😊",
      "मुझे ये नहीं पता कि तुम क्या चाहती हो, लेकिन मैं हमेशा तुम्हारे साथ रहना चाहता हूँ… हर रास्ते पर। 🌙",
      "मैं तो बस इतना चाहता हूँ कि तुम भी मेरा साथ दो… क्योंकि मैं तो हमेशा से हूँ… और हमेशा रहूंगा। 🤍",
      "वैसे कभी-कभी तुम्हारी बहुत याद आती है… पता नहीं क्यों, लगता है कि तुम भी याद करती होगी… फिर सोचता हूँ — शायद ये सिर्फ मेरा ही ख्याल है। ✨",
      "तुम्हारे birthday के लिए ये छोटा सा digital surprise बनाने में मैंने सच में काफी मेहनत की है… कुछ दिनों से बस इसी में लगा हुआ था। तुम्हें शायद लगता होगा कि मैं बदल गया हूँ…लेकिन ऐसा बिल्कुल नहीं है।",
      "मैं तुम्हारे लिए हमेशा free रहता हूँ… 🙂",
      "बस एक छोटी सी wish है —तुम कभी अपनी smile lose मत करना, क्योंकि किसी के लिए वही उसकी मुस्कान की वजह है। 💫",
      "Tumhari life perfect ho ya na ho, par tum hamesha strong raho… aur waise hi real jaise ab ho 💫. 🌻",
      "Cake cut karna… candles bujhana… wish maangना…aur haan, mujhe ignore mat karna aaj के din भी 😂 ❤️",
    ],
    finalLine1: "Aaj ka din special hai…kyunki aaj ke din ek dangerous combo paida hua tha:👉 cute + pagal 😭. 🎂 💜",
    finalLine2: "तुम्हें समझाना मुश्किल है,और तुम्हें भूलना उससे भी ज्यादा। तुम आदत सी बन गई हो…और आदतें आसानी से नहीं जातीं।Happy Birthday, Nandini 🎂💜Stay exactly the way you are.",
    footerText: "Made with love, only for Nandini.",
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
export type Config = typeof config;
