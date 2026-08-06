import { useState } from "react";
import BirthdayExperience from "@/BirthdayExperience";
import PublicTopBar from "@/components/dashboard/PublicTopBar";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import AuthModal from "@/components/auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import defaultConfig from "@/config";

// Public landing page rendered at "/" for all visitors — logged-in or guest.
// Shows the full BirthdayExperience driven by the bundled defaultConfig so
// guests get a real preview without any auth check or redirect.
//
// PublicTopBar sits in a fixed overlay above the experience (z-index 1000,
// same layer as DashboardTopBar). The experience's own ambient layers
// (Background, AmbientFX, FunLayer, etc.) render beneath it as usual.
//
// Part 2: auth gate modals are wired here.
//   • Guest clicks Customize/Share → LoginRequiredModal (auth gate)
//   • Logged-in user clicks Customize/Share → no-op (Part 3 will navigate)
//   • Navbar "Log In" → AuthModal in login mode (skip gate)
//   • Navbar "Sign Up" → AuthModal in signup mode (skip gate)
export default function PublicHome() {
  const { user } = useAuth();

  // Auth gate modal (LoginRequiredModal)
  const [authGateOpen, setAuthGateOpen] = useState(false);

  // Full auth modal (AuthModal)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");

  // Open the auth gate only for guests; logged-in users are a no-op for now
  // (Part 3 will wire the actual Customize/Share actions for logged-in users).
  const handleGatedAction = () => {
    if (user) return; // already logged in — no-op until Part 3
    setAuthGateOpen(true);
  };

  // Open AuthModal directly (navbar buttons bypass the gate)
  const openAuthModal = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  // Gate → AuthModal transitions
  const handleGateLogin = () => {
    setAuthGateOpen(false);
    openAuthModal("login");
  };
  const handleGateSignup = () => {
    setAuthGateOpen(false);
    openAuthModal("signup");
  };

  // Called after a successful sign-in or sign-up — close the modal.
  // Part 3 will add redirect / resume logic here.
  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
  };

  return (
    <>
      <PublicTopBar
        onCustomize={handleGatedAction}
        onShare={handleGatedAction}
        onLogin={() => openAuthModal("login")}
        onSignup={() => openAuthModal("signup")}
      />

      {/* Render the full experience with the bundled default config.
          Passing it explicitly is equivalent to omitting the prop (the
          component defaults to it), but being explicit makes the intent clear. */}
      <BirthdayExperience config={defaultConfig} />

      {/* Auth gate — shown when a guest tries a protected action */}
      <LoginRequiredModal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        onLogin={handleGateLogin}
        onSignup={handleGateSignup}
      />

      {/* Full auth modal — login + signup in one overlay */}
      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
