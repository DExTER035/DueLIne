"use client";

/**
 * journey-header.tsx - Header for DueLine's Private Journey & Evidence Workspace.
 */

import React from "react";
import { Lock, History, Shield } from "lucide-react";

export function JourneyHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#E4E8E1] bg-white shadow-xs transition-all">
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/2 opacity-10 dark:opacity-15 bg-contain bg-no-repeat bg-right"
        style={{
          backgroundImage: `radial-gradient(ellipse at 80% 50%, var(--brand-mist), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--brand-accent-soft)",
                color: "var(--brand-primary)",
              }}
            >
              Evidence Loop
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium">
              <History className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              Verified Progress History
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Every step becomes part of your story.
          </h1>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal max-w-xl">
            Look back at what you&apos;ve built, learned, and accomplished. Private and personal by default.
          </p>
        </div>

        {/* Privacy Assurance Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] shrink-0 self-start md:self-auto">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col">
            <span className="font-bold text-[var(--text-primary)] text-[11px]">
              Strictly Private Evidence
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              Encrypted by PostgreSQL RLS
            </span>
          </div>
          <Shield className="w-3.5 h-3.5 text-[var(--brand-primary)] ml-1" />
        </div>
      </div>
    </div>
  );
}

