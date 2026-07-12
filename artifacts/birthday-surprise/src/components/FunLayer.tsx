import { useEffect, useState } from "react";
import { TeddySVGOnly } from "@/components/Teddy";

// Playful page-aware layer: a teddy peeks from the bottom-left corner with
// a cheeky speech bubble on every page. Poking him cycles funny lines and
// bursts little hearts/emojis. Purely decorative — pointer events are only
// enabled on the teddy itself so it never blocks page interactions.
const PAGE_LINES: Record<string, string[]> = {
  landing: ["Psst… something magical is loading 🤫", "Shhh! Top-secret surprise ahead 🎁", "Poke me if you're excited 🧸"],
  intro: ["No skipping! I'm watching 👀", "Written with 100% pure love 💌", "Tissues ready? Just asking 🤭"],
  cuteness: ["Warning: cuteness overload ahead 🚨", "My cute-o-meter might explode 😳", "Scientific stuff. Very serious 🔬"],
  celebration: ["PARTYYY TIME! 🥳", "Dance now, thank me later 💃", "I brought the confetti 🎊"],
  cake: ["Cut it fast, I'm hungry 🤤", "Save one slice for me 🥺", "I promise I didn't lick it… 👀"],
  whyYouMatter: ["All facts. Double-checked 💯", "Certified 100% true 🌟", "No notes. Perfect human 😌"],
  ourStory: ["Best story ever told 📖", "Plot twist: it gets cuter 😉", "I cried at chapter one 🥹"],
  memoryWall: ["Caught in 4K 📸", "So photogenic… suspicious 🤨", "Which one's my favourite? All 🥰"],
  beforeLeave: ["I'm not crying, YOU are 🥲", "Wait wait wait… one more thing!", "Don't go yet 🥺👉👈"],
  lastNote: ["Okay NOW I'm crying 🥹", "Forever and always ❤️", "Best. Birthday. Ever. 🎂"],
};

const BURST_EMOJI = ["💖", "💕", "✨", "🎈", "😘", "🌸"];

export default function FunLayer({ page }: { page: string }) {
  const lines = PAGE_LINES[page] ?? ["Having fun? 🥰"];
  const [lineIdx, setLineIdx] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  // Teddy greets on every page change, then hides his bubble
  useEffect(() => {
    setLineIdx(0);
    setShowBubble(true);
    const t = setTimeout(() => setShowBubble(false), 4200);
    return () => clearTimeout(t);
  }, [page]);

  const poke = () => {
    try { navigator.vibrate?.(18); } catch { /* haptics unsupported */ }
    setLineIdx((i) => (i + 1) % lines.length);
    setShowBubble(true);
    setBurstKey((k) => k + 1);
    setTimeout(() => setShowBubble(false), 3600);
  };

  return (
    <div style={{ position: "fixed", left: "8px", bottom: 0, zIndex: 120, pointerEvents: "none" }}>
      {/* Little emoji burst when the teddy is poked */}
      {burstKey > 0 && (
        <div key={burstKey} style={{ position: "absolute", bottom: "84px", left: 0, width: "110px" }}>
          {BURST_EMOJI.map((e, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${i * 18}px`,
                bottom: 0,
                fontSize: `${15 + (i % 3) * 5}px`,
                animation: `fun-heart-rise ${1.5 + (i % 3) * 0.4}s ease-out ${i * 0.08}s both`,
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}

      {showBubble && <div className="fun-bubble">{lines[lineIdx % lines.length]}</div>}

      <div
        key={page}
        className="fun-teddy"
        onClick={poke}
        role="button"
        aria-label="Poke the teddy"
        style={{ pointerEvents: "auto", display: "inline-block" }}
      >
        <TeddySVGOnly size={82} animate="wave" />
      </div>
    </div>
  );
}
