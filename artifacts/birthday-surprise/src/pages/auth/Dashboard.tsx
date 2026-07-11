import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";

// Placeholder dashboard so the auth flow can be tested end to end.
// The real dashboard is built in a separate task.
export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <AuthLayout title="You're in! 🎉">
      <p style={{ color: "var(--ink-soft)", marginBottom: "22px", lineHeight: 1.6 }}>
        Logged in as <strong style={{ color: "var(--ink)" }}>{user?.email}</strong>
      </p>
      <Button className="w-full" size="lg" variant="secondary" onClick={() => signOut()}>
        Log Out
      </Button>
    </AuthLayout>
  );
}
