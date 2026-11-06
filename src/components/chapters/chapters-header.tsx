"use client";

/**
 * chapters-header.tsx - Header for DueLine's Future-Self Chapters Workspace.
 *
 * Communicates the core philosophy:
 * "Your future self is waiting."
 * "A message from another version of you."
 * "Leave a message for the person you're becoming."
 */

import React from "react";
import { Plus, ShieldCheck, Sparkles } from "lucide-react";
import { PrimaryButton } from "@/components/ui/buttons";

interface ChaptersHeaderProps {
  onDraftChapter: () => void;
}

export function ChaptersHeader({ onDraftChapter }: ChaptersHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#E4E8E1] bg-white shadow-xs transition-all">
      {/* Background Decorative Radial Gradient */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/2 opacity-15 dark:opacity-20 bg-contain bg-no-repeat bg-right"
        style={{
          backgroundImage: `radial-gradient(ellipse at 80% 50%, var(--brand-mist), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--brand-accent-soft)",
                color: "var(--brand-primary)",
              }}
            >
              Memory Loop
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
              A message from another version of you
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Your future self is waiting.
          </h1>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal max-w-xl leading-relaxed">
            Leave a message for the person you&apos;re becoming. Scheduled reflections, warnings, and commitments sealed across time.
          </p>
        </div>

        {/* Action Button & Time-Lock Assurance */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-[var(--text-primary)] text-[11px]">
                Time-Locked Confidentiality
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Sealed until target unlock date
              </span>
            </div>
          </div>

          <PrimaryButton
            onClick={onDraftChapter}
            icon={<Plus className="w-4 h-4" />}
          >
            Draft Chapter
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
