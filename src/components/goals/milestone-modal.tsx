"use client";

/**
 * milestone-modal.tsx - Create and Edit Milestone Modal for the Goals Workspace.
 */

import React, { useState } from "react";
import { X, Flag, Loader2 } from "lucide-react";
import type { Milestone } from "@/lib/dashboard-calculations";
import type { MilestoneStatus } from "@/lib/supabase/database.types";

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneToEdit?: Milestone | null;
  projectId: string;
  projectName: string;
  onSubmit: (payload: {
    title: string;
    description?: string | null;
    target_date?: string | null;
    status?: MilestoneStatus;
  }) => Promise<{ error?: string }>;
}

export function MilestoneModal(props: MilestoneModalProps) {
  if (!props.isOpen) return null;
  return <MilestoneModalContent key={props.milestoneToEdit?.id || "new"} {...props} />;
}

function MilestoneModalContent({
  onClose,
  milestoneToEdit,
  projectName,
  onSubmit,
}: MilestoneModalProps) {
  const [title, setTitle] = useState(() => milestoneToEdit?.title || "");
  const [description, setDescription] = useState(() => milestoneToEdit?.description || "");
  const [targetDate, setTargetDate] = useState(() => milestoneToEdit?.target_date || "");
  const [status, setStatus] = useState<MilestoneStatus>(() => milestoneToEdit?.status || "pending");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 200) {
      setError("Milestone title must be between 1 and 200 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await onSubmit({
        title: trimmed,
        description: description.trim() || null,
        target_date: targetDate || null,
        status,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save milestone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h2 id="milestone-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
                {milestoneToEdit ? "Edit Milestone Checkpoint" : "Add Milestone Checkpoint"}
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Workspace: {projectName}
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
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Milestone Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Complete Alpha Authentication & RLS Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Description <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="What criteria must be satisfied for this milestone to be reached?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Target Deadline
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              >
                <option value="pending">Pending (active target)</option>
                <option value="achieved">Achieved (completed)</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[var(--brand-primary)] text-white hover:opacity-90 transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : milestoneToEdit ? (
                "Save Milestone"
              ) : (
                "Add Milestone"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
