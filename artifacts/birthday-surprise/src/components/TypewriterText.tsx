import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
  onDone?: () => void;
}

export default function TypewriterText({ text, speed = 45, delay = 0, style, className, onDone }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
          onDone?.();
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [text]);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && (
        <span style={{
          display: "inline-block",
          width: "2px",
          height: "1em",
          background: "rgba(240,180,255,0.8)",
          marginLeft: "2px",
          verticalAlign: "middle",
          animation: "typewriter-cursor 0.7s ease-in-out infinite",
        }} />
      )}
    </span>
  );
}
