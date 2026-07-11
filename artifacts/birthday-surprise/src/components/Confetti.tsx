import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export default function Confetti({ active }: { active: boolean }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) { firedRef.current = false; return; }
    if (firedRef.current) return;
    firedRef.current = true;

    const colors = ["#f472b6","#c084fc","#e879f9","#818cf8","#f9a8d4","#a78bfa","#ffffff"];

    confetti({ particleCount: 120, spread: 80, origin: { x: 0.5, y: 0.6 }, colors, scalar: 1.1, gravity: 0.9, ticks: 300 });
    setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, scalar: 0.9 }), 200);
    setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, scalar: 0.9 }), 350);
    setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.4 }, colors, startVelocity: 30, decay: 0.93 }), 800);
  }, [active]);

  return null;
}
