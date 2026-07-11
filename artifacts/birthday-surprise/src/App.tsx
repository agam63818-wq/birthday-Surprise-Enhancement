import { Switch, Route } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import Background from "@/components/Background";
import BirthdayExperience from "@/BirthdayExperience";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Dashboard from "@/pages/auth/Dashboard";
import NotFound from "@/pages/not-found";

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

export default function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/">
          <BirthdayExperience />
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
