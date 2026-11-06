"use client";

/**
 * chapter-card.tsx - Card Component for Sealed, Ready-to-Unlock, and Past Chapters.
 */

import React from "react";
import { Lock, Sparkles, CheckCircle2, Calendar, ChevronRight } from "lucide-react";
import { getChapterStatus, type Chapter } from "@/lib/dashboard-calculations";

interface ChapterCardProps {
  chapter: Chapter;
  onOpen: (chapter: Chapter) => void;
}

export function ChapterCard({ chapter, onOpen }: ChapterCardProps) {
  const status = getChapterStatus(chapter, new Date());

  const formattedUnlockDate = new Date(chapter.unlock_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedCreatedDate = new Date(chapter.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedUnlockedDate = chapter.unlocked_at
    ? new Date(chapter.unlocked_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      onClick={() => onOpen(chapter)}
      className={`rounded-2xl sm:rounded-3xl border p-5 sm:p-6 space-y-4 transition-all cursor-pointer hover:shadow-md hover:border-[#A4B99B] flex flex-col justify-between shadow-xs ${
        status === "ready_to_unlock"
          ? "border-amber-400 bg-amber-50/40"
          : "bg-white border-[#E4E8E1]"
      }`}
    >
      <div className="space-y-3">
        {/* Top Badges & Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {status === "sealed" && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: "var(--brand-accent-soft)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--brand-accent)",
                }}
              >
                <Lock className="w-3 h-3" />
                <span>Sealed</span>
              </span>
            )}

            {status === "ready_to_unlock" && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3 h-3" />
                <span>Ready to Reveal</span>
              </span>
            )}

            {status === "past" && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Unlocked</span>
              </span>
            )}

            <span className="text-[11px] font-medium capitalize text-[var(--text-muted)]">
              {chapter.category}
            </span>
          </div>

          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {status === "past" ? `Unlocked ${formattedUnlockedDate}` : `Unlocks ${formattedUnlockDate}`}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition">
            {chapter.title}
          </h3>
        </div>

        {/* Content Preview / Sealed Notice */}
        <div>
          {status === "sealed" && (
            <p className="text-xs text-[var(--text-muted)] italic font-serif leading-relaxed line-clamp-2">
              &ldquo;This message is confidential and locked in the time vault until {formattedUnlockDate}.&rdquo;
            </p>
          )}

          {status === "ready_to_unlock" && (
            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
              The unlock date has arrived. Open this chapter to break the seal and read what your past self wrote.
            </p>
          )}

          {status === "past" && (
            <div className="space-y-1">
              {chapter.reflection ? (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 italic leading-relaxed">
                  Reflection: &ldquo;{chapter.reflection}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">
                  Chapter opened. Awaiting your present-day revisit reflection.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div
        className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs"
      >
        <span className="text-[11px] text-[var(--text-muted)]">
          Drafted {formattedCreatedDate}
        </span>

        <div className="flex items-center gap-1 font-semibold text-xs text-[var(--brand-primary)]">
          {status === "ready_to_unlock" ? (
            <span className="text-amber-700 dark:text-amber-400 font-bold">Reveal Now</span>
          ) : status === "past" ? (
            <span>Read Memory</span>
          ) : (
            <span>Inspect Capsule</span>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
