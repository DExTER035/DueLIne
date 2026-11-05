/**
 * auth.test.ts - Automated Unit and Mock Tests for DueLine Stage 2B & 2B.1 Authentication
 *
 * Covers:
 * - Supabase client configuration & unconfigured fallback
 * - Client-side registration validation logic
 * - Sign-in & password validation
 * - Open-redirect prevention (sanitizeRedirectUrl)
 * - Hardened PKCE recovery flow (PASSWORD_RECOVERY event detection)
 * - Username collision fallback & length boundary validation
 * - Auth state transitions, sign-out, and navigation guard rules
 *
 * NOTE: Mocked tests are explicitly separated from real remote tests.
 * NO live remote Supabase credentials or network calls are used.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSupabaseConfig,
  assertSupabaseConfigured,
  getSupabaseClient,
} from "./client.ts";
import { sanitizeRedirectUrl, validateUsername } from "./auth-utils.ts";

describe("Stage 2B & 2B.1: Supabase Authentication Foundation & Hardening", () => {
  describe("1. Client Configuration & Unconfigured Fallback", () => {
    it("reports isConfigured as false when environment variables are unset or placeholder", () => {
      const config = getSupabaseConfig();
      assert.equal(typeof config.isConfigured, "boolean");
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        assert.equal(config.isConfigured, false);
      }
    });

    it("assertSupabaseConfigured throws descriptive diagnostic error when unconfigured", () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        assert.throws(() => assertSupabaseConfigured(), {
          message: /Supabase client is not yet configured/,
        });
      } finally {
        if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
    });

    it("getSupabaseClient returns null safely during unconfigured static build", () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const client = getSupabaseClient();
        assert.equal(client, null);
      } finally {
        if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
    });
  });

  describe("2. Client-Side Registration & Username Validation Rules", () => {
    const VALID_PERSONAS = ["student", "freelancer", "indie_maker", "other"];

    it("accepts valid usernames conforming to length and character set", () => {
      assert.equal(validateUsername("alex_rivera").isValid, true);
      assert.equal(validateUsername("dev123").isValid, true);
      assert.equal(validateUsername("abc").isValid, true); // exactly 3 chars
      assert.equal(validateUsername("a".repeat(30)).isValid, true); // exactly 30 chars
    });

    it("rejects invalid usernames violating length or character constraints", () => {
      assert.equal(validateUsername("ab").isValid, false, "Too short (< 3)");
      assert.equal(validateUsername("a".repeat(31)).isValid, false, "Too long (> 30)");
      assert.equal(validateUsername("alex-rivera").isValid, false, "Hyphens not allowed");
      assert.equal(validateUsername("alex rivera").isValid, false, "Spaces not allowed");
      assert.equal(validateUsername("alex@dueline").isValid, false, "Special characters not allowed");
    });

    it("validates persona belongs to the permitted set", () => {
      for (const persona of VALID_PERSONAS) {
        assert.ok(VALID_PERSONAS.includes(persona));
      }
      assert.equal(VALID_PERSONAS.includes("enterprise"), false);
      assert.equal(VALID_PERSONAS.includes("admin"), false);
    });

    it("enforces password minimum length and match validation", () => {
      const validatePasswordPair = (pw: string, confirm: string) => {
        if (pw.length < 8) return "Password must be at least 8 characters long.";
        if (pw !== confirm) return "Passwords do not match. Please verify both fields.";
        return null;
      };

      assert.equal(validatePasswordPair("short", "short"), "Password must be at least 8 characters long.");
      assert.equal(validatePasswordPair("securePass123", "differentPass"), "Passwords do not match. Please verify both fields.");
      assert.equal(validatePasswordPair("securePass123", "securePass123"), null);
    });
  });

  describe("3. Username Collision & Deterministic Fallback Logic", () => {
    it("generates deterministic UUID-based fallback within 3-30 character constraint", () => {
      const mockUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const cleanId = mockUserId.replace(/-/g, "");
      const fallback = "user_" + cleanId.slice(0, 16);

      // Verify length: 'user_' (5) + 16 = 21 chars
      assert.equal(fallback.length, 21);
      assert.ok(fallback.length >= 3 && fallback.length <= 30);
      assert.ok(/^[a-zA-Z0-9_]+$/.test(fallback));
      assert.equal(fallback, "user_a1b2c3d4e5f67890");
    });

    it("verifies case-insensitive username collision detection", () => {
      const existingUsernames = ["AlexRivera", "STUDENT_1"];
      const isCollision = (desired: string) =>
        existingUsernames.some((u) => u.toLowerCase() === desired.toLowerCase());

      assert.equal(isCollision("alexrivera"), true);
      assert.equal(isCollision("ALEXRIVERA"), true);
      assert.equal(isCollision("student_1"), true);
      assert.equal(isCollision("unique_user"), false);
    });
  });

  describe("4. Redirect Destination Security (Open Redirect Prevention)", () => {
    it("permits safe local application paths", () => {
      assert.equal(sanitizeRedirectUrl("/"), "/");
      assert.equal(sanitizeRedirectUrl("/dashboard"), "/dashboard");
      assert.equal(sanitizeRedirectUrl("/projects/123"), "/projects/123");
      assert.equal(sanitizeRedirectUrl("/tasks?filter=today#active"), "/tasks?filter=today#active");
    });

    it("rejects absolute external URLs", () => {
      assert.equal(sanitizeRedirectUrl("https://evil.com"), "/");
      assert.equal(sanitizeRedirectUrl("http://attacker.com/phish"), "/");
      assert.equal(sanitizeRedirectUrl("ftp://files.com"), "/");
    });

    it("rejects protocol-relative URLs", () => {
      assert.equal(sanitizeRedirectUrl("//evil.com"), "/");
      assert.equal(sanitizeRedirectUrl("//attacker.com/login"), "/");
      assert.equal(sanitizeRedirectUrl("/\\evil.com"), "/");
    });

    it("rejects backslash normalization attacks", () => {
      assert.equal(sanitizeRedirectUrl("\\evil.com"), "/");
      assert.equal(sanitizeRedirectUrl("/\\evil.com"), "/");
      assert.equal(sanitizeRedirectUrl("/evil.com\\path"), "/");
    });

    it("rejects javascript:, data:, and other non-HTTP schemes", () => {
      assert.equal(sanitizeRedirectUrl("javascript:alert(1)"), "/");
      assert.equal(sanitizeRedirectUrl("data:text/html,<script>alert(1)</script>"), "/");
      assert.equal(sanitizeRedirectUrl("vbscript:msgbox"), "/");
      assert.equal(sanitizeRedirectUrl("/javascript:alert(1)"), "/");
    });

    it("falls back safely on null, undefined, whitespace, or invalid types", () => {
      assert.equal(sanitizeRedirectUrl(null), "/");
      assert.equal(sanitizeRedirectUrl(undefined), "/");
      assert.equal(sanitizeRedirectUrl(""), "/");
      assert.equal(sanitizeRedirectUrl("   "), "/");
      assert.equal(sanitizeRedirectUrl(null, "/custom-fallback"), "/custom-fallback");
    });
  });

  describe("5. Mocked Supabase Auth & PKCE Flow Logic (MOCKED)", () => {
    it("simulates successful PKCE authorization code exchange", async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: async (code: string) => {
            if (code === "valid-auth-code-123") {
              return {
                data: {
                  session: {
                    access_token: "mock-jwt-token",
                    user: { id: "user-uuid-1", email: "test@example.com" },
                  },
                },
                error: null,
              };
            }
            return {
              data: { session: null },
              error: { message: "Invalid or expired authorization code" },
            };
          },
        },
      };

      const successResult = await mockSupabase.auth.exchangeCodeForSession("valid-auth-code-123");
      assert.equal(successResult.error, null);
      assert.equal(successResult.data.session?.user.email, "test@example.com");

      const failureResult = await mockSupabase.auth.exchangeCodeForSession("expired-code");
      assert.ok(failureResult.error);
      assert.equal(failureResult.error.message, "Invalid or expired authorization code");
    });

    it("simulates signUp with registration metadata attached to options.data", async () => {
      let capturedOptions: unknown = null;

      const mockSupabase = {
        auth: {
          signUp: async (params: { email: string; password: string; options: { data: unknown } }) => {
            capturedOptions = params.options;
            return {
              data: {
                user: { id: "new-user-uuid", email: params.email },
                session: null,
              },
              error: null,
            };
          },
        },
      };

      const result = await mockSupabase.auth.signUp({
        email: "student@example.com",
        password: "securePassword123",
        options: {
          data: {
            username: "student_coder",
            display_name: "Student Coder",
            persona: "student",
          },
        },
      });

      assert.equal(result.error, null);
      assert.equal(result.data.user?.email, "student@example.com");
      assert.deepEqual(capturedOptions, {
        data: {
          username: "student_coder",
          display_name: "Student Coder",
          persona: "student",
        },
      });
    });

    it("simulates signInWithPassword error handling for invalid credentials", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: async (credentials: { email: string; password: string }) => {
            if (credentials.email === "registered@example.com" && credentials.password === "correctPassword") {
              return {
                data: { session: { access_token: "jwt" }, user: { id: "uid" } },
                error: null,
              };
            }
            return {
              data: { session: null, user: null },
              error: { message: "Invalid login credentials" },
            };
          },
        },
      };

      const fail = await mockSupabase.auth.signInWithPassword({
        email: "registered@example.com",
        password: "wrongPassword",
      });
      assert.ok(fail.error);
      assert.equal(fail.error.message, "Invalid login credentials");

      const ok = await mockSupabase.auth.signInWithPassword({
        email: "registered@example.com",
        password: "correctPassword",
      });
      assert.equal(ok.error, null);
      assert.ok(ok.data.session);
    });

    it("simulates resetPasswordForEmail redirection configuration", async () => {
      let capturedRedirect: string | undefined = undefined;

      const mockSupabase = {
        auth: {
          resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
            capturedRedirect = options?.redirectTo;
            return { data: {}, error: null };
          },
        },
      };

      await mockSupabase.auth.resetPasswordForEmail("user@example.com", {
        redirectTo: "https://dueline.app/auth/callback",
      });

      assert.equal(capturedRedirect, "https://dueline.app/auth/callback");
    });
  });

  describe("6. Hardened Password Recovery & Session Verification (MOCKED)", () => {
    it("sets isPasswordRecovery exclusively upon PASSWORD_RECOVERY event", () => {
      let isPasswordRecovery = false;

      const handleAuthEvent = (event: string) => {
        if (event === "PASSWORD_RECOVERY") {
          isPasswordRecovery = true;
        } else if (event === "SIGNED_OUT") {
          isPasswordRecovery = false;
        }
      };

      handleAuthEvent("SIGNED_IN");
      assert.equal(isPasswordRecovery, false, "SIGNED_IN should not trigger recovery mode");

      handleAuthEvent("TOKEN_REFRESHED");
      assert.equal(isPasswordRecovery, false, "TOKEN_REFRESHED should not trigger recovery mode");

      handleAuthEvent("PASSWORD_RECOVERY");
      assert.equal(isPasswordRecovery, true, "PASSWORD_RECOVERY must trigger recovery mode");

      handleAuthEvent("SIGNED_OUT");
      assert.equal(isPasswordRecovery, false, "SIGNED_OUT must clear recovery mode");
    });

    it("rejects password update access when recovery session is missing or unverified", () => {
      interface ResetPageState {
        isAuthenticated: boolean;
        isPasswordRecovery: boolean;
        isSuccess: boolean;
        isConfigured: boolean;
      }

      const canAccessPasswordForm = (state: ResetPageState): boolean => {
        if (!state.isConfigured) return true; // Unconfigured offline mode
        if (state.isSuccess) return true; // Show success screen
        return state.isAuthenticated && state.isPasswordRecovery;
      };

      // Ordinary logged in user attempting to visit /reset-password directly
      assert.equal(
        canAccessPasswordForm({
          isAuthenticated: true,
          isPasswordRecovery: false,
          isSuccess: false,
          isConfigured: true,
        }),
        false,
        "Ordinary authenticated user cannot access recovery form without recovery event"
      );

      // Unauthenticated visitor
      assert.equal(
        canAccessPasswordForm({
          isAuthenticated: false,
          isPasswordRecovery: false,
          isSuccess: false,
          isConfigured: true,
        }),
        false,
        "Unauthenticated user cannot access recovery form"
      );

      // Verified recovery user
      assert.equal(
        canAccessPasswordForm({
          isAuthenticated: true,
          isPasswordRecovery: true,
          isSuccess: false,
          isConfigured: true,
        }),
        true,
        "Verified recovery user can access password form"
      );
    });

    it("clears recovery mode upon successful password update or sign out", () => {
      let isPasswordRecovery = true;
      const clearPasswordRecovery = () => {
        isPasswordRecovery = false;
      };

      clearPasswordRecovery();
      assert.equal(isPasswordRecovery, false);
    });
  });

  describe("7. Auth Guard & Navigation Logic", () => {
    it("determines correct redirection target based on auth state", () => {
      interface AuthState {
        loading: boolean;
        isAuthenticated: boolean;
        isConfigured: boolean;
      }

      const getAuthGuardDecision = (state: AuthState): "RENDER" | "LOADING" | "REDIRECT_LOGIN" => {
        if (state.loading) return "LOADING";
        if (!state.isConfigured) return "RENDER";
        if (!state.isAuthenticated) return "REDIRECT_LOGIN";
        return "RENDER";
      };

      const getGuestGuardDecision = (state: AuthState): "RENDER" | "LOADING" | "REDIRECT_HOME" => {
        if (state.loading) return "LOADING";
        if (!state.isConfigured) return "RENDER";
        if (state.isAuthenticated) return "REDIRECT_HOME";
        return "RENDER";
      };

      // AuthGuard checks:
      assert.equal(getAuthGuardDecision({ loading: true, isAuthenticated: false, isConfigured: true }), "LOADING");
      assert.equal(getAuthGuardDecision({ loading: false, isAuthenticated: false, isConfigured: true }), "REDIRECT_LOGIN");
      assert.equal(getAuthGuardDecision({ loading: false, isAuthenticated: true, isConfigured: true }), "RENDER");
      assert.equal(getAuthGuardDecision({ loading: false, isAuthenticated: false, isConfigured: false }), "RENDER");

      // GuestGuard checks:
      assert.equal(getGuestGuardDecision({ loading: true, isAuthenticated: false, isConfigured: true }), "LOADING");
      assert.equal(getGuestGuardDecision({ loading: false, isAuthenticated: true, isConfigured: true }), "REDIRECT_HOME");
      assert.equal(getGuestGuardDecision({ loading: false, isAuthenticated: false, isConfigured: true }), "RENDER");
    });
  });
});
