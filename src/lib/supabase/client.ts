/**
 * client.ts - Browser-Safe Supabase Client Foundation for DueLine.
 *
 * Implements a singleton browser Supabase client configured for Next.js App Router
 * and Cloudflare Pages static export with PKCE authentication flow.
 *
 * Architecture constraints:
 * - Pure client-side authentication (@supabase/supabase-js).
 * - PKCE flow enabled (flowType: 'pkce').
 * - Session persistence in browser localStorage.
 * - Automatic background token refresh enabled.
 * - Safe static export: Does not throw during prerendering when environment
 *   variables are absent or set to placeholders.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

/**
 * Returns whether Supabase public environment variables are properly configured.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes("your-project-ref") &&
      !supabaseAnonKey.includes("your-anon-public-key")
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured,
  };
}

/**
 * Validates that environment variables are present before live operations.
 * Throws a helpful diagnostic error if called in an unconfigured state.
 */
export function assertSupabaseConfigured(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    throw new Error(
      "Supabase client is not yet configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
    );
  }
  return {
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
  };
}

/**
 * Singleton client instance to avoid multiple subscriptions and event listeners.
 */
let browserClientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns the singleton browser Supabase client configured for PKCE.
 * Returns null if environment variables are not configured, preventing runtime
 * crashes during static builds or unconfigured local evaluation.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  // In the browser, reuse the singleton instance
  if (typeof window !== "undefined") {
    if (!browserClientInstance) {
      browserClientInstance = createClient<Database>(
        config.supabaseUrl,
        config.supabaseAnonKey,
        {
          auth: {
            flowType: "pkce",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }
      );
    }
    return browserClientInstance;
  }

  // In SSR / static build worker prerendering, return a lightweight non-persistent client
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Alias for getSupabaseClient() matching common frontend naming conventions.
 */
export const getSupabaseBrowserClient = getSupabaseClient;

/**
 * Typed Supabase client descriptor for use across the application.
 */
export type TypedSupabaseClient = SupabaseClient<Database>;
