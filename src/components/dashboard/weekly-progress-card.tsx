"use client";

/**
 * weekly-progress-card.tsx - Weekly Life Progress & Consistency Tracker.
 *
 * Implements real activity tracking based on database task events and completion timestamps:
 * - Completed tasks within the last 7 calendar days
 * - Distinct active days
 * - Consistency rate visualization
 */

import React from "react";
import { TrendingUp, CheckCircle, CalendarDays } from "lucide-react";
import type { WeeklyProgressResult } from "@/lib/dashboard-calculations";

interface WeeklyProgressCardProps {
  progress: WeeklyProgressResult;
}

export function WeeklyProgressCard({ progress }: WeeklyProgressCardProps) {
  const { completedThisWeek, activeDaysCount, periodLabel } = progress;

  // Consistency score out of 7 days
  const consistencyPercent = Math.min(100, Math.round((activeDaysCount / 7) * 100));

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 transition-all space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Weekly Progress
            </h2>
            <p className="text-xs text-[var(--text-muted)]">{periodLabel}</p>
          </div>
        </div>

        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
          {consistencyPercent}% Consistent
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Tasks Done</span>
          </div>
          <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
            {completedThisWeek}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Verified completions
          </p>
        </div>

        <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <CalendarDays className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Active Days</span>
          </div>
          <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
            {activeDaysCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ 7</span>
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Execution rhythm
          </p>
        </div>
      </div>

      <div className="pt-1">
        <div className="w-full bg-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-500"
            style={{ width: `${consistencyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

