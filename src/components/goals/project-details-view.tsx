"use client";

/**
 * project-details-view.tsx - Dedicated Deep Inspection View for a Selected Project.
 *
 * Implements:
 * - Breadcrumb navigation back to all projects
 * - Project header with status and metadata
 * - Dual progress indicators (Task execution vs Milestone checkpoints)
 * - Interactive milestone management (achievement toggle, edit, delete, add)
 * - Real task checklist with deterministic risk engine badges
 */

import React, { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Edit2,
  Flag,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  HelpCircle,
  Loader2,
} from "lucide-react";
import type { ProjectWithDetails, TaskWithRiskInProject } from "@/hooks/use-goals-workspace";
import type { Milestone } from "@/lib/dashboard-calculations";
import type { MilestoneStatus, TaskStatus } from "@/lib/supabase/database.types";
import { parseDeadline } from "@/lib/risk";

interface ProjectDetailsViewProps {
  project: ProjectWithDetails;
  onBack: () => void;
  onEditProject: () => void;
  onDeleteProject: () => void;
  onAddMilestone: () => void;
  onEditMilestone: (milestone: Milestone) => void;
  onToggleMilestoneStatus: (milestoneId: string, currentStatus: MilestoneStatus) => void;
  onDeleteMilestone: (milestone: Milestone) => void;
  onAddTask: () => void;
  onToggleTaskStatus: (taskId: string, currentStatus: TaskStatus) => void;
  onOpenRiskModal: (task: TaskWithRiskInProject) => void;
  mutatingMilestoneIds: Set<string>;
  mutatingTaskIds: Set<string>;
}

export function ProjectDetailsView({
  project,
  onBack,
  onEditProject,
  onDeleteProject,
  onAddMilestone,
  onEditMilestone,
  onToggleMilestoneStatus,
  onDeleteMilestone,
  onAddTask,
  onToggleTaskStatus,
  onOpenRiskModal,
  mutatingMilestoneIds,
  mutatingTaskIds,
}: ProjectDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<"milestones" | "tasks">("milestones");

  const { progress, milestones, tasks } = project;

  const formatDueLabel = (dueStr: string | null) => {
    if (!dueStr) return null;
    const d = parseDeadline(dueStr);
    if (!d) return { text: dueStr, isSoon: false, isOverdue: false, isToday: false };

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
    if (diffDays === 0) return { text: "Due today", isToday: true };
    if (diffDays === 1) return { text: "Due tomorrow", isSoon: true };
    if (diffDays <= 7) return { text: `In ${diffDays} days`, isSoon: true };
    return { text: dueStr, isSoon: false };
  };

  const renderRiskBadge = (task: TaskWithRiskInProject) => {
    const status = task.assessment.status;
    switch (status) {
      case "HIGH":
        return (
          <button
            onClick={() => onOpenRiskModal(task)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/40 hover:scale-105 transition"
            title="Click to view risk analysis"
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>High Risk</span>
          </button>
        );
      case "MEDIUM":
        return (
          <button
            onClick={() => onOpenRiskModal(task)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 hover:scale-105 transition"
            title="Click to view risk analysis"
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span>Medium Risk</span>
          </button>
        );
      case "LOW":
        return (
          <button
            onClick={() => onOpenRiskModal(task)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 hover:scale-105 transition"
            title="Click to view risk analysis"
          >
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span>Low Risk</span>
          </button>
        );
      case "OVERDUE":
        return (
          <button
            onClick={() => onOpenRiskModal(task)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 hover:scale-105 transition"
            title="Click to view risk analysis"
          >
            <AlertOctagon className="w-3 h-3 shrink-0" />
            <span>Overdue</span>
          </button>
        );
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-surface-subtle)]">
            <Check className="w-3 h-3" />
            Done
          </span>
        );
      default:
        return (
          <button
            onClick={() => onOpenRiskModal(task)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-surface-subtle)]"
          >
            <HelpCircle className="w-3 h-3" />
            No Date
          </button>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--brand-primary)] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Projects
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEditProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Workspace
          </button>

          <button
            onClick={onDeleteProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
              {project.status}
            </span>
            {project.target_date && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Target Delivery: {project.target_date}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">
            {project.name}
          </h1>

          {project.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {project.description}
            </p>
          )}
        </div>

        {/* Dual Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--text-muted)]">Task Execution</span>
              <span className="text-[var(--brand-primary)] font-bold">
                {progress.taskPercentage}% ({progress.completedTasks}/{progress.totalTasks})
              </span>
            </div>
            <div className="w-full bg-[var(--border-subtle)] h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-500"
                style={{ width: `${progress.taskPercentage}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--text-muted)]">Milestone Delivery</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {progress.milestonePercentage}% ({progress.milestonesAchieved}/{progress.totalMilestones})
              </span>
            </div>
            <div className="w-full bg-[var(--border-subtle)] h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress.milestonePercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Milestones Timeline vs Associated Tasks */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("milestones")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "milestones"
                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Milestones ({milestones.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "tasks"
                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Associated Tasks ({tasks.length})</span>
          </button>
        </div>

        {activeTab === "milestones" ? (
          <button
            onClick={onAddMilestone}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--brand-primary)] text-white hover:opacity-90 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Milestone
          </button>
        ) : (
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--brand-primary)] text-white hover:opacity-90 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        )}
      </div>

      {/* Tab Content: Milestones */}
      {activeTab === "milestones" && (
        <div className="space-y-3">
          {milestones.length > 0 ? (
            milestones.map((m) => {
              const isAchieved = m.status === "achieved";
              const isMutating = mutatingMilestoneIds.has(m.id);

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    isAchieved
                      ? "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] opacity-75"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--brand-mist)]"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleMilestoneStatus(m.id, m.status)}
                      disabled={isMutating}
                      className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isAchieved
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-[var(--border-strong)] hover:border-[var(--brand-primary)] text-transparent"
                      } disabled:opacity-50`}
                      title={isAchieved ? "Reopen milestone" : "Mark milestone achieved"}
                    >
                      {isMutating ? (
                        <Loader2 className="w-3 h-3 text-[var(--brand-primary)] animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-bold ${
                            isAchieved
                              ? "line-through text-[var(--text-muted)]"
                              : "text-[var(--text-primary)]"
                          }`}
                        >
                          {m.title}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isAchieved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      {m.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      )}

                      {m.target_date && (
                        <p className="text-xs text-[var(--text-muted)] mt-1.5 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          Target: {m.target_date}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditMilestone(m)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition"
                      title="Edit milestone"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMilestone(m)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 transition"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--brand-accent-soft)] flex items-center justify-center text-[var(--brand-primary)]">
                <Flag className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No checkpoints scheduled yet
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Milestones establish concrete delivery points along your project roadmap.
              </p>
              <div className="pt-2">
                <button
                  onClick={onAddMilestone}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--brand-primary)] text-white hover:opacity-90 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Milestone
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Tasks */}
      {activeTab === "tasks" && (
        <div className="space-y-2.5">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isMutating = mutatingTaskIds.has(task.id);
              const dueInfo = formatDueLabel(task.due_date);

              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCompleted
                      ? "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] opacity-70"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--brand-mist)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => onToggleTaskStatus(task.id, task.status)}
                      disabled={isMutating}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isCompleted
                          ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white"
                          : "border-[var(--border-strong)] hover:border-[var(--brand-primary)] text-transparent"
                      } disabled:opacity-50`}
                      aria-label={isCompleted ? "Reopen task" : "Complete task"}
                    >
                      {isMutating ? (
                        <Loader2 className="w-3 h-3 text-[var(--brand-primary)] animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isCompleted
                            ? "line-through text-[var(--text-muted)]"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-muted)] flex-wrap">
                        {dueInfo && (
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              dueInfo.isOverdue
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : dueInfo.isToday || dueInfo.isSoon
                                ? "text-amber-700 dark:text-amber-400 font-semibold"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {dueInfo.text}
                          </span>
                        )}

                        <span>· {task.estimated_hours}h est</span>

                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase bg-[var(--bg-surface-subtle)]">
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {renderRiskBadge(task)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--brand-accent-soft)] flex items-center justify-center text-[var(--brand-primary)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No tasks assigned to this project yet
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Break this project down into actionable daily workloads to trigger deadline-risk insights.
              </p>
              <div className="pt-2">
                <button
                  onClick={onAddTask}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--brand-primary)] text-white hover:opacity-90 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Task
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

