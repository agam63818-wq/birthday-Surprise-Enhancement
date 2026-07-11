import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import Background from "@/components/Background";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/auth/Dashboard";
import PublicShare from "@/pages/PublicShare";
import NotFound from "@/pages/not-found";
import { Spinner } from "@/components/ui/spinner";

// Auth pages share a lightweight background + font-loading shell; the
// full birthday experience (with its own ambient FX, music, confetti,
// etc.) lives entirely inside BirthdayExperience and is mounted at "/".
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <Background />
      {children}
    </>
  );
}

// "/" is not the birthday experience itself — it's a router: logged-in
// visitors go to their dashboard, logged-out visitors go to /login. The
// actual experience is only ever reached via the dashboard's Preview tab
// or a public /s/:slug link.
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen-dvh"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 5 }}
      >
        <Spinner className="size-8" style={{ color: "var(--violet)" }} />
      </div>
    );
  }

  return <Redirect to={user ? "/dashboard" : "/login"} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Switch>
        <Route path="/">
          <AuthShell>
            <RootRedirect />
          </AuthShell>
        </Route>
        <Route path="/s/:slug">
          {(params) => <PublicShare slug={params.slug} />}
        </Route>
        <Route path="/login">
          <AuthShell>
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          </AuthShell>
        </Route>
        <Route path="/signup">
          <AuthShell>
            <PublicOnlyRoute>
              <Signup />
            </PublicOnlyRoute>
          </AuthShell>
        </Route>
        <Route path="/forgot-password">
          <AuthShell>
            <PublicOnlyRoute>
              <ForgotPassword />
            </PublicOnlyRoute>
          </AuthShell>
        </Route>
        <Route path="/reset-password">
          <AuthShell>
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
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </AuthProvider>
  );
}
