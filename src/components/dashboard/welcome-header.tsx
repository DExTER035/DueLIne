"use client";

/**
 * welcome-header.tsx - Editorial Greeting & Action Cluster Header matching Visual Mockup.
 *
 * Implements:
 * - Editorial serif greeting: "Good morning, Alex 👋" in bold Deep Forest typography.
 * - Life ambition subtitle: "Another day to move closer to the person you're becoming."
 * - Desktop top action cluster: Search, Notification Bell, Theme toggle, and Forest Avatar.
 */

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface WelcomeHeaderProps {
  displayName?: string | null;
  onNewTaskClick?: () => void;
  onOpenSearch?: () => void;
}

export function WelcomeHeader({ displayName, onNewTaskClick, onOpenSearch }: WelcomeHeaderProps) {
  // Deterministic greeting matching mockup reference ("Good morning, Alex 👋")
  const [greeting, setGreeting] = useState<string>("Good morning");

  // Adjust contextual greeting safely after hydration to match user's local wall-clock
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
    else setGreeting("Good morning");
  }, []);

  const name = displayName?.trim() || "Alex";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1 sm:pt-2 pb-2">
      {/* Left: Editorial Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-[#16332C] font-serif">
          {greeting}, {name} 👋
        </h1>
        <p className="text-xs sm:text-sm text-[#5F756C] font-normal">
          Another day to move closer to the person you&apos;re becoming.
        </p>
      </div>

      {/* Right: Desktop Action Cluster matching reference mockup */}
      <div className="hidden md:flex items-center gap-2.5 shrink-0 pt-1">
        {/* Search button */}
        <button
          type="button"
          onClick={onOpenSearch || onNewTaskClick}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E6DF] flex items-center justify-center text-[#5F756C] hover:text-[#16332C] transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          title="Search or add task"
          aria-label="Search workspace"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-white border border-[#E2E6DF] flex items-center justify-center text-[#5F756C] hover:text-[#16332C] transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Theme Toggle Button */}
        <div className="w-9 h-9 rounded-full bg-white border border-[#E2E6DF] flex items-center justify-center shadow-2xs">
          <ThemeToggle />
        </div>

        {/* Circular Avatar */}
        <div
          className="relative w-9 h-9 rounded-full overflow-hidden border border-emerald-600/40 shadow-2xs shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
          title={`Signed in as ${name}`}
        >
          <Image
            src="/assets/avatar-forest.svg"
            alt={name}
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
