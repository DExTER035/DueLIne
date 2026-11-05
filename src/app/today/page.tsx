"use client";

/**
 * /today/page.tsx - DueLine Stage 2C.2 Live Today Dashboard matching Visual Reference Mockup.
 *
 * Implements the complete daily execution workspace:
 * - Editorial greeting & desktop action cluster (WelcomeHeader)
 * - 6-Card Dashboard Matrix matching visual mockup:
 *   1. Today's Priorities (interactive checklist with completion counter and priority flags)
 *   2. Focus Session (misty coniferous forest background with large 25:00 countdown and presets)
 *   3. Chapters (time capsules: Sealed "A Letter to Future Me" & Unlocked "One Year From Now")
 *   4. Your Goals (active goals list with progress bars and counters)
 *   5. Daily Reflection (strictly private reflection note)
 *   6. Today's Progress (60% progress bar and metric chips)
 * - Real Supabase authenticated data when available with deterministic risk intelligence.
 * - Responsive 1440px desktop (2-column balanced grid) and 390px mobile (priority-ordered stack).
 */

import React, { useState, useCallback } from "react";
import { AlertCircle, Info, RefreshCw } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { FocusSection } from "@/components/dashboard/focus-section";
import { TodayActions } from "@/components/dashboard/today-actions";
import { ActiveGoalCard } from "@/components/dashboard/active-goal-card";
import { ChaptersWidget } from "@/components/dashboard/chapters-widget";
import { DailyReflectionCard } from "@/components/dashboard/daily-reflection-card";
import { TodaysProgressCard } from "@/components/dashboard/todays-progress-card";
import { RiskDetailsModal } from "@/components/dashboard/risk-details-modal";
import { CreateTaskModal } from "@/components/dashboard/create-task-modal";
import { useTodayDashboard, type TaskWithRisk } from "@/hooks/use-today-dashboard";
import { useFocusTimer } from "@/hooks/use-focus-timer";

export default function TodayPage() {
  const {
    user,
    profile,
    projects,
    tasks,
    summaryMetrics,
    activeGoal,
    error,
    isLocalPreview,
    refreshDashboard,
    mutatingTaskIds,
    toggleTaskStatus,
    createTask,
    createProject,
  } = useTodayDashboard();

  const focusTimer = useFocusTimer();

  // Modals state
  const [selectedRiskTask, setSelectedRiskTask] = useState<TaskWithRisk | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [localTaskCounts, setLocalTaskCounts] = useState<{ completed: number; total: number } | null>(null);

  const handleCountsChange = useCallback((completed: number, total: number) => {
    setLocalTaskCounts((prev) => {
      if (prev && prev.completed === completed && prev.total === total) return prev;
      return { completed, total };
    });
  }, []);

  // Authenticated display name
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    (user?.email ? user.email.split("@")[0] : "Alex");

  const handleSelectFocusTask = (task: TaskWithRisk) => {
    focusTimer.selectTask(task, task.projectName);
  };

  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <WorkspaceLayout>
      <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
        {/* Global Error Banner if any */}
        {error && (
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50/80 text-xs text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button
              onClick={refreshDashboard}
              className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Subtle Preview Mode Indicator */}
        {isLocalPreview && (
          <div className="flex items-center text-xs px-1 text-[var(--text-muted)] gap-1.5 -mt-2">
            <Info className="w-3.5 h-3.5 text-[var(--brand-accent)] shrink-0" />
            <span>Preview Mode: Interactive local priorities &amp; focus sessions active.</span>
          </div>
        )}

        {/* A. Editorial Welcome Header & Desktop Controls Cluster */}
        <WelcomeHeader
          displayName={displayName}
          onNewTaskClick={() => setIsCreateTaskOpen(true)}
          onOpenSearch={() => setIsCreateTaskOpen(true)}
        />

        {/* B. Core Matrix: 2-Column Responsive Layout matching Visual Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Card 1: Today's Priorities (Mobile: 1st, Desktop: Left Col Top) */}
          <div className="order-1 lg:order-none lg:col-span-7 min-w-0">
            <TodayActions
              tasks={tasks}
              mutatingTaskIds={mutatingTaskIds}
              onToggleTaskStatus={toggleTaskStatus}
              onSelectFocusTask={handleSelectFocusTask}
              onOpenRiskModal={(task) => setSelectedRiskTask(task)}
              onNewTaskClick={() => setIsCreateTaskOpen(true)}
              onCountsChange={handleCountsChange}
              isLocalPreview={isLocalPreview}
            />
          </div>

          {/* Card 2: Focus Session (Mobile: 2nd, Desktop: Right Col Top) */}
          <div className="order-2 lg:order-none lg:col-span-5 min-w-0">
            <FocusSection timer={focusTimer} />
          </div>

          {/* Card 3 on Desktop (Left Col Middle), Card 4 on Mobile: Your Goals */}
          <div className="order-4 lg:order-none lg:col-span-7 min-w-0">
            <ActiveGoalCard
              activeGoal={activeGoal}
              projects={projects}
              onNewProjectClick={() => setIsCreateTaskOpen(true)}
              isLocalPreview={isLocalPreview}
            />
          </div>

          {/* Card 4 on Desktop (Right Col Middle), Card 3 on Mobile: Chapters Widget */}
          <div className="order-3 lg:order-none lg:col-span-5 min-w-0">
            <ChaptersWidget />
          </div>

          {/* Card 5: Daily Reflection (Mobile: 5th, Desktop: Left Col Bottom) */}
          <div className="order-5 lg:order-none lg:col-span-7 min-w-0">
            <DailyReflectionCard />
          </div>

          {/* Card 6: Today's Progress (Mobile: 6th, Desktop: Right Col Bottom) */}
          <div className="order-6 lg:order-none lg:col-span-5 min-w-0">
            <TodaysProgressCard
              metrics={summaryMetrics}
              tasksCompleted={tasks.length > 0 ? completedTasksCount : localTaskCounts?.completed}
              tasksTotal={tasks.length > 0 ? tasks.length : localTaskCounts?.total}
            />
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        projects={projects}
        onCreateTask={createTask}
        onCreateProject={createProject}
      />

      {/* Deterministic Risk Breakdown Modal */}
      <RiskDetailsModal
        task={selectedRiskTask}
        onClose={() => setSelectedRiskTask(null)}
      />
    </WorkspaceLayout>
  );
}
