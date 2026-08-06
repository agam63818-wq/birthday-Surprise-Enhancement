import { useState } from "react";
import { useLocation } from "wouter";
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
//   • Navbar "Log In" → AuthModal in login mode (skip gate)
//   • Navbar "Sign Up" → AuthModal in signup mode (skip gate)
//
// Part 3: after a successful login/signup the user lands exactly where they
// intended — the reason the modal was opened is tracked in `authIntent` and
// forwarded to the dashboard as a query param (?intent=customize|share).
// Logged-in users clicking Customize/Share skip the modals entirely and go
// straight to the same URLs.

type AuthIntent = "customize" | "share" | "plain" | null;

export default function PublicHome() {
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();

  // Auth gate modal (LoginRequiredModal)
  const [authGateOpen, setAuthGateOpen] = useState(false);

  // Full auth modal (AuthModal)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");

  // WHY the auth modal was opened — decides where the user lands after
  // authentication succeeds.
  //   "customize" / "share" → /dashboard?intent=...
  //   "plain" (navbar Log In / Sign Up) → /dashboard
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);

  // Customize / Share from the top bar.
  // Logged-in users go straight to the dashboard with the intent in the URL;
  // guests see the auth gate first (intent is remembered for after auth).
  const handleGatedAction = (intent: "customize" | "share") => {
    if (user) {
      navigate(`/dashboard?intent=${intent}`);
      return;
    }
    setAuthIntent(intent);
    setAuthGateOpen(true);
  };

  // Navbar Log In / Sign Up bypass the gate — plain intent (no deep-link).
  const openAuthModalPlain = (mode: "login" | "signup") => {
    setAuthIntent("plain");
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  // Gate → AuthModal transitions keep the original customize/share intent.
  const handleGateLogin = () => {
    setAuthGateOpen(false);
    setAuthModalMode("login");
    setAuthModalOpen(true);
  };
  const handleGateSignup = () => {
    setAuthGateOpen(false);
    setAuthModalMode("signup");
    setAuthModalOpen(true);
  };

  // Called after a successful sign-in or sign-up — close both modals, then
  // send the user exactly where they intended to go.
  const handleAuthSuccess = () => {
    setAuthGateOpen(false);
    setAuthModalOpen(false);
    if (authIntent === "customize") {
      navigate("/dashboard?intent=customize");
    } else if (authIntent === "share") {
      navigate("/dashboard?intent=share");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <>
      <PublicTopBar
        onCustomize={() => handleGatedAction("customize")}
        onShare={() => handleGatedAction("share")}
        onLogin={() => openAuthModalPlain("login")}
        onSignup={() => openAuthModalPlain("signup")}
        onDashboard={() => navigate("/dashboard")}
        onLogout={() => signOut()}
        isLoggedIn={!!user}
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
