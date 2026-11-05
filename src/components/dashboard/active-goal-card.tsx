"use client";

/**
 * active-goal-card.tsx - Your Goals Card matching DueLine Visual Reference Mockup.
 *
 * Implements:
 * - Header: Target icon, serif title "Your Goals", and "2 active" counter.
 * - Crisp white card with light borders.
 * - Project items:
 *   1. "Build a consistent writing habit" (Check icon in soft green box, 70% progress bar, Chevron)
 *   2. "Launch my personal project" (TrendingUp icon in soft green box, 40% progress bar, Chevron)
 * - Seamless integration with Supabase real projects and fallback to visual mockup.
 */

import React from "react";
import Link from "next/link";
import { Target, Check, TrendingUp, ChevronRight } from "lucide-react";
import type { Project, ProjectProgressResult } from "@/lib/dashboard-calculations";

interface ActiveGoalCardProps {
  activeGoal?: {
    project: Project;
    progress: ProjectProgressResult;
  } | null;
  projects?: Project[];
  onNewProjectClick?: () => void;
  isLocalPreview?: boolean;
}

interface DefaultGoalItem {
  id: string;
  title: string;
  percentage: number;
  icon: "check" | "trend";
}

const DEFAULT_GOALS: DefaultGoalItem[] = [
  {
    id: "goal-1",
    title: "Build a consistent writing habit",
    percentage: 70,
    icon: "check",
  },
  {
    id: "goal-2",
    title: "Launch my personal project",
    percentage: 40,
    icon: "trend",
  },
];

export function ActiveGoalCard({
  activeGoal,
  projects,
  onNewProjectClick,
  isLocalPreview = true,
}: ActiveGoalCardProps) {
  const activeCount = isLocalPreview
    ? 2
    : projects && projects.length > 0
    ? projects.length
    : 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E8E1] p-4 sm:p-6 md:p-7 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-[#EEF2EC]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF2EB] flex items-center justify-center text-[#255243] shrink-0">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#16332C] font-serif">
            Your Goals
          </h2>
        </div>

        <span className="text-xs text-[#6B857C] font-medium shrink-0">
          {activeCount} active
        </span>
      </div>

      {/* Goals List */}
      <div className="pt-4 space-y-4">
        {!isLocalPreview ? (
          projects && projects.length > 0 ? (
            // Authenticated projects if present
            projects.slice(0, 2).map((proj, idx) => {
              const pct = idx === 0 ? (activeGoal?.progress.percentage || 0) : 0;
              return (
                <Link
                  key={proj.id}
                  href="/goals"
                  className="flex items-center justify-between gap-4 p-2 rounded-2xl hover:bg-[#F7F9F6] transition-all group"
                >
                  {/* Left: Icon Badge */}
                  <div className="w-9 h-9 rounded-xl bg-[#E8F3EB] flex items-center justify-center text-[#2E7D32] shrink-0">
                    {idx === 0 ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>

                  {/* Center: Title + Progress Bar */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold text-[#193B35] truncate group-hover:text-emerald-700 transition-colors">
                      {proj.name}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#E8ECE5] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2E7D32] h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#6B857C] shrink-0">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Right: Chevron */}
                  <ChevronRight className="w-4 h-4 text-[#A4B99B] group-hover:text-[#193B35] group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              );
            })
          ) : (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm text-[#6B857C]">No active goals defined yet.</p>
              {onNewProjectClick && (
                <button
                  type="button"
                  onClick={onNewProjectClick}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#193B35] hover:underline cursor-pointer"
                >
                  <span>Set your first goal</span>
                </button>
              )}
            </div>
          )
        ) : (
          // Default mockup items (100% visual parity)
          DEFAULT_GOALS.map((goal) => (
            <Link
              key={goal.id}
              href="/goals"
              className="flex items-center justify-between gap-4 p-2 rounded-2xl hover:bg-[#F7F9F6] transition-all group"
            >
              {/* Left: Icon Badge */}
              <div className="w-9 h-9 rounded-xl bg-[#E8F3EB] flex items-center justify-center text-[#2E7D32] shrink-0">
                {goal.icon === "check" ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                )}
              </div>

              {/* Center: Title + Progress Bar */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-sm font-semibold text-[#193B35] truncate group-hover:text-emerald-700 transition-colors">
                  {goal.title}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#E8ECE5] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2E7D32] h-full rounded-full transition-all duration-500"
                      style={{ width: `${goal.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#6B857C] shrink-0">
                    {goal.percentage}%
                  </span>
                </div>
              </div>

              {/* Right: Chevron */}
              <ChevronRight className="w-4 h-4 text-[#A4B99B] group-hover:text-[#193B35] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
