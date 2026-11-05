"use client";

/**
 * /reset-password/page.tsx - Password Update Screen.
 *
 * Triggered after successful PKCE exchange of a recovery code on /auth/callback.
 * Updates the user's password using supabase.auth.updateUser({ password }).
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isPasswordRecovery,
    clearPasswordRecovery,
    loading,
    isConfigured,
  } = useAuth();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Unable to initialize Supabase client.");
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      clearPasswordRecovery();
      setIsSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update password."
      );
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] flex items-center justify-center p-6">
        <div className="loading loading-spinner loading-md text-[#1D5368]"></div>
      </div>
    );
  }

  // Reject access if not an authenticated recovery session
  if (isConfigured && (!isAuthenticated || !isPasswordRecovery) && !isSuccess) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] flex flex-col justify-center items-center p-6 text-[#283D40]">
        <div className="w-full max-w-md bg-white border border-[#E6E2D8] rounded-2xl p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold text-[#1D5368]">Recovery Session Required</h1>
          <p className="text-sm text-[#71817D]">
            To reset your password, please use the recovery link sent to your registered email address. Password updates are only permitted during a verified recovery session.
          </p>
          <div className="pt-2">
            <Link
              href="/forgot-password"
              className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-medium"
            >
              Request New Recovery Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#283D40] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-[#1D5368] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              D
            </span>
            <span className="text-2xl font-bold tracking-tight text-[#1D5368]">
              DueLine
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[#283D40]">Set new password</h1>
          <p className="text-sm text-[#71817D]">
            Enter a secure replacement password for your account.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#E6E2D8] rounded-2xl p-8 shadow-sm">
          {isSuccess ? (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EAF3ED] border border-[#C5DEC8] flex items-center justify-center text-[#1B5E38] text-2xl font-bold">
                ✓
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-[#1D5368]">Password Updated</h2>
                <p className="text-sm text-[#71817D]">
                  Your password has been changed successfully. You can now use it to sign in.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-semibold shadow-sm"
                >
                  Continue to DueLine
                </button>
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
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="input input-bordered w-full bg-[#FBF9F4] border-[#E6E2D8] focus:border-[#1D5368] text-sm text-[#283D40]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="passwordConfirm"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]"
                >
                  Confirm New Password
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  className="input input-bordered w-full bg-[#FBF9F4] border-[#E6E2D8] focus:border-[#1D5368] text-sm text-[#283D40]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

