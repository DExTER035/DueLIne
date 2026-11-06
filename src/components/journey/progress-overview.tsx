"use client";

/**
 * progress-overview.tsx - High-Level Progress Overview Cards for Journey.
 */

import React from "react";
import { CheckCircle2, Flag, FolderKanban, Calendar, Sparkles } from "lucide-react";
import type { ProgressOverviewResult } from "@/lib/dashboard-calculations";

interface ProgressOverviewProps {
  overview: ProgressOverviewResult;
  isLoading?: boolean;
}

export function ProgressOverview({ overview, isLoading = false }: ProgressOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-pulse space-y-3"
          >
            <div className="h-4 w-24 bg-[var(--border-subtle)] rounded" />
            <div className="h-8 w-16 bg-[var(--border-subtle)] rounded" />
            <div className="h-3 w-28 bg-[var(--border-subtle)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Tasks Completed */}
        <div className="p-5 rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Tasks Completed
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {overview.totalCompletedTasks}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
              Verified action items
            </p>
          </div>
        </div>

        {/* 2. Milestones Achieved */}
        <div className="p-5 rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Milestones Reached
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-amber-600 dark:text-amber-400">
              <Flag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {overview.completedMilestones}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
              Key delivery checkpoints
            </p>
          </div>
        </div>

        {/* 3. Active Workspaces */}
        <div className="p-5 rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Active Projects
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {overview.activeProjects}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
              Structured ambition domains
            </p>
          </div>
        </div>

        {/* 4. Active Execution Days */}
        <div className="p-5 rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Execution Days
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {overview.totalActiveDays}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
              Distinct days with activity
            </p>
          </div>
        </div>
      </div>

      {/* Recent Accomplishment Banner */}
      {overview.recentAccomplishment && (
        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[var(--text-muted)] font-medium">Latest Accomplishment:</span>
            <span className="font-bold text-[var(--text-primary)] truncate">
              {overview.recentAccomplishment}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-primary)] shrink-0">
            Evidence Verified
          </span>
        </div>
      )}
    </div>
  );
}

