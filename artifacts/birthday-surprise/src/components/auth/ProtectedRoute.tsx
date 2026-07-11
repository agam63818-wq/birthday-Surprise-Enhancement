import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";

function FullScreenSpinner() {
  return (
    <div
      className="min-h-screen-dvh"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 5 }}
    >
      <Spinner className="size-8" style={{ color: "var(--violet)" }} />
    </div>
  );
}

// Redirects unauthenticated users to /login. Shows a spinner while the
// initial session check is in flight to avoid a flash of the wrong screen.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

// Redirects already-authenticated users away from auth pages to /dashboard.
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (user) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}
