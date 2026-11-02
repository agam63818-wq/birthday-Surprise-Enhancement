import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import Background from "@/components/Background";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/auth/Dashboard";
import PublicShare from "@/pages/PublicShare";
import PublicHome from "@/pages/PublicHome";
import NotFound from "@/pages/not-found";
import ExperienceFrameFixture from "@/pages/ExperienceFrameFixture";
import SiteFooter from "@/components/SiteFooter";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal/constants";

// Legal pages are lazy so they don't bloat the main bundle.
const PrivacyPolicyPage = lazy(() => import("@/pages/legal/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("@/pages/legal/TermsPage"));

// Auth pages share a lightweight background + font-loading shell; the
// full birthday experience (with its own ambient FX, music, confetti,
// etc.) lives entirely inside BirthdayExperience and is mounted at "/".
function AuthShell({ children, footer = false }: { children: React.ReactNode; footer?: boolean }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <Background />
      {children}
      {footer && <SiteFooter />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Switch>
        <Route path="/">
          <AuthShell>
            <PublicHome />
          </AuthShell>
        </Route>
        <Route path="/s/:slug">
          {(params) => <PublicShare slug={params.slug} />}
        </Route>
        <Route path={PRIVACY_PATH}>
          <AuthShell>
            <Suspense fallback={<div className="min-h-screen-dvh" />}>
              <PrivacyPolicyPage />
            </Suspense>
          </AuthShell>
        </Route>
        <Route path={TERMS_PATH}>
          <AuthShell>
            <Suspense fallback={<div className="min-h-screen-dvh" />}>
              <TermsPage />
            </Suspense>
          </AuthShell>
        </Route>
        <Route path="/login">
          <AuthShell footer>
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          </AuthShell>
        </Route>
        <Route path="/signup">
          <AuthShell footer>
            <PublicOnlyRoute>
              <Signup />
            </PublicOnlyRoute>
          </AuthShell>
        </Route>
        <Route path="/forgot-password">
          <AuthShell footer>
            <PublicOnlyRoute>
              <ForgotPassword />
            </PublicOnlyRoute>
          </AuthShell>
        </Route>
        <Route path="/reset-password">
          <AuthShell footer>
            <ResetPassword />
          </AuthShell>
        </Route>
        <Route path="/dashboard">
          <AuthShell>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </AuthShell>
        </Route>
        {import.meta.env.DEV && (
          <Route path="/__experience-frame-fixture" component={ExperienceFrameFixture} />
        )}
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </AuthProvider>
  );
}
