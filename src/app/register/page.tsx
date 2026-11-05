"use client";

/**
 * /register/page.tsx - DueLine User Registration.
 *
 * Implements user signup with email, password, username, display name, and persona.
 * Passes metadata in options.data for automatic public.profiles provisioning via trigger.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { GuestGuard } from "@/components/auth/auth-guard";

const PERSONAS = [
  { id: "student", label: "Student", desc: "Courses, exams & assignments" },
  { id: "freelancer", label: "Freelancer", desc: "Client milestones & deliverables" },
  { id: "indie_maker", label: "Indie Maker", desc: "Product shipping & roadmaps" },
  { id: "other", label: "Other", desc: "Personal goals & habits" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [persona, setPersona] = useState<string>("student");

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

    // Client-side validations
    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();

    if (!cleanUsername || !cleanDisplayName || !email.trim() || !password) {
      setErrorMessage("All fields are required.");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setErrorMessage(
        "Username must be between 3 and 30 characters and contain only letters, numbers, and underscores."
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
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

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: cleanUsername,
            display_name: cleanDisplayName,
            persona,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      // If user requires email verification, show success prompt
      if (data.user && !data.session) {
        setIsSuccess(true);
        setIsSubmitting(false);
      } else if (data.session) {
        // If email verification is turned off in Supabase, redirect immediately
        router.push("/");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during registration."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <GuestGuard>
      <div className="min-h-screen bg-[#FBF9F4] text-[#283D40] flex flex-col justify-center items-center p-6 py-12">
        <div className="w-full max-w-lg space-y-6">
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
            <h1 className="text-2xl font-bold text-[#283D40]">Create your DueLine account</h1>
            <p className="text-sm text-[#71817D]">
              Join the accountability network designed for focused progress.
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

          {/* Success Confirmation Card */}
          {isSuccess ? (
            <div className="bg-white border border-[#E6E2D8] rounded-2xl p-8 shadow-sm text-center space-y-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EAF3ED] border border-[#C5DEC8] flex items-center justify-center text-[#1B5E38] text-2xl font-bold">
                ✓
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#1D5368]">Check your email</h2>
                <p className="text-sm text-[#71817D]">
                  We sent a confirmation link to <strong className="text-[#283D40]">{email}</strong>.
                </p>
                <p className="text-xs text-[#71817D] pt-2">
                  Please click the link in your email to confirm your account and get started.
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
            /* Registration Form Card */
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

                {/* Display Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="displayName"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]"
                    >
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="input input-bordered w-full bg-[#FBF9F4] border-[#E6E2D8] focus:border-[#1D5368] text-sm text-[#283D40]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="username"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex_rivera"
                      className="input input-bordered w-full bg-[#FBF9F4] border-[#E6E2D8] focus:border-[#1D5368] text-sm text-[#283D40]"
                    />
                  </div>
                </div>

                {/* Persona Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]">
                    Productivity Persona
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PERSONAS.map((p) => {
                      const isSelected = persona === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPersona(p.id)}
                          className={`text-left p-2.5 rounded-xl border text-xs transition ${
                            isSelected
                              ? "border-[#1D5368] bg-[#E8F0F1] text-[#1D5368] font-semibold"
                              : "border-[#E6E2D8] hover:border-stone-400 bg-[#FBF9F4] text-[#283D40]"
                          }`}
                        >
                          <div className="font-semibold">{p.label}</div>
                          <div className="text-[10px] text-[#71817D] mt-0.5">
                            {p.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email Address */}
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

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#71817D]"
                    >
                      Password
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
                      Confirm Password
                    </label>
                    <input
                      id="passwordConfirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="input input-bordered w-full bg-[#FBF9F4] border-[#E6E2D8] focus:border-[#1D5368] text-sm text-[#283D40]"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isConfigured}
                    className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-[#F0ECE4] text-center text-xs text-[#71817D]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[#1D5368] font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </GuestGuard>
  );
}

