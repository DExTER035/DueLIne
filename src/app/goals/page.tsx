"use client";

/**
 * /goals/page.tsx - DueLine Stage 2C.3 Goals, Projects & Milestone Management.
 *
 * Implements the complete Ambition -> Action -> Evidence -> Memory goals workspace:
 * - Real authenticated Supabase projects & milestones management
 * - Deep project inspection view with dual progress (task execution vs milestone delivery)
 * - Milestone lifecycle tracking (pending, achieved, missed)
 * - In-project task management with deterministic risk intelligence
 * - Responsive desktop and mobile layouts with filter tabs and empty states
 */

import React, { useState, useMemo } from "react";
import { AlertCircle, Plus, Target, RotateCcw, Info, RefreshCw } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { GoalsHeader } from "@/components/goals/goals-header";
import { GoalsMetrics } from "@/components/goals/goals-metrics";
import { ProjectCard } from "@/components/goals/project-card";
import { ProjectDetailsView } from "@/components/goals/project-details-view";
import { ProjectModal } from "@/components/goals/project-modal";
import { MilestoneModal } from "@/components/goals/milestone-modal";
import { DeleteConfirmModal } from "@/components/goals/delete-confirm-modal";
import { CreateTaskModal } from "@/components/dashboard/create-task-modal";
import { RiskDetailsModal } from "@/components/dashboard/risk-details-modal";
import {
  useGoalsWorkspace,
  type ProjectWithDetails,
  type TaskWithRiskInProject,
} from "@/hooks/use-goals-workspace";
import type { Milestone } from "@/lib/dashboard-calculations";
import type { ProjectStatus } from "@/lib/supabase/database.types";

type FilterTab = "all" | "active" | "on_hold" | "completed" | "archived";

export default function GoalsPage() {
  const {
    projects,
    summaryMetrics,
    selectedProject,
    setSelectedProjectId,
    isLoading,
    error,
    isLocalPreview,
    resetPreviewData,
    mutatingMilestoneIds,
    mutatingTaskIds,
    createProject,
    updateProject,
    deleteProject,
    createMilestone,
    updateMilestone,
    toggleMilestoneStatus,
    deleteMilestone,
    toggleTaskStatus,
    createTaskForProject,
    refreshGoals,
  } = useGoalsWorkspace();

  // Filter state for projects overview
  const [filter, setFilter] = useState<FilterTab>("active");

  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithDetails | null>(null);

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneToEdit, setMilestoneToEdit] = useState<Milestone | null>(null);

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [selectedRiskTask, setSelectedRiskTask] = useState<TaskWithRiskInProject | null>(null);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<{ error?: string }>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    action: async () => ({}),
  });

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filter === "all") return true;
      return p.status === filter;
    });
  }, [projects, filter]);

  // Project modal triggers
  const handleOpenNewProject = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: ProjectWithDetails) => {
    setProjectToEdit(proj);
    setIsProjectModalOpen(true);
  };

  const handleProjectModalSubmit = async (payload: {
    name: string;
    description?: string | null;
    target_date?: string | null;
    start_date?: string | null;
    status?: ProjectStatus;
  }) => {
    if (projectToEdit) {
      return await updateProject(projectToEdit.id, payload);
    }
    return await createProject(payload);
  };

  // Milestone modal triggers
  const handleOpenAddMilestone = () => {
    setMilestoneToEdit(null);
    setIsMilestoneModalOpen(true);
  };

  const handleOpenEditMilestone = (m: Milestone) => {
    setMilestoneToEdit(m);
    setIsMilestoneModalOpen(true);
  };

  const handleMilestoneModalSubmit = async (payload: {
    title: string;
    description?: string | null;
    target_date?: string | null;
  }) => {
    if (!selectedProject) return { error: "No project selected." };
    if (milestoneToEdit) {
      return await updateMilestone(milestoneToEdit.id, payload);
    }
    return await createMilestone({
      project_id: selectedProject.id,
      title: payload.title,
      description: payload.description,
      target_date: payload.target_date,
    });
  };

  // Delete project trigger
  const handleDeleteProjectPrompt = (proj: ProjectWithDetails) => {
    setDeleteModalState({
      isOpen: true,
      title: `Delete Project: ${proj.name}?`,
      message:
        "Warning: Deleting this project will permanently remove all associated tasks, milestones, and progress events. This action cannot be undone.",
      action: async () => {
        return await deleteProject(proj.id);
      },
    });
  };

  // Delete milestone trigger
  const handleDeleteMilestonePrompt = (m: Milestone) => {
    setDeleteModalState({
      isOpen: true,
      title: `Delete Milestone: ${m.title}?`,
      message:
        "Are you sure you want to remove this milestone checkpoint from your project roadmap?",
      action: async () => {
        return await deleteMilestone(m.id);
      },
    });
  };

  return (
    <WorkspaceLayout>
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        {error && (
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50/80 text-xs text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button
              onClick={refreshGoals}
              className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            VIEW 1: DEEP PROJECT DETAILS VIEW (When a project is selected)
           ========================================================================= */}
        {selectedProject ? (
          <ProjectDetailsView
            project={selectedProject}
            onBack={() => setSelectedProjectId(null)}
            onEditProject={() => handleOpenEditProject(selectedProject)}
            onDeleteProject={() => handleDeleteProjectPrompt(selectedProject)}
            onAddMilestone={handleOpenAddMilestone}
            onEditMilestone={handleOpenEditMilestone}
            onToggleMilestoneStatus={toggleMilestoneStatus}
            onDeleteMilestone={handleDeleteMilestonePrompt}
            onAddTask={() => setIsCreateTaskModalOpen(true)}
            onToggleTaskStatus={toggleTaskStatus}
            onOpenRiskModal={(task) => setSelectedRiskTask(task)}
            mutatingMilestoneIds={mutatingMilestoneIds}
            mutatingTaskIds={mutatingTaskIds}
          />
        ) : (
          /* =========================================================================
             VIEW 2: GOALS OVERVIEW (Projects list, metrics, and filters)
             ========================================================================= */
          <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <GoalsHeader onNewProjectClick={handleOpenNewProject} />

            {/* Subtle Preview Adapter indicator with reset */}
            {isLocalPreview && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-1 text-[var(--text-muted)] gap-2 -mt-2">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Preview Mode: Interactive local storage goals &amp; milestones.</span>
                </span>
                <button
                  onClick={resetPreviewData}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-primary)] hover:underline self-start sm:self-auto cursor-pointer"
                  title="Reset showcase sample goals to default state"
                >
                  <RotateCcw className="w-3 h-3 text-[var(--brand-accent)]" />
                  <span>Reset Sample Goals</span>
                </button>
              </div>
            )}

            {/* Metrics */}
            <GoalsMetrics metrics={summaryMetrics} isLoading={isLoading} />

            {/* Filters and Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Project Workspaces
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Structured goal containers driving daily tasks and milestones
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs overflow-x-auto">
                <button
                  onClick={() => setFilter("active")}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    filter === "active"
                      ? "bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm font-bold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Active ({projects.filter((p) => p.status === "active").length})
                </button>
                <button
                  onClick={() => setFilter("on_hold")}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    filter === "on_hold"
                      ? "bg-[var(--bg-surface)] text-amber-700 dark:text-amber-400 shadow-sm font-bold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  On Hold ({projects.filter((p) => p.status === "on_hold").length})
                </button>
                <button
                  onClick={() => setFilter("completed")}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    filter === "completed"
                      ? "bg-[var(--bg-surface)] text-emerald-700 dark:text-emerald-400 shadow-sm font-bold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Completed ({projects.filter((p) => p.status === "completed").length})
                </button>
                <button
                  onClick={() => setFilter("archived")}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    filter === "archived"
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-bold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Archived ({projects.filter((p) => p.status === "archived").length})
                </button>
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    filter === "all"
                      ? "bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm font-bold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  All ({projects.length})
                </button>
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    project={proj}
                    onSelectProject={(id) => setSelectedProjectId(id)}
                    onEditProject={handleOpenEditProject}
                    onStatusChange={(id, nextStatus) =>
                      updateProject(id, { status: nextStatus })
                    }
                  />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="py-12 sm:py-16 text-center rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white p-6 sm:p-10 shadow-xs space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E8EEE8] flex items-center justify-center text-[#193B35]">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-base font-bold text-[#16332C]">
                    {projects.length === 0
                      ? "No projects established yet"
                      : "No projects in this category"}
                  </p>
                  <p className="text-xs text-[#5F756C] max-w-sm mx-auto mt-1 leading-relaxed">
                    {projects.length === 0
                      ? "Create your first project workspace to turn your long-term ambitions into concrete milestones and daily task commitments."
                      : "Switch tabs above or create a new project workspace to track your progress."}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleOpenNewProject}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#193B35] text-white hover:opacity-90 transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Project
                  </button>

                  {isLocalPreview && projects.length === 0 && (
                    <button
                      onClick={resetPreviewData}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E4E8E1] bg-[#FAFAF6] text-[#193B35] hover:bg-[#E8EEE8] transition active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#426B5C]" />
                      Load Starter Goals
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Creation & Edit Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projectToEdit={projectToEdit}
        onSubmit={handleProjectModalSubmit}
      />

      {/* Milestone Creation & Edit Modal */}
      {selectedProject && (
        <MilestoneModal
          isOpen={isMilestoneModalOpen}
          onClose={() => setIsMilestoneModalOpen(false)}
          milestoneToEdit={milestoneToEdit}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onSubmit={handleMilestoneModalSubmit}
        />
      )}

      {/* Task Creation Modal (for adding tasks inside project view) */}
      {selectedProject && (
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          projects={projects}
          onCreateTask={async (payload) => {
            return await createTaskForProject({
              project_id: selectedProject.id,
              title: payload.title,
              description: payload.description,
              due_date: payload.due_date,
              estimated_hours: payload.estimated_hours,
              priority: payload.priority,
            });
          }}
          onCreateProject={async (payload) => {
            return await createProject(payload);
          }}
        />
      )}

      {/* Risk Analysis Modal */}
      <RiskDetailsModal
        task={selectedRiskTask}
        onClose={() => setSelectedRiskTask(null)}
      />

      {/* Destructive Action Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        message={deleteModalState.message}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModalState.action}
      />
    </WorkspaceLayout>
  );
}
