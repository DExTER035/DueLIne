"use client";

/**
 * /auth/callback/page.tsx - PKCE Authorization Code Exchange Handler.
 *
 * Implements the hardened Supabase PKCE flow:
 * 1. Reads the authorization 'code' from query parameters.
 * 2. Invokes supabase.auth.exchangeCodeForSession(code) via the browser client.
 * 3. Reliably captures the PASSWORD_RECOVERY event via onAuthStateChange,
 *    without trusting an unverified 'type=recovery' query parameter.
 * 4. Strictly sanitizes the 'next' redirect URL via sanitizeRedirectUrl to
 *    prevent open-redirect vulnerabilities.
 * 5. Wrapped in React <Suspense> for Next.js static export compatibility.
 */

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { sanitizeRedirectUrl } from "@/lib/supabase/auth-utils";

function CallbackLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#FBF9F4] flex flex-col items-center justify-center p-6 text-[#283D40]">
      <div className="flex flex-col items-center space-y-4 max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-[#1D5368] flex items-center justify-center text-white font-bold text-2xl shadow-sm">
          D
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[#1D5368]">Completing Authentication</h1>
          <p className="text-xs text-[#71817D]">
            Exchanging authorization code and establishing secure session...
          </p>
        </div>
        <div className="loading loading-spinner loading-md text-[#1D5368]"></div>
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialError =
    searchParams.get("error_description") || searchParams.get("error");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [isProcessing, setIsProcessing] = useState<boolean>(!initialError);

  useEffect(() => {
    // If an initial error was already in URL params, halt processing
    if (initialError) {
      return;
    }

    let isMounted = true;

    async function processExchange() {
      const code = searchParams.get("code");
      const rawNext = searchParams.get("next");
      const safeNext = sanitizeRedirectUrl(rawNext, "/");

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (isMounted) {
          setErrorMessage(
            "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
          );
          setIsProcessing(false);
        }
        return;
      }

      // 1. Process PKCE authorization code exchange
      if (code) {
        let isRecoveryEvent = false;

        // Subscribe to auth state changes to detect verified PASSWORD_RECOVERY event
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") {
            isRecoveryEvent = true;
          }
        });

        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          subscription.unsubscribe();

          if (!isMounted) return;

          if (error) {
            setErrorMessage(error.message || "Failed to exchange authorization code.");
            setIsProcessing(false);
            return;
          }

          // Route based on verified event from cryptographic code exchange
          if (isRecoveryEvent) {
            router.replace("/reset-password");
          } else {
            router.replace(safeNext);
          }
        } catch (err) {
          subscription.unsubscribe();
          if (!isMounted) return;
          setErrorMessage(
            err instanceof Error ? err.message : "Network error during code exchange."
          );
          setIsProcessing(false);
        }
        return;
      }

      // 2. Fallback: If no code, check whether session was already set or restored
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session) {
          router.replace(safeNext);
        } else {
          setErrorMessage("No authorization code found in callback URL.");
          setIsProcessing(false);
        }
      } catch {
        if (!isMounted) return;
        setErrorMessage("Unable to verify authentication callback.");
        setIsProcessing(false);
      }
    }

    void processExchange();

    return () => {
      isMounted = false;
    };
  }, [initialError, searchParams, router]);

  if (isProcessing) {
    return <CallbackLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#FBF9F4] flex flex-col items-center justify-center p-6 text-[#283D40]">
      <div className="w-full max-w-md bg-white border border-[#E6E2D8] rounded-2xl p-8 shadow-sm space-y-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-xl font-bold">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[#1D5368]">Authentication Incomplete</h1>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            {errorMessage}
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/login"
            className="btn bg-[#1D5368] hover:bg-[#154152] text-white border-none w-full font-medium"
          >
            Return to Sign In
          </Link>
          <Link
            href="/"
            className="text-xs text-[#71817D] hover:text-[#283D40] underline font-medium"
          >
            Go to DueLine Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoadingScreen />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
