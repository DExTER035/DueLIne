"use client";

/**
 * /journey/page.tsx - DueLine Stage 2C.4 Journey & Evidence System.
 *
 * Implements the Evidence layer of the product loop:
 * Ambition -> Action -> Evidence -> Memory
 *
 * Capabilities:
 * - High-level verified progress overview (completed tasks, milestones, active projects, execution days).
 * - Chronological Evidence Timeline derived from task_events and achieved milestones.
 * - Semantic distinction: Achievement (milestone), Evidence (completed task), Activity (uncompleted/created).
 * - Device-local private reflections journal (localStorage, strictly offline & private).
 * - Factual weekly & monthly period reviews calculated from verified timestamps.
 *
 * Strictly private by default. No social feeds or public broadcasts.
 */

import React from "react";
import { AlertCircle, Info, RefreshCw } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { JourneyHeader } from "@/components/journey/journey-header";
import { ProgressOverview } from "@/components/journey/progress-overview";
import { EvidenceTimeline } from "@/components/journey/evidence-timeline";
import { PeriodReviewCard } from "@/components/journey/period-review-card";
import { ReflectionArchive } from "@/components/journey/reflection-archive";
import { useJourneyWorkspace } from "@/hooks/use-journey-workspace";

export default function JourneyPage() {
  const {
    progressOverview,
    groupedTimeline,
    totalTimelineCount,
    hasMoreTimeline,
    loadMoreTimeline,
    timelineFilter,
    setTimelineFilter,
    reflections,
    saveDailyReflection,
    reviewPeriod,
    setReviewPeriod,
    activeReview,
    isLoading,
    error,
    isLocalPreview,
    refreshJourney,
  } = useJourneyWorkspace();

  return (
    <WorkspaceLayout>
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        {/* Global Error Notice */}
        {error && (
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50/80 text-xs text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button
              onClick={refreshJourney}
              className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Subtle Preview Mode Indicator */}
        {isLocalPreview && (
          <div className="flex items-center text-xs px-1 text-[var(--text-muted)] gap-1.5 -mt-2">
            <Info className="w-3.5 h-3.5 text-[var(--brand-accent)] shrink-0" />
            <span>Preview Mode: Interactive local evidence &amp; device-stored reflections.</span>
          </div>
        )}

        {/* Journey Header (Strictly Private Evidence Log — Private and personal by default) */}
        <JourneyHeader />

        {/* Progress Overview Metrics */}
        <ProgressOverview overview={progressOverview} isLoading={isLoading} />

        {/* 2-Column Responsive Journey Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Left: Chronological Evidence Stream (8 cols) */}
          <section className="lg:col-span-7 xl:col-span-8 space-y-4">
            <EvidenceTimeline
              groupedTimeline={groupedTimeline}
              totalCount={totalTimelineCount}
              filter={timelineFilter}
              onFilterChange={setTimelineFilter}
              hasMore={hasMoreTimeline}
              onLoadMore={loadMoreTimeline}
            />
          </section>

          {/* Sidebar Right: Period Review + Reflection Archive (4-5 cols) */}
          <aside className="lg:col-span-5 xl:col-span-4 space-y-6">
            <PeriodReviewCard
              activeReview={activeReview}
              reviewPeriod={reviewPeriod}
              onPeriodChange={setReviewPeriod}
              isLoading={isLoading}
            />

            <ReflectionArchive
              reflections={reflections}
              onSaveReflection={saveDailyReflection}
            />
          </aside>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
