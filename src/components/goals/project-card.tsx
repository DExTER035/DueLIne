"use client";

/**
 * project-card.tsx - Comprehensive Project Card for the Goals Workspace.
 *
 * Displays:
 * - Status badge (Active, On Hold, Completed, Archived)
 * - Distinct Task and Milestone progress indicators
 * - Upcoming milestone checkpoint
 * - Target deadline and last updated metadata
 * - Actions: View Details, Edit Project
 */

import React from "react";
import {
  Calendar,
  Flag,
  ArrowRight,
  MoreVertical,
  CheckCircle,
  Archive,
  PauseCircle,
} from "lucide-react";
import type { ProjectWithDetails } from "@/hooks/use-goals-workspace";
import type { ProjectStatus } from "@/lib/supabase/database.types";

interface ProjectCardProps {
  project: ProjectWithDetails;
  onSelectProject: (projectId: string) => void;
  onEditProject: (project: ProjectWithDetails) => void;
  onStatusChange: (projectId: string, nextStatus: ProjectStatus) => void;
}

export function ProjectCard({
  project,
  onSelectProject,
  onEditProject,
  onStatusChange,
}: ProjectCardProps) {
  const { progress } = project;

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case "on_hold":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <PauseCircle className="w-3 h-3" />
            On Hold
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Archive className="w-3 h-3" />
            Archived
          </span>
        );
    }
  };

  const formattedDate = project.target_date || "No deadline";

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5 transition-all hover:border-[#A4B99B] hover:shadow-sm">
      {/* Top Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {getStatusBadge(project.status)}

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>

            <button
              onClick={() => onEditProject(project)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition"
              title="Edit project"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <button
            onClick={() => onSelectProject(project.id)}
            className="text-left group"
          >
            <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition">
              {project.name}
            </h3>
          </button>
          {project.description ? (
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)] italic mt-1">
              No description provided
            </p>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
        {/* Task Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[var(--text-muted)]">Task Execution</span>
            <span className="text-[var(--text-primary)] font-bold">
              {progress.taskPercentage}% ({progress.completedTasks}/{progress.totalTasks})
            </span>
          </div>
          <div className="w-full bg-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-500"
              style={{ width: `${progress.taskPercentage}%` }}
            />
          </div>
        </div>

        {/* Milestone Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[var(--text-muted)]">Milestone Delivery</span>
            <span className="text-[var(--brand-primary)] font-bold">
              {progress.milestonePercentage}% ({progress.milestonesAchieved}/{progress.totalMilestones})
            </span>
          </div>
          <div className="w-full bg-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.milestonePercentage}%` }}
            />
          </div>
        </div>

        {/* Next Milestone Spotlight */}
        {progress.currentMilestone ? (
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center gap-2 text-xs">
            <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-[var(--text-primary)]">
                {progress.currentMilestone.title}
              </span>
              {progress.currentMilestone.target_date && (
                <span className="text-[var(--text-muted)] ml-1">
                  · Due {progress.currentMilestone.target_date}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-[var(--text-muted)] italic">
            {progress.totalMilestones > 0
              ? "All milestones completed 🎉"
              : "No checkpoints scheduled"}
          </div>
        )}
      </div>

      {/* Card Footer: View Details Action */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={() =>
            onStatusChange(
              project.id,
              project.status === "completed" ? "active" : "completed"
            )
          }
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          {project.status === "completed" ? "Reactivate" : "Mark Completed"}
        </button>

        <button
          onClick={() => onSelectProject(project.id)}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand-primary)] hover:underline"
        >
          <span>Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
