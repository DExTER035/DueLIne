/**
 * auth-utils.ts - Authentication Security Utilities for DueLine.
 *
 * Implements security-critical functions:
 * - sanitizeRedirectUrl: Open-redirect prevention validating relative application paths.
 * - validateUsername: Client-side validation matching database constraints.
 */

/**
 * Sanitizes redirect destination URLs to prevent open-redirect vulnerabilities.
 *
 * Requirements:
 * - Allow only safe local application paths (e.g., '/dashboard', '/workspaces').
 * - Reject external URLs (e.g., 'https://evil.com').
 * - Reject protocol-relative URLs (e.g., '//evil.com', '/\\evil.com').
 * - Reject javascript:, data:, and other non-HTTP schemes.
 * - Return the safe fallback destination on any violation.
 */
export function sanitizeRedirectUrl(
  url: string | null | undefined,
  fallback = "/"
): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  // Must begin with a single forward slash
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Reject protocol-relative URLs (//) and backslash confusion (/\ or /\\)
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject backslashes anywhere in the path (browsers may normalize \ to /)
  if (trimmed.includes("\\")) {
    return fallback;
  }

  // Reject control characters or whitespace
  if (/[\x00-\x1F\x7F\s]/.test(trimmed)) {
    return fallback;
  }

  // Reject URLs containing a colon before any path query delimiter (e.g. /http:/ or /javascript:)
  const colonIndex = trimmed.indexOf(":");
  const queryIndex = trimmed.indexOf("?");
  const hashIndex = trimmed.indexOf("#");
  const firstDelimiter = Math.min(
    queryIndex === -1 ? Infinity : queryIndex,
    hashIndex === -1 ? Infinity : hashIndex
  );

  if (colonIndex !== -1 && colonIndex < firstDelimiter) {
    return fallback;
  }

  // Validate path via URL constructor with a known trusted base
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }
    // Return path + query + hash
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Validates a username against DueLine format constraints (3-30 chars, [a-zA-Z0-9_]).
 */
export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: "Username must be at least 3 characters long.",
    };
  }
  if (trimmed.length > 30) {
    return {
      isValid: false,
      error: "Username cannot exceed 30 characters.",
    };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: "Username can only contain letters, numbers, and underscores.",
    };
  }
  return { isValid: true };
}

