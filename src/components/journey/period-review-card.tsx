"use client";

/**
 * period-review-card.tsx - Factual Weekly and Monthly Periodic Reviews for Journey.
 *
 * Implements:
 * - Period selector: "This Week (Last 7 Days)" vs "This Month".
 * - Deterministic, honest narrative calculated strictly from database timestamps.
 * - Key period metrics: Tasks Done, Milestones Reached, Active Days, Projects Progressed.
 * - Accomplishment itemization.
 */

import React from "react";
import {
  CheckCircle2,
  Flag,
  Calendar,
  FolderKanban,
  Sparkles,
  BarChart3,
} from "lucide-react";
import type { PeriodReviewResult } from "@/lib/dashboard-calculations";

interface PeriodReviewCardProps {
  activeReview: PeriodReviewResult;
  reviewPeriod: "week" | "month";
  onPeriodChange: (period: "week" | "month") => void;
  isLoading?: boolean;
}

export function PeriodReviewCard({
  activeReview,
  reviewPeriod,
  onPeriodChange,
  isLoading = false,
}: PeriodReviewCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 animate-pulse">
        <div className="h-6 w-36 bg-[var(--border-subtle)] rounded" />
        <div className="h-16 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 bg-[var(--border-subtle)] rounded-xl" />
          <div className="h-14 bg-[var(--border-subtle)] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white p-5 sm:p-6 shadow-xs transition-all space-y-5">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Period Review
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              {activeReview.periodLabel}
            </p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onPeriodChange("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reviewPeriod === "week"
                ? "bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              reviewPeriod === "month"
                ? "bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Honest Factual Narrative */}
      <div className="rounded-xl p-4 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Factual Performance Narrative</span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
          {activeReview.factualSummary}
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">
          Calculated strictly from verified timestamps. No speculative AI generation.
        </p>
      </div>

      {/* Key Period Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Tasks Done
            </span>
            <span className="text-xl font-extrabold text-[var(--text-primary)]">
              {activeReview.tasksCompletedCount}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Milestones
            </span>
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {activeReview.milestonesAchievedCount}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Flag className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Active Days
            </span>
            <span className="text-xl font-extrabold text-[var(--text-primary)]">
              {activeReview.activeDaysCount}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Workspaces
            </span>
            <span className="text-xl font-extrabold text-[var(--text-primary)]">
              {activeReview.projectsProgressedCount}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <FolderKanban className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Itemized Accomplishments in Window */}
      {activeReview.accomplishments.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Completed in this Window ({activeReview.accomplishments.length})
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {activeReview.accomplishments.map((acc) => (
              <div
                key={`${acc.type}-${acc.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {acc.type === "milestone" ? (
                    <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {acc.title}
                  </span>
                </div>
                {acc.projectName && (
                  <span className="text-[10px] text-[var(--text-muted)] font-medium shrink-0 ml-2">
                    {acc.projectName}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
