"use client";

/**
 * chapters-widget.tsx - Chapters Home Widget matching DueLine Visual Reference Mockup.
 *
 * Implements:
 * - Header: BookOpen icon, serif title "Chapters", and link "Your future self is waiting. →"
 * - Crisp white card with light borders.
 * - Capsule 1: "A Letter to Future Me" (Sealed · Unlocks in 27 days, Lock icon, warm peach tint)
 * - Capsule 2: "One Year From Now" (Unlocked · Jan 15, 2025, Check icon, soft sage tint)
 * - Directly links to /chapters workspace.
 */

import React from "react";
import Link from "next/link";
import { BookOpen, Lock, Check, Calendar, ArrowRight } from "lucide-react";

export function ChaptersWidget() {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E8E1] p-4 sm:p-6 md:p-7 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-[#EEF2EC]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <BookOpen className="w-5 h-5 text-[#193B35]" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#16332C] font-serif">
            Chapters
          </h2>
        </div>

        <Link
          href="/chapters"
          className="text-xs text-[#6B857C] hover:text-[#193B35] flex items-center gap-1 transition-colors group cursor-pointer"
        >
          <span className="hidden sm:inline">Your future self is waiting.</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Chapters Time Capsules */}
      <div className="pt-4 space-y-3">
        {/* Capsule 1: Sealed / A Letter to Future Me */}
        <Link
          href="/chapters"
          className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FDF3EE] border border-[#F6E1D7] hover:scale-[1.01] transition-all group cursor-pointer"
        >
          {/* Lock Icon Box */}
          <div className="w-9 h-9 rounded-xl bg-[#F6E1D7] flex items-center justify-center text-[#B45309] shrink-0">
            <Lock className="w-4 h-4 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[#3E2723] truncate group-hover:text-amber-900 transition-colors">
              A Letter to Future Me
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-[#8D6E63] mt-0.5">
              <Calendar className="w-3 h-3 shrink-0 opacity-70" />
              <span>Sealed · Unlocks in 27 days</span>
            </div>
          </div>
        </Link>

        {/* Capsule 2: Unlocked / One Year From Now */}
        <Link
          href="/chapters"
          className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#EEF5EF] border border-[#E0ECE2] hover:scale-[1.01] transition-all group cursor-pointer"
        >
          {/* Check Icon Box */}
          <div className="w-9 h-9 rounded-xl bg-[#E0ECE2] flex items-center justify-center text-[#2E7D32] shrink-0">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[#193B35] truncate group-hover:text-emerald-800 transition-colors">
              One Year From Now
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-[#4F7363] mt-0.5">
              <Calendar className="w-3 h-3 shrink-0 opacity-70" />
              <span>Unlocked · Jan 15, 2025</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
