"use client";

/**
 * auth-guard.tsx - Client-Side Navigation Guards for DueLine.
 *
 * NOTE ON SECURITY ARCHITECTURE:
 * Client-side guards are solely a User Experience (UX) mechanism to prevent screen
 * flicker, present loading states, and direct users to appropriate routes.
 * The REAL security boundary is PostgreSQL Row Level Security (RLS) enforced at
 * the database level on every PostgREST query with the user's JWT.
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard - Enforces that the user is authenticated before rendering children.
 * If session is loading, renders a branded loading screen.
 * If unauthenticated, redirects to /login.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, loading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isConfigured && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, isConfigured, router]);

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen bg-[#FBF9F4] flex flex-col items-center justify-center p-6 text-[#283D40]">
          <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1D5368] flex items-center justify-center text-white font-bold text-2xl shadow-sm animate-pulse">
              D
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1D5368]">DueLine</h2>
              <p className="text-xs text-[#71817D]">Verifying session...</p>
            </div>
            <div className="loading loading-spinner loading-md text-[#1D5368]"></div>
          </div>
        </div>
      )
    );
  }

  // If not configured, allow rendering or notify
  if (!isConfigured) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * GuestGuard - Enforces that authenticated users do not see guest-only pages
 * such as /login, /register, and /forgot-password.
 * Redirects authenticated users to the root/dashboard.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isConfigured && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, isConfigured, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] flex items-center justify-center p-6">
        <div className="loading loading-spinner loading-md text-[#1D5368]"></div>
      </div>
    );
  }

  return <>{children}</>;
}

