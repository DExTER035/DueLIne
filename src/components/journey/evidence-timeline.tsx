"use client";

/**
 * evidence-timeline.tsx - Chronological Evidence & Milestone History Stream.
 *
 * Implements:
 * - Semantic distinction between Achievement (milestones), Evidence (completed tasks),
 *   and Activity (reopened/created tasks).
 * - Date grouping (Today, Yesterday, MMM D, YYYY).
 * - Chronological newest-first stream.
 * - Filter tabs and incremental pagination.
 */

import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  Flag,
  RotateCcw,
  PlusCircle,
  Clock,
  Layers,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import type { TimelineItem, TimelineEventType } from "@/lib/dashboard-calculations";
import type { TimelineFilter } from "@/hooks/use-journey-workspace";

interface EvidenceTimelineProps {
  groupedTimeline: Array<{ dateGroup: string; items: TimelineItem[] }>;
  totalCount: number;
  filter: TimelineFilter;
  onFilterChange: (filter: TimelineFilter) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function EvidenceTimeline({
  groupedTimeline,
  totalCount,
  filter,
  onFilterChange,
  hasMore,
  onLoadMore,
}: EvidenceTimelineProps) {
  const formatTimeOnly = (isoStr: string) => {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTierIcon = (type: TimelineEventType) => {
    switch (type) {
      case "milestone_achieved":
        return <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "task_completed":
        return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "task_uncompleted":
        return <RotateCcw className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      case "task_created":
      default:
        return <PlusCircle className="w-4 h-4 text-[var(--brand-primary)]" />;
    }
  };

  const getTierBadge = (item: TimelineItem) => {
    switch (item.tier) {
      case "achievement":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
            Achievement
          </span>
        );
      case "evidence":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
            Evidence
          </span>
        );
      case "activity":
      default:
        return (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            Activity
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white p-5 sm:p-7 shadow-xs space-y-6 transition-all">
      {/* Top Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Evidence Timeline
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Verified proof-of-work records and milestone delivery stream
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs overflow-x-auto">
          <button
            onClick={() => onFilterChange("all")}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filter === "all"
                ? "bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange("achievements")}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filter === "achievements"
                ? "bg-[var(--bg-surface)] text-amber-700 dark:text-amber-400 shadow-sm font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Achievements
          </button>
          <button
            onClick={() => onFilterChange("evidence")}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filter === "evidence"
                ? "bg-[var(--bg-surface)] text-emerald-700 dark:text-emerald-400 shadow-sm font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Completions
          </button>
          <button
            onClick={() => onFilterChange("activity")}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filter === "activity"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Activity
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {groupedTimeline.length > 0 ? (
        <div className="space-y-8">
          {groupedTimeline.map((group) => (
            <div key={group.dateGroup} className="space-y-4">
              {/* Date Group Heading */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] px-2.5 py-0.5 rounded-md bg-[var(--brand-accent-soft)]">
                  {group.dateGroup}
                </span>
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              </div>

              {/* Items in this date group */}
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[var(--border-subtle)]">
                {group.items.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-4 pl-0.5">
                    {/* Tier Icon Bubble */}
                    <div
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                        item.tier === "achievement"
                          ? "bg-[var(--bg-surface)] border-amber-500 shadow-xs"
                          : item.tier === "evidence"
                          ? "bg-[var(--bg-surface)] border-emerald-500 shadow-xs"
                          : "bg-[var(--bg-surface)] border-[var(--border-strong)]"
                      }`}
                    >
                      {getTierIcon(item.type)}
                    </div>

                    {/* Timeline Event Card */}
                    <div
                      className={`flex-1 p-4 rounded-xl border transition-all space-y-1.5 ${
                        item.tier === "achievement"
                          ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10"
                          : item.tier === "evidence"
                          ? "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--brand-mist)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] opacity-85"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {getTierBadge(item)}
                          {item.projectName && (
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              {item.projectName}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeOnly(item.timestamp)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {item.title}
                      </h3>

                      {item.note && (
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={onLoadMore}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition active:scale-95"
              >
                <span>Load More Evidence</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty Timeline State */
        <div className="py-12 sm:py-16 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E8EEE8] flex items-center justify-center text-[#193B35]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#16332C]">
              No evidence events recorded yet
            </p>
            <p className="text-xs text-[#5F756C] max-w-sm mx-auto mt-1 leading-relaxed">
              Complete tasks in Today or deliver milestones in Goals to begin compiling your personal proof-of-work archive.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/today"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#193B35] text-white hover:opacity-90 transition active:scale-95 shadow-xs"
            >
              <span>Go to Today&apos;s Priorities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

