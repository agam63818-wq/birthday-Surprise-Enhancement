import { useEffect, useRef, useState } from "react";

/**
 * Shared behaviour for the ≤640px hamburger dropdown used by both top bars
 * (PublicTopBar and DashboardTopBar).
 *
 * Extracted so the two bars collapse through exactly the same mechanism —
 * the `.dash-mobile-menu` / `.dash-mobile-dropdown` CSS pair — instead of
 * each growing its own responsive logic.
 *
 * Returns:
 *   • open        — whether the dropdown is visible
 *   • setOpen     — direct setter (used by the hamburger toggle)
 *   • menuRef     — attach to the wrapper around the button + panel so
 *                   clicks inside the menu don't count as "outside"
 *   • runAndClose — wraps an action so it closes the menu, then runs
 */
export function useTopBarMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown on any click/tap outside of it.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Close on Escape — same pattern used by the auth modals.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Every dropdown entry closes the menu, then runs its existing callback
  // untouched — mobile only changes *how* these are triggered.
  const runAndClose = (fn?: () => void) => () => {
    setOpen(false);
    fn?.();
  };

  return { open, setOpen, menuRef, runAndClose };
}
