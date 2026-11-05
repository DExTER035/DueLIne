"use client";

/**
 * auth-provider.tsx - React Context Provider for DueLine Authentication.
 *
 * Provides reactive auth state (user, session, loading, isAuthenticated, isPasswordRecovery)
 * backed by the singleton browser Supabase client using PKCE and localStorage persistence.
 *
 * Security & Reliability:
 * - Subscribes cleanly to onAuthStateChange with lifecycle unmount cleanup.
 * - Captures the PASSWORD_RECOVERY event securely without relying on query params.
 * - Exposes clearPasswordRecovery() to finalize credentials update.
 * - Prevents asynchronous deadlocks and avoids cascading render warnings.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseClient, getSupabaseConfig } from "@/lib/supabase/client";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => getSupabaseConfig(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => config.isConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  useEffect(() => {
    // If Supabase environment is not configured, nothing to subscribe to
    if (!config.isConfigured) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    // 1. Initial session check
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn("[DueLine Auth] Error getting initial session:", error.message);
          setSession(null);
          setUser(null);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("[DueLine Auth] Unexpected error loading session:", err);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // 2. Subscribe to auth events (SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        } else if (event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }

        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [config.isConfigured]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    setIsPasswordRecovery(false);
    if (!supabase) {
      setSession(null);
      setUser(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[DueLine Auth] Error during signOut:", err);
    } finally {
      setSession(null);
      setUser(null);
      setIsPasswordRecovery(false);
    }
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (err) {
      console.warn("[DueLine Auth] Error refreshing session:", err);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(session && user),
      isConfigured: config.isConfigured,
      isPasswordRecovery,
      signOut,
      refreshSession,
      clearPasswordRecovery,
    }),
    [
      user,
      session,
      loading,
      config.isConfigured,
      isPasswordRecovery,
      signOut,
      refreshSession,
      clearPasswordRecovery,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume the authentication context.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
