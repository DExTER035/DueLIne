"use client";

/**
 * top-navigation.tsx - Workspace Top Navigation Bar matching DueLine Visual Reference.
 *
 * Implements:
 * - Mobile Top Bar (360px & 390px): DueLine leaf brand logo on left, Notification Bell, Theme toggle, and Avatar on right.
 * - Desktop Top Bar: Clean breadcrumbs and command trigger on secondary pages (hidden on /today where header is embedded).
 * - Guaranteed zero horizontal overflow across mobile widths.
 */

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Command, Leaf, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NAV_MODULES } from "@/lib/navigation";
import { useAuth } from "@/components/auth/auth-provider";

interface TopNavigationProps {
  onOpenMobileMenu?: () => void;
}

export function TopNavigation({}: TopNavigationProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isTodayPage = pathname === "/today" || pathname === "/";

  // Find active module title
  const currentModule = NAV_MODULES.find(
    (m) => m.href === pathname || (m.href === "/today" && pathname === "/")
  );

  return (
    <header
      className={`w-full h-14 sm:h-16 border-b sticky top-0 z-20 px-3.5 sm:px-6 items-center justify-between gap-2 transition-colors ${
        isTodayPage ? "flex md:hidden" : "flex"
      }`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Left: Mobile Brand OR Desktop Breadcrumbs */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile Brand Link: Leaf + DueLine */}
        <Link
          href="/today"
          className="flex items-center gap-2 font-serif font-bold text-lg tracking-tight text-[#16332C]"
        >
          <Leaf className="w-5 h-5 text-emerald-600 fill-emerald-600 shrink-0" />
          <span>DueLine</span>
        </Link>

        {/* Desktop Breadcrumbs (>= md) on non-today pages */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium ml-2">
          <Link
            href="/today"
            className="hover:underline opacity-60 text-[var(--text-muted)]"
          >
            Workspace
          </Link>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="font-bold text-[var(--text-primary)]">
            {currentModule?.label || "Workspace"}
          </span>
        </div>
      </div>

      {/* Middle: Command / Search Trigger Indicator on Desktop */}
      {!isTodayPage && (
        <div className="hidden lg:flex items-center flex-1 max-w-sm mx-4">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border text-xs transition-all hover:border-[var(--brand-mist)] group bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer"
            aria-label="Search workspace (Ctrl K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              <span className="truncate">Search modules, tasks, goals...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded border shadow-2xs bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>
      )}

      {/* Right: Notification, Theme, and Avatar matching mockup */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification Bell */}
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-2xs cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle className="w-8 h-8 rounded-full border border-[var(--border-subtle)] shadow-2xs cursor-pointer" />

        {/* Circular Avatar */}
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-emerald-500/40 shrink-0 shadow-2xs">
          <Image
            src="/assets/avatar-forest.svg"
            alt={user?.email || "Alex"}
            fill
            className="object-cover"
          />
        </div>
      </div>
    </header>
  );
}
