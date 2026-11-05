"use client";

/**
 * summary-metrics.tsx - Four Core Summary Metrics for Today Dashboard.
 *
 * Implements real authenticated data metrics:
 * 1. Active Projects
 * 2. Total Tasks (with completed count)
 * 3. Upcoming Deadlines (next 7 days)
 * 4. High-Risk Tasks (deterministic risk engine)
 */

import React from "react";
import { FolderKanban, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { SummaryMetricsResult } from "@/lib/dashboard-calculations";

interface SummaryMetricsProps {
  metrics: SummaryMetricsResult;
  isLoading?: boolean;
}

export function SummaryMetrics({ metrics, isLoading = false }: SummaryMetricsProps) {
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
      <div
        className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all hover:border-[var(--brand-mist)] flex flex-col justify-between"
      >
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
            {metrics.activeProjectsCount === 1 ? "1 in progress" : `${metrics.activeProjectsCount} in progress`}
          </p>
        </div>
      </div>

      {/* 2. Total Tasks */}
      <div
        className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all hover:border-[var(--brand-mist)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Total Tasks
          </span>
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            {metrics.totalTasksCount}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {metrics.completedTasksCount} completed
            </span>
          </p>
        </div>
      </div>

      {/* 3. Upcoming Deadlines */}
      <div
        className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all hover:border-[var(--brand-mist)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Upcoming Deadlines
          </span>
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            {metrics.upcomingDeadlinesCount}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Next 7 days
          </p>
        </div>
      </div>

      {/* 4. High-Risk Tasks */}
      <div
        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
          metrics.highRiskTasksCount > 0
            ? "border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20"
            : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              metrics.highRiskTasksCount > 0
                ? "text-red-700 dark:text-red-400 font-bold"
                : "text-[var(--text-muted)]"
            }`}
          >
            High-Risk Tasks
          </span>
          <div
            className={`p-1.5 rounded-lg ${
              metrics.highRiskTasksCount > 0
                ? "bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300"
                : "bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p
            className={`text-2xl sm:text-3xl font-extrabold ${
              metrics.highRiskTasksCount > 0
                ? "text-red-700 dark:text-red-400"
                : "text-[var(--text-primary)]"
            }`}
          >
            {metrics.highRiskTasksCount}
          </p>
          <p
            className={`text-xs mt-1 font-medium ${
              metrics.highRiskTasksCount > 0
                ? "text-red-600 dark:text-red-300"
                : "text-[var(--text-muted)]"
            }`}
          >
            {metrics.highRiskTasksCount > 0
              ? "Need urgent attention"
              : metrics.overdueTasksCount > 0
              ? `${metrics.overdueTasksCount} overdue`
              : "All workloads on track"}
          </p>
        </div>
      </div>
    </div>
  );
}

