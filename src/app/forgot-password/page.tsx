"use client";

/**
 * /forgot-password/page.tsx - DueLine Password Recovery Request.
 *
 * Dispatches password recovery emails through Supabase Auth.
 * Includes email validation, success instructions, and unconfigured environment safety.
 */

import React, { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { GuestGuard } from "@/components/auth/auth-guard";

export default function ForgotPasswordPage() {
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
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

    if (!email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Unable to initialize Supabase client.");
      }

      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while requesting password reset."
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
            <h1 className="text-2xl font-bold text-[#283D40]">Reset your password</h1>
            <p className="text-sm text-[#71817D]">
              Enter your email and we&apos;ll send you a link to reset your password.
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

          {/* Card */}
          <div className="bg-white border border-[#E6E2D8] rounded-2xl p-8 shadow-sm">
            {isSuccess ? (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EAF3ED] border border-[#C5DEC8] flex items-center justify-center text-[#1B5E38] text-2xl font-bold">
                  ✉
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-[#1D5368]">Check your inbox</h2>
                  <p className="text-sm text-[#71817D]">
                    If an account exists for <strong className="text-[#283D40]">{email}</strong>,
                    you will receive a password reset link shortly.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-semibold shadow-sm"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </div>
            ) : (
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
                    Registered Email Address
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isConfigured}
                    className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </div>

                <div className="pt-4 text-center">
                  <Link
                    href="/login"
                    className="text-xs text-[#1D5368] font-semibold hover:underline"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}

