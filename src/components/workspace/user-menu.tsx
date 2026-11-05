"use client";

/**
 * user-menu.tsx - User Profile and Account Dropdown Menu.
 *
 * Provides responsive account information, quick navigation to settings,
 * theme selection, and sign-out functionality.
 */

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

export function UserMenu() {
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div
        className="w-8 h-8 rounded-xl animate-pulse"
        style={{ backgroundColor: "var(--bg-hover)" }}
      />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all active:scale-95"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
          }}
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95 shadow-xs"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          Join
        </Link>
      </div>
    );
  }

  const displayName =
    (user.user_metadata?.display_name as string) ||
    (user.user_metadata?.username as string) ||
    user.email?.split("@")[0] ||
    "User";

  const persona = (user.user_metadata?.persona as string) || "General";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="flex items-center gap-2 p-1 rounded-xl transition-all hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          {initial}
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl border p-2 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {/* User Details */}
          <div
            className="p-3 border-b mb-1"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <p
              className="text-xs font-bold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {displayName}
            </p>
            <p
              className="text-[11px] truncate opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              {user.email}
            </p>
            <div className="mt-1.5">
              <span
                className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--brand-accent-soft)",
                  color: "var(--brand-accent)",
                }}
              >
                {persona}
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-primary)" }}
            >
              <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>Workspace Settings</span>
            </Link>

            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium opacity-60 cursor-default"
              style={{ color: "var(--text-muted)" }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>RLS Tenant Secured</span>
            </div>
          </div>

          {/* Sign Out */}
          <div
            className="pt-1 mt-1 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              type="button"
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
