"use client";

/**
 * next-unlock-spotlight.tsx - Spotlight Banner for Upcoming and Matured Chapters.
 */

import React from "react";
import { Clock, Lock, Sparkles, KeyRound, Calendar } from "lucide-react";
import type { Chapter, ChapterSectionsResult } from "@/lib/dashboard-calculations";

interface NextUnlockSpotlightProps {
  sections: ChapterSectionsResult;
  onOpenChapter: (chapter: Chapter) => void;
  onDraftChapter: () => void;
}

export function NextUnlockSpotlight({
  sections,
  onOpenChapter,
  onDraftChapter,
}: NextUnlockSpotlightProps) {
  const readyChapter = sections.readyToUnlock[0] || null;
  const nextSealed = sections.nextScheduledUnlock.chapter;
  const remainingText = sections.nextScheduledUnlock.formattedTimeRemaining;

  // 1. Ready to Unlock State takes priority: Time has arrived!
  if (readyChapter) {
    const unlockDateFormatted = new Date(readyChapter.unlock_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div
        className="rounded-2xl sm:rounded-3xl border p-6 sm:p-7 space-y-4 relative overflow-hidden transition-all shadow-xs"
        style={{
          backgroundColor: "var(--status-med-bg)",
          borderColor: "var(--status-med-border)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--status-med-text)]">
            <KeyRound className="w-4 h-4 animate-bounce" />
            <span>Time Capsule Ready to Open</span>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-[var(--status-med-text)] border border-amber-500/20">
            Matured on {unlockDateFormatted}
          </span>
        </div>

        <div className="max-w-2xl space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
            &ldquo;{readyChapter.title}&rdquo;
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            The target unlock timestamp has arrived. The seal is ready to be broken and the message from your past self revealed.
          </p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() => onOpenChapter(readyChapter)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "var(--bg-surface)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Break Seal & Reveal Chapter</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Next Scheduled Sealed Chapter
  if (nextSealed) {
    const formattedUnlockDate = new Date(nextSealed.unlock_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const formattedCreatedDate = new Date(nextSealed.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div
        className="rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white p-6 sm:p-7 space-y-4 relative overflow-hidden transition-all shadow-xs"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-accent)]">
            <Clock className="w-4 h-4" />
            <span>{remainingText || "Upcoming Unlock"}</span>
          </div>

          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Unlocks {formattedUnlockDate}</span>
          </span>
        </div>

        <div className="max-w-xl space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
            &ldquo;{nextSealed.title}&rdquo;
          </h2>
          <p className="text-xs text-[var(--text-muted)] italic font-serif leading-relaxed">
            Sealed on {formattedCreatedDate}. Kept confidential in your time vault until scheduled release.
          </p>
        </div>

        <div className="pt-1 flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Time-Locked & Sealed</span>
          </span>

          <button
            onClick={() => onOpenChapter(nextSealed)}
            className="text-xs font-semibold text-[var(--brand-primary)] hover:underline"
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty state: No chapters scheduled
  return (
    <div
      className="rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white p-6 sm:p-8 text-center space-y-3 shadow-xs"
    >
      <div className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
        <Clock className="w-5 h-5" />
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          No Scheduled Chapters in the Vault
        </h3>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Write a letter or milestone note to yourself in 30 days, 6 months, or 1 year. Anchor your future perspective today.
        </p>
      </div>
      <button
        onClick={onDraftChapter}
        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-strong)] text-[var(--brand-primary)] hover:bg-[var(--bg-surface-subtle)] transition"
      >
        Draft Your First Chapter
      </button>
    </div>
  );
}

