"use client";

/**
 * /login/page.tsx - DueLine User Sign In.
 *
 * Implements email + password authentication using the browser Supabase client.
 * Includes form validation, error states, and unconfigured environment detection.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { GuestGuard } from "@/components/auth/auth-guard";

export default function LoginPage() {
  const router = useRouter();
  const { isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isConfigured) {
      setErrorMessage(
        "Supabase is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Unable to initialize Supabase client.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        router.push("/");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during sign in."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <GuestGuard>
      <div className="min-h-screen bg-[#FBF9F4] text-[#283D40] flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <span className="w-9 h-9 rounded-xl bg-[#1D5368] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                D
              </span>
              <span className="text-2xl font-bold tracking-tight text-[#1D5368]">
                DueLine
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-[#283D40]">Sign in to your account</h1>
            <p className="text-sm text-[#71817D]">
              Track your goals, stay accountable, and keep deadlines on track.
            </p>
          </div>

          {/* Unconfigured Alert */}
          {!isConfigured && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl space-y-1">
              <p className="font-semibold">⚠️ Environment Configuration Pending</p>
              <p>
                Supabase credentials are not set in your environment. Provide{" "}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                and{" "}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{" "}
                to connect live authentication.
              </p>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white border border-[#E6E2D8] rounded-2xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl"
                >
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="input input-bordered w-full bg-[#FBF9F4] border-[#E6E2D8] focus:border-[#1D5368] text-sm text-[#283D40]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#1D5368] hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input input-bordered w-full bg-[#FBF9F4] border-[#E6E2D8] focus:border-[#1D5368] text-sm text-[#283D40]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isConfigured}
                  className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-[#F0ECE4] text-center text-xs text-[#71817D]">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/register"
                className="text-[#1D5368] font-semibold hover:underline"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}

