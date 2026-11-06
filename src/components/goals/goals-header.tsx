"use client";

/**
 * goals-header.tsx - Header for the Goals & Ambition Module.
 */

import React from "react";
import { Plus, Target } from "lucide-react";
import { PrimaryButton } from "@/components/ui/buttons";

interface GoalsHeaderProps {
  onNewProjectClick: () => void;
}

export function GoalsHeader({ onNewProjectClick }: GoalsHeaderProps) {
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
              Ambition Loop
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium">
              <Target className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              Projects &amp; Milestones
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Build towards something.
          </h1>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal max-w-xl">
            Turn your ambitions into meaningful progress. Structure life commitments, define delivery checkpoints, and track velocity.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <PrimaryButton
            onClick={onNewProjectClick}
            icon={<Plus className="w-4 h-4" />}
            className="shadow-sm"
          >
            New Project
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

