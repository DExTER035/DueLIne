"use client";

/**
 * auth-status.tsx - Responsive Navigation Auth Status Component.
 *
 * Renders sign-in/register links when unauthenticated, and user info with
 * a sign-out button when authenticated.
 */

import React from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";

export function AuthNavStatus() {
  const { user, isAuthenticated, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="loading loading-spinner loading-xs text-[#1D5368]"></span>
        <span className="text-xs text-[#71817D]">Checking session...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const displayName =
      (user.user_metadata?.display_name as string) ||
      (user.user_metadata?.username as string) ||
      user.email?.split("@")[0] ||
      "User";

    const initial = displayName.charAt(0).toUpperCase();

    return (
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F4F0E5] border border-[#E6E2D8]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#1D5368] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#283D40] truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-[#71817D] truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="btn btn-ghost btn-xs text-[#71817D] hover:text-red-700 hover:bg-white rounded-lg px-2 shrink-0 font-medium"
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="btn btn-sm bg-[#F4F0E5] hover:bg-[#E8F0F1] text-[#1D5368] border border-[#E6E2D8] rounded-lg font-medium text-xs px-3 shadow-none"
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className="btn btn-sm bg-[#1D5368] hover:bg-[#154152] text-white border-none rounded-lg font-medium text-xs px-3 shadow-sm"
      >
        Get Started
      </Link>
    </div>
  );
}

export function AuthNavStatusMobile() {
  const { user, isAuthenticated, loading, signOut } = useAuth();

  if (loading) return null;

  if (isAuthenticated && user) {
    return (
      <button
        onClick={() => signOut()}
        className="btn btn-ghost btn-xs text-[#71817D] hover:text-red-700 font-medium text-xs"
      >
        Sign Out
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/login"
        className="text-xs font-semibold text-[#1D5368] hover:underline px-2 py-1"
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className="text-xs font-semibold bg-[#1D5368] text-white rounded-lg px-2.5 py-1 hover:bg-[#154152]"
      >
        Join
      </Link>
    </div>
  );
}
