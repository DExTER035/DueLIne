"use client";

/**
 * chapter-detail-modal.tsx - Detail & Reveal Experience for Chapters.
 *
 * Implements the core product rule:
 * - Sealed chapters strictly hide their message.
 * - Ready-to-unlock chapters feature a ceremonial reveal action.
 * - Unlocked chapters permanently preserve the original message.
 * - Reflections remain strictly separate from the original message.
 */

import React, { useState } from "react";
import {
  X,
  Lock,
  Sparkles,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  AlertCircle,
  Save,
} from "lucide-react";
import { getChapterStatus, type Chapter } from "@/lib/dashboard-calculations";
import { PrimaryButton, SecondaryButton } from "@/components/ui/buttons";

interface ChapterDetailModalProps {
  isOpen: boolean;
  chapter: Chapter | null;
  onClose: () => void;
  onReveal: (chapterId: string) => Promise<{ success: boolean; payload?: string; error?: string }>;
  onRecordReflection: (chapterId: string, reflection: string) => Promise<{ success: boolean; error?: string }>;
  getChapterMessage: (chapterId: string) => string | null;
}

export function ChapterDetailModal(props: ChapterDetailModalProps) {
  if (!props.isOpen || !props.chapter) return null;
  return <ChapterDetailModalContent key={props.chapter.id} {...props} chapter={props.chapter} />;
}

function ChapterDetailModalContent({
  chapter,
  onClose,
  onReveal,
  onRecordReflection,
  getChapterMessage,
}: ChapterDetailModalProps & { chapter: Chapter }) {
  const status = getChapterStatus(chapter, new Date());

  const [dynamicPayload, setDynamicPayload] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Derive revealed message without cascading render in effect
  const revealedMessage = dynamicPayload || (chapter.unlocked_at ? getChapterMessage(chapter.id) : null);

  const formattedUnlockDate = new Date(chapter.unlock_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const formattedCreatedDate = new Date(chapter.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedUnlockedDate = chapter.unlocked_at
    ? new Date(chapter.unlocked_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const formattedReflectionDate = chapter.reflection_recorded_at
    ? new Date(chapter.reflection_recorded_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Handle Breaking the Seal
  const handleReveal = async () => {
    if (isRevealing) return;
    setError(null);
    setIsRevealing(true);

    try {
      const res = await onReveal(chapter.id);
      if (!res.success) {
        setError(res.error || "Failed to reveal chapter.");
      } else if (res.payload) {
        setDynamicPayload(res.payload);
        setSuccessNotice("Seal broken. The message from your past self is now revealed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error breaking chapter seal.");
    } finally {
      setIsRevealing(false);
    }
  };

  // Handle Saving Reflection
  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReflection) return;

    const trimmed = reflectionText.trim();
    if (!trimmed) {
      setError("Please write your reflection before saving.");
      return;
    }

    setError(null);
    setIsSubmittingReflection(true);

    try {
      const res = await onRecordReflection(chapter.id, trimmed);
      if (!res.success) {
        setError(res.error || "Failed to record reflection.");
      } else {
        setSuccessNotice("Reflection recorded and permanently attached to this chapter.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record reflection.");
    } finally {
      setIsSubmittingReflection(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-detail-title"
      >
        {/* Header & Badges */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
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
                  <span>Time-Locked & Sealed</span>
                </span>
              )}

              {status === "ready_to_unlock" && !revealedMessage && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Ready to Reveal</span>
                </span>
              )}

              {(status === "past" || revealedMessage) && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Unlocked & Preserved</span>
                </span>
              )}

              <span className="text-xs font-semibold capitalize text-[var(--text-muted)]">
                {chapter.category}
              </span>
            </div>

            <h2 id="chapter-detail-title" className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
              {chapter.title}
            </h2>

            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap pt-0.5">
              <span>Sealed on {formattedCreatedDate}</span>
              <span>•</span>
              <span>Target Unlock: {formattedUnlockDate}</span>
              {formattedUnlockedDate && (
                <>
                  <span>•</span>
                  <span className="text-[var(--brand-primary)] font-medium">
                    Unlocked on {formattedUnlockedDate}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Body Content based on State */}
        <div className="space-y-6">
          {/* 1. SEALED CHAPTER (Message is locked and hidden) */}
          {status === "sealed" && (
            <div
              className="rounded-2xl border p-6 sm:p-8 text-center space-y-4"
              style={{
                backgroundColor: "var(--bg-surface-subtle)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border shadow-xs"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--brand-accent)",
                }}
              >
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  This Chapter is Sealed in Time
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-serif italic">
                  &ldquo;A message from your past self is waiting inside. To protect the integrity of the time capsule, the message payload cannot be decrypted or read until {formattedUnlockDate}.&rdquo;
                </p>
              </div>

              <div className="pt-2 text-xs text-[var(--text-secondary)] font-medium">
                Patience is part of the discipline. When the date arrives, this chapter will become ready to reveal.
              </div>
            </div>
          )}

          {/* 2. READY TO UNLOCK (Ceremonial Reveal Action) */}
          {status === "ready_to_unlock" && !revealedMessage && (
            <div
              className="rounded-2xl border p-6 sm:p-8 text-center space-y-5"
              style={{
                backgroundColor: "var(--status-med-bg)",
                borderColor: "var(--status-med-border)",
              }}
            >
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/20 text-[var(--status-med-text)] shadow-xs">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  The Time Has Arrived
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  You sealed this message on {formattedCreatedDate}. The scheduled unlock timestamp has arrived. Are you ready to break the seal and read what your past self left for you?
                </p>
              </div>

              <div className="pt-2">
                <PrimaryButton
                  onClick={handleReveal}
                  isLoading={isRevealing}
                  icon={<Sparkles className="w-4 h-4" />}
                  className="px-6 py-3 text-sm shadow-md"
                >
                  Break Seal & Reveal Chapter
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* 3. UNLOCKED CHAPTER (Original Permanent Message + Separate Reflection) */}
          {(status === "past" || revealedMessage) && (
            <div className="space-y-6">
              {/* Section A: Original Message (Permanent & Unalterable) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  <BookOpen className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Original Message from Your Past Self (Permanent)</span>
                </div>

                <div
                  className="p-5 sm:p-6 rounded-2xl border text-sm sm:text-base leading-relaxed font-serif whitespace-pre-wrap select-text"
                  style={{
                    backgroundColor: "var(--bg-surface-subtle)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  {revealedMessage || "Loading message payload..."}
                </div>
              </div>

              {/* Section B: Present-Day Revisit Reflection (Separate from Message) */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-accent)]">
                    <MessageSquare className="w-4 h-4" />
                    <span>Present-Day Revisit Reflection</span>
                  </div>

                  {formattedReflectionDate && (
                    <span className="text-xs text-[var(--text-muted)] font-medium">
                      Recorded on {formattedReflectionDate}
                    </span>
                  )}
                </div>

                {chapter.reflection ? (
                  /* Read-Only Recorded Reflection */
                  <div
                    className="p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm leading-relaxed"
                    style={{
                      backgroundColor: "var(--brand-accent-soft)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <p className="italic font-sans whitespace-pre-wrap">
                      &ldquo;{chapter.reflection}&rdquo;
                    </p>
                  </div>
                ) : (
                  /* Form to record reflection if not yet saved */
                  <form onSubmit={handleSaveReflection} className="space-y-3">
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Now that you have read this message across time, how does it look from where you stand? What has changed? What remained true?
                    </p>

                    <textarea
                      rows={4}
                      required
                      placeholder="Write your honest present-day reflection here. Once saved, it permanently attaches to this chapter memory..."
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />

                    <div className="flex justify-end">
                      <PrimaryButton
                        type="submit"
                        isLoading={isSubmittingReflection}
                        icon={<Save className="w-4 h-4" />}
                      >
                        Save Revisit Reflection
                      </PrimaryButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end">
          <SecondaryButton onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
