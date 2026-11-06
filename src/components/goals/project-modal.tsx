"use client";

/**
 * project-modal.tsx - Create and Edit Project Modal for the Goals Workspace.
 */

import React, { useState } from "react";
import { X, FolderKanban, Loader2 } from "lucide-react";
import type { ProjectWithDetails } from "@/hooks/use-goals-workspace";
import type { ProjectStatus } from "@/lib/supabase/database.types";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: ProjectWithDetails | null;
  onSubmit: (payload: {
    name: string;
    description?: string | null;
    target_date?: string | null;
    start_date?: string | null;
    status?: ProjectStatus;
  }) => Promise<{ error?: string }>;
}

export function ProjectModal(props: ProjectModalProps) {
  if (!props.isOpen) return null;
  return <ProjectModalContent key={props.projectToEdit?.id || "new"} {...props} />;
}

function ProjectModalContent({
  onClose,
  projectToEdit,
  onSubmit,
}: ProjectModalProps) {
  const [name, setName] = useState(() => projectToEdit?.name || "");
  const [description, setDescription] = useState(() => projectToEdit?.description || "");
  const [targetDate, setTargetDate] = useState(() => projectToEdit?.target_date || "");
  const [startDate, setStartDate] = useState(() => projectToEdit?.start_date || "");
  const [status, setStatus] = useState<ProjectStatus>(() => projectToEdit?.status || "active");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      setError("Project name must be between 1 and 100 characters.");
      return;
    }

    if (startDate && targetDate && startDate > targetDate) {
      setError("Start date must be before or equal to the target date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await onSubmit({
        name: trimmed,
        description: description.trim() || null,
        target_date: targetDate || null,
        start_date: startDate || null,
        status,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project.");
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
        aria-labelledby="project-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              <FolderKanban className="w-4 h-4" />
            </div>
            <h2 id="project-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
              {projectToEdit ? "Edit Project Workspace" : "Create New Project"}
            </h2>
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
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. DueLine Platform Core"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Description <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="What ambition or outcome does this project represent?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>

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
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Project Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="active">Active (in execution)</option>
              <option value="on_hold">On Hold (paused)</option>
              <option value="completed">Completed (delivered)</option>
              <option value="archived">Archived</option>
            </select>
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
              ) : projectToEdit ? (
                "Save Changes"
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
