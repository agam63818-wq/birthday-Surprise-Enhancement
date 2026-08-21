import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthResult = { error: string | null };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult & { needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Translate raw Supabase error messages into plain-language copy.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email or password doesn't look right. Please try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email address before logging in. Check your inbox for the confirmation link.";
  }
  if (m.includes("user already registered") || m.includes("already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (m.includes("password should be at least")) {
    return "Your password needs to be at least 8 characters long.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("network")) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      // Only update state if something meaningful actually changed.
      // Skip updates for token refresh events where user and token are identical.
      const currentUserId = user?.id;
      const newUserId = newSession?.user?.id;
      const currentToken = session?.access_token;
      const newToken = newSession?.access_token;
      
      if (currentUserId === newUserId && currentToken === newToken) {
        // No actual change - skip state update to avoid unnecessary re-renders
        return;
      }
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? friendlyAuthError(error.message) : null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: friendlyAuthError(error.message), needsEmailConfirmation: false };
    }
    // If email confirmation is required, Supabase returns a user but no session.
    const needsEmailConfirmation = !!data.user && !data.session;
    return { error: null, needsEmailConfirmation };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error ? friendlyAuthError(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
