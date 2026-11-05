"use client";

/**
 * create-task-modal.tsx - Task Creation Modal with Project Selection & Workload Estimation.
 *
 * Implements input validation, duplicate submission protection, and seamless project creation
 * when the user has not yet established an active project container.
 */

import React, { useState } from "react";
import { X, Plus, FolderKanban, Loader2 } from "lucide-react";
import type { Project } from "@/lib/dashboard-calculations";
import type { TaskPriority } from "@/lib/supabase/database.types";
import type { CreateTaskPayload, CreateProjectPayload } from "@/hooks/use-today-dashboard";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onCreateTask: (payload: CreateTaskPayload) => Promise<{ error?: string }>;
  onCreateProject: (payload: CreateProjectPayload) => Promise<{ error?: string; project?: Project }>;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  projects,
  onCreateTask,
  onCreateProject,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [dueDate, setDueDate] = useState(() => {
    // Default to tomorrow's date
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [estimatedHours, setEstimatedHours] = useState("2.0");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick project creation state (when user has no projects yet)
  const [showNewProjectInput, setShowNewProjectInput] = useState(projects.length === 0);
  const [newProjectName, setNewProjectName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please enter a task title.");
      return;
    }

    let targetProjectId = projectId;

    setIsSubmitting(true);

    try {
      // If user needs to create a project first
      if (showNewProjectInput || !targetProjectId) {
        const projName = newProjectName.trim() || "General Productivity";
        const projResult = await onCreateProject({ name: projName });
        if (projResult.error || !projResult.project) {
          setError(projResult.error || "Failed to create project container.");
          setIsSubmitting(false);
          return;
        }
        targetProjectId = projResult.project.id;
        setProjectId(targetProjectId);
        setShowNewProjectInput(false);
      }

      const estHours = parseFloat(estimatedHours) || 1.0;

      const taskResult = await onCreateTask({
        title: trimmedTitle,
        project_id: targetProjectId,
        due_date: dueDate || null,
        estimated_hours: estHours,
        priority,
        description: description.trim() || null,
      });

      if (taskResult.error) {
        setError(taskResult.error);
      } else {
        // Reset and close
        setTitle("");
        setDescription("");
        setError(null);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
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
        aria-labelledby="create-task-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              <Plus className="w-4 h-4" />
            </div>
            <h2 id="create-task-title" className="text-lg font-bold text-[var(--text-primary)]">
              Create New Task
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
          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Audit database constraints & composite FKs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {/* Project Selection / Inline Creator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Project Container <span className="text-red-500">*</span>
              </label>
              {projects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewProjectInput((v) => !v)}
                  className="text-[11px] font-semibold text-[var(--brand-primary)] hover:underline"
                >
                  {showNewProjectInput ? "Choose Existing" : "+ New Project"}
                </button>
              )}
            </div>

            {showNewProjectInput || projects.length === 0 ? (
              <div className="space-y-1.5 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
                <p className="text-[11px] text-[var(--text-muted)] font-medium">
                  {projects.length === 0
                    ? "Create your first project container for this task:"
                    : "Create a new project container:"}
                </p>
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. DueLine Platform Core"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                  />
                </div>
              </div>
            ) : (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Workload Estimation & Due Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Estimated Work Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                max="1000"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Description <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Context or notes about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {/* Actions */}
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
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
