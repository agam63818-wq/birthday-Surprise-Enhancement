import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Pause decorative CSS animations while the tab is hidden (saves battery/CPU).
// Canvas/RAF loops already pause themselves via their own visibility handlers.
if (typeof document !== "undefined") {
  const syncHidden = () => document.documentElement.toggleAttribute("data-doc-hidden", document.hidden);
  syncHidden();
  document.addEventListener("visibilitychange", syncHidden);
}

createRoot(document.getElementById("root")!).render(<App />);
