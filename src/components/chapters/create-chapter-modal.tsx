"use client";

/**
 * create-chapter-modal.tsx - Create and Seal New Future-Self Chapter.
 */

import React, { useState, useMemo } from "react";
import { X, Lock, Sparkles, Globe, AlertCircle } from "lucide-react";
import {
  combineDateAndTimeToUtcIso,
  validateChapterCreation,
  type ChapterCategory,
} from "@/lib/dashboard-calculations";
import { PrimaryButton, SecondaryButton } from "@/components/ui/buttons";

interface CreateChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    category: ChapterCategory;
    unlockAtIso: string;
    message: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const CATEGORIES: { value: ChapterCategory; label: string; desc: string }[] = [
  { value: "letter", label: "Letter to Future Self", desc: "A personal letter to yourself at a future moment" },
  { value: "milestone", label: "Milestone Vision", desc: "Mindset and hopes upon reaching a significant goal" },
  { value: "reflection", label: "State of Mind", desc: "How you see your life, priorities, and direction right now" },
  { value: "mindset", label: "Conviction & Warnings", desc: "Principles and guardrails you don't want to forget" },
  { value: "commitment", label: "Long-term Vow", desc: "A solemn pact with who you are working to become" },
];

export function CreateChapterModal({ isOpen, onClose, onSubmit }: CreateChapterModalProps) {
  if (!isOpen) return null;
  return <CreateChapterModalContent onClose={onClose} onSubmit={onSubmit} />;
}

function CreateChapterModalContent({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: CreateChapterModalProps["onSubmit"];
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ChapterCategory>("letter");

  // Default unlock date: 30 days in the future
  const defaultDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [unlockDate, setUnlockDate] = useState(defaultDateStr);
  const [unlockTime, setUnlockTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect local timezone name
  const localTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time";
    } catch {
      return "Local Time";
    }
  }, []);

  // Compute UTC ISO preview
  const calculatedUtcIso = useMemo(() => {
    if (!unlockDate || !unlockTime) return "";
    return combineDateAndTimeToUtcIso(unlockDate, unlockTime);
  }, [unlockDate, unlockTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    const validation = validateChapterCreation(
      {
        title,
        category,
        unlockAtIso: calculatedUtcIso,
        message,
      },
      new Date()
    );

    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        title,
        category,
        unlockAtIso: calculatedUtcIso,
        message,
      });

      if (!res.success) {
        setError(res.error || "Failed to seal chapter.");
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seal chapter.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-chapter-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-chapter-title" className="text-lg font-bold text-[var(--text-primary)]">
                Draft a Future-Self Chapter
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Sealed time capsule across days, months, or years
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Chapter Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Letter to Myself at 6-Month Mark, or Founding Conviction"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ChapterCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Unlock Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Unlock Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Unlock Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={unlockTime}
                onChange={(e) => setUnlockTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
          </div>

          {/* Timezone Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            <Globe className="w-3.5 h-3.5 shrink-0 text-[var(--brand-accent)]" />
            <span>
              Scheduled in <strong className="text-[var(--text-primary)]">{localTimezone}</strong>. Encoded to UTC ISO timestamp for deterministic time locking.
            </span>
          </div>

          {/* Confidential Message Payload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Message to Your Future Self <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">
                {message.length} / 50,000 characters
              </span>
            </div>

            <textarea
              required
              rows={6}
              maxLength={50000}
              placeholder="Write honestly. What doubts are you carrying right now? What convictions do you refuse to compromise? What do you hope will be true when you open this?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] font-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <SecondaryButton onClick={onClose} disabled={isSubmitting}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              isLoading={isSubmitting}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Seal Chapter in Time Capsule
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
