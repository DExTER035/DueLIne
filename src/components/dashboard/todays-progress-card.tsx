"use client";

/**
 * todays-progress-card.tsx - Today's Progress Card matching DueLine Visual Reference Mockup.
 *
 * Implements:
 * - Header: BarChart2 icon, serif title "Today's Progress", and percentage "60%".
 * - Crisp white card with light borders.
 * - Full-width horizontal green progress bar filled to 60%.
 * - Metric pills row:
 *   1. "✓ 2/5 Tasks" (soft light green pill)
 *   2. "🎯 1 Goal" (soft light green pill)
 *   3. "🔥 3-day Streak" (soft warm peach pill)
 * - Dynamic integration with real tasks & goals if available.
 */

import React from "react";
import { BarChart2, Check, Target, Flame } from "lucide-react";
import type { SummaryMetricsResult } from "@/lib/dashboard-calculations";

interface TodaysProgressCardProps {
  metrics?: SummaryMetricsResult | null;
  tasksCompleted?: number;
  tasksTotal?: number;
}

export function TodaysProgressCard({ metrics, tasksCompleted, tasksTotal }: TodaysProgressCardProps) {
  const comp = tasksCompleted ?? (metrics ? metrics.completedTasksCount : 2);
  const total = tasksTotal ?? (metrics ? metrics.totalTasksCount : 5);
  const percentage = total > 0 ? Math.round((comp / total) * 100) : 60;
  const activeGoals = metrics ? metrics.activeProjectsCount : 1;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E8E1] p-4 sm:p-6 md:p-7 shadow-xs transition-all space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="w-5 h-5 text-[#2E7D32]" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#16332C] font-serif">
            Today&apos;s Progress
          </h2>
        </div>

        <span className="text-sm font-extrabold text-[#193B35]">
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E8ECE6] h-2 rounded-full overflow-hidden">
        <div
          className="bg-[#255848] h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Metric Pills Row */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Pill 1: Tasks */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EEF5EF] text-[#24523F] text-xs font-semibold">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>
            {comp}/{total} Tasks
          </span>
        </div>

        {/* Pill 2: Goals */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EEF5EF] text-[#24523F] text-xs font-semibold">
          <Target className="w-3.5 h-3.5" />
          <span>
            {activeGoals} Goal{activeGoals !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Pill 3: Streak */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF3EB] text-[#B45309] text-xs font-semibold">
          <Flame className="w-3.5 h-3.5 text-[#EA580C] fill-[#EA580C]" />
          <span>3-day Streak</span>
        </div>
      </div>
    </div>
  );
}
