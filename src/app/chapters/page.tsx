"use client";

/**
 * /chapters/page.tsx - DueLine Chapters (Memory System).
 *
 * Implements the Memory layer of DueLine's product loop:
 * Ambition -> Action -> Evidence -> Memory
 *
 * Philosophy:
 * "A message from another version of you."
 * "Your future self is waiting."
 * "Leave a message for the person you're becoming."
 *
 * Capabilities:
 * - Sealed chapters strictly hidden until target unlock timestamp.
 * - Ready to Unlock state with ceremonial reveal action.
 * - Past / Unlocked chapters permanently preserving original message.
 * - Separate present-day revisit reflection.
 * - Scheduled reflections, warnings, and commitments sealed across time.
 * - Timezone-aware date & time scheduling.
 * - Fully accessible modals, responsive layouts, and Growth & Clarity design tokens.
 */

import React, { useState } from "react";
import {
  Hourglass,
  RotateCcw,
  Info,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { ChaptersHeader } from "@/components/chapters/chapters-header";
import { NextUnlockSpotlight } from "@/components/chapters/next-unlock-spotlight";
import { ChapterCard } from "@/components/chapters/chapter-card";
import { CreateChapterModal } from "@/components/chapters/create-chapter-modal";
import { ChapterDetailModal } from "@/components/chapters/chapter-detail-modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useChaptersWorkspace,
  type ChaptersFilter,
} from "@/hooks/use-chapters-workspace";
import type { Chapter } from "@/lib/dashboard-calculations";

export default function ChaptersPage() {
  const {
    chapters,
    filteredChapters,
    sections,
    activeFilter,
    setActiveFilter,
    createChapter,
    revealChapter,
    recordReflection,
    getChapterMessage,
    resetPreviewData,
    refreshChapters,
    error,
    isLocalPreview,
  } = useChaptersWorkspace();

  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // Tab configurations
  const filterTabs: {
    id: ChaptersFilter;
    label: string;
    count: number;
    highlight?: boolean;
  }[] = [
    { id: "all", label: "All Chapters", count: chapters.length },
    {
      id: "ready_to_unlock",
      label: "Ready to Reveal",
      count: sections.readyToUnlock.length,
      highlight: sections.readyToUnlock.length > 0,
    },
    { id: "sealed", label: "Sealed Vault", count: sections.sealed.length },
    { id: "past", label: "Unlocked Archive", count: sections.past.length },
  ];

  return (
    <WorkspaceLayout>
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        {/* Global Error Banner if backend / RPC fails */}
        {error && (
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50/80 text-xs text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button
              onClick={refreshChapters}
              className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Module Header (A message from another version of you — Scheduled reflections sealed across time) */}
        <ChaptersHeader onDraftChapter={() => setIsDraftModalOpen(true)} />

        {/* Subtle Preview Adapter indicator with reset */}
        {isLocalPreview && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-1 text-[var(--text-muted)] gap-2 -mt-2">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Info className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
              <span>Preview Mode: Sealed capsules &amp; time locks active.</span>
            </span>
            <button
              onClick={resetPreviewData}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-primary)] hover:underline self-start sm:self-auto cursor-pointer"
              title="Reset showcase sample chapters to default state"
            >
              <RotateCcw className="w-3 h-3 text-[var(--brand-accent)]" />
              <span>Reset Sample Chapters</span>
            </button>
          </div>
        )}

        {/* Upcoming Unlock Spotlight */}
        <NextUnlockSpotlight
          sections={sections}
          onOpenChapter={(ch) => setSelectedChapter(ch)}
          onDraftChapter={() => setIsDraftModalOpen(true)}
        />

        {/* Workspace Filter Navigation Tabs */}
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border-subtle)] pb-3 min-w-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filterTabs.map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      isActive
                        ? "bg-[var(--brand-primary)] text-white shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : tab.highlight
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                          : "bg-[var(--border-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              {filteredChapters.length} {filteredChapters.length === 1 ? "Chapter" : "Chapters"}
            </span>
          </div>

          {/* Chapters Grid / Empty State */}
          {filteredChapters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredChapters.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  onOpen={(ch) => setSelectedChapter(ch)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Hourglass className="w-6 h-6" />}
              title={
                activeFilter === "ready_to_unlock"
                  ? "No Chapters Ready to Reveal"
                  : activeFilter === "sealed"
                  ? "No Sealed Chapters in Vault"
                  : activeFilter === "past"
                  ? "No Unlocked Chapters Yet"
                  : "No Chapters Drafted Yet"
              }
              description={
                activeFilter === "ready_to_unlock"
                  ? "Chapters become ready to reveal when their scheduled unlock date arrives."
                  : activeFilter === "sealed"
                  ? "Draft a chapter and set an unlock date in the future to seal it in your vault."
                  : activeFilter === "past"
                  ? "Once a chapter reaches its unlock date and is revealed, it will be preserved here."
                  : "Draft your first chapter and leave a message for the person you are becoming."
              }
              action={
                <button
                  onClick={() => setIsDraftModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-primary)] text-[var(--bg-surface)] hover:opacity-90 transition shadow-sm"
                >
                  Draft a Chapter
                </button>
              }
            />
          )}
        </div>

        {/* Create Chapter Modal */}
        <CreateChapterModal
          isOpen={isDraftModalOpen}
          onClose={() => setIsDraftModalOpen(false)}
          onSubmit={createChapter}
        />

        {/* Chapter Detail & Reveal Modal */}
        <ChapterDetailModal
          isOpen={Boolean(selectedChapter)}
          chapter={selectedChapter}
          onClose={() => setSelectedChapter(null)}
          onReveal={revealChapter}
          onRecordReflection={recordReflection}
          getChapterMessage={getChapterMessage}
        />
      </div>
    </WorkspaceLayout>
  );
}
