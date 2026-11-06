"use client";

/**
 * goals-metrics.tsx - Summary Figures for Goals Workspace.
 */

import React from "react";
import { FolderKanban, CheckCircle2, Flag, Calendar } from "lucide-react";
import type { GoalsSummaryMetrics } from "@/lib/dashboard-calculations";

interface GoalsMetricsProps {
  metrics: GoalsSummaryMetrics;
  isLoading?: boolean;
}

export function GoalsMetrics({ metrics, isLoading = false }: GoalsMetricsProps) {
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Projects */}
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
            {metrics.activeProjectsCount}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            In active execution
          </p>
        </div>
      </div>

      {/* 2. Completed Projects */}
      <div className="p-5 rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Completed Projects
          </span>
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            {metrics.completedProjectsCount}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Shipped &amp; delivered
          </p>
        </div>
      </div>

      {/* 3. Total Milestones */}
      <div className="p-5 rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Total Milestones
          </span>
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <Flag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            {metrics.totalMilestonesCount}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Across all workspaces
          </p>
        </div>
      </div>

      {/* 4. Upcoming Milestone Deadlines */}
      <div className="p-5 rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Upcoming Checkpoints
          </span>
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-amber-600 dark:text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            {metrics.upcomingMilestonesCount}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Due in next 14 days
          </p>
        </div>
      </div>
    </div>
  );
}

