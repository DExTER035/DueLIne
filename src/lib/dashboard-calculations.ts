/**
 * dashboard-calculations.ts - Deterministic Dashboard Metrics & Risk Aggregations.
 *
 * Implements pure, deterministic data calculation logic for DueLine's Today dashboard:
 * - Summary metric counts (Active Projects, Total Tasks, Upcoming Deadlines, High-Risk Tasks)
 * - Deterministic risk evaluation using the authoritative src/lib/risk.ts engine
 * - Weekly progress aggregation (tasks completed in last 7 days, active days)
 * - Project completion percentage and milestone progression
 *
 * Zero React dependencies, zero network side-effects. 100% unit-testable.
 */

import {
  determineTaskStatus,
  getRiskExplanation,
  parseDeadline,
  type RiskStatus,
} from "./risk.ts";
import type { Database } from "./supabase/database.types.ts";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"];
export type TaskEvent = Database["public"]["Tables"]["task_events"]["Row"];

export type TimelineEventType =
  | "milestone_achieved"
  | "task_completed"
  | "task_uncompleted"
  | "task_created";

export type EvidenceTier = "achievement" | "evidence" | "activity";

export interface TimelineItem {
  id: string;
  timestamp: string;
  dateGroup: string;
  type: TimelineEventType;
  tier: EvidenceTier;
  title: string;
  projectName?: string;
  note?: string;
  meta?: Record<string, unknown>;
}

export interface ProgressOverviewResult {
  totalCompletedTasks: number;
  completedMilestones: number;
  activeProjects: number;
  totalActiveDays: number;
  recentAccomplishment: string | null;
}

export interface PeriodReviewResult {
  period: "week" | "month";
  periodLabel: string;
  tasksCompletedCount: number;
  milestonesAchievedCount: number;
  activeDaysCount: number;
  projectsProgressedCount: number;
  accomplishments: Array<{
    id: string;
    type: "milestone" | "task";
    title: string;
    projectName?: string;
    completedAt: string;
  }>;
  factualSummary: string;
}

export interface TaskRiskAssessment {
  status: RiskStatus;
  explanation: string;
  remainingDays: number | null;
  availableHours: number | null;
  estimatedHours: number;
  isHighRisk: boolean;
  isOverdue: boolean;
  isCompleted: boolean;
}

export interface SummaryMetricsResult {
  activeProjectsCount: number;
  totalTasksCount: number;
  completedTasksCount: number;
  upcomingDeadlinesCount: number;
  highRiskTasksCount: number;
  overdueTasksCount: number;
}

export interface WeeklyProgressResult {
  completedThisWeek: number;
  activeDaysCount: number;
  periodLabel: string;
}

export interface ProjectProgressResult {
  completedTasks: number;
  totalTasks: number;
  taskPercentage: number;
  percentage: number;
  currentMilestone: Milestone | null;
  milestonesAchieved: number;
  totalMilestones: number;
  milestonePercentage: number;
}

export interface GoalsSummaryMetrics {
  activeProjectsCount: number;
  completedProjectsCount: number;
  totalMilestonesCount: number;
  upcomingMilestonesCount: number;
}

/**
 * Returns a UTC midnight Date object for consistent calendar arithmetic.
 */
export function getNormalizedUtcDate(date?: Date | string | null): Date {
  if (date instanceof Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  if (typeof date === "string") {
    const parsed = parseDeadline(date);
    if (parsed) return parsed;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Formats a Date object to 'YYYY-MM-DD' UTC string.
 */
export function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Evaluates risk and workload status for a single task using src/lib/risk.ts.
 */
export function assessTaskRisk(task: Task, referenceDate?: Date | string | null): TaskRiskAssessment {
  const isCompleted = task.status === "completed";
  const refDate = getNormalizedUtcDate(referenceDate);
  const status = determineTaskStatus(
    isCompleted,
    task.due_date,
    task.estimated_hours,
    undefined,
    refDate
  );

  let remainingDays: number | null = null;
  let availableHours: number | null = null;

  if (task.due_date) {
    const deadlineDate = parseDeadline(task.due_date);
    if (deadlineDate) {
      const diffMs = deadlineDate.getTime() - refDate.getTime();
      remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      availableHours = Math.max(0, remainingDays * 8.0);
    }
  }

  return {
    status,
    explanation: getRiskExplanation(status),
    remainingDays,
    availableHours,
    estimatedHours: Number(task.estimated_hours) || 0,
    isHighRisk: status === "HIGH",
    isOverdue: status === "OVERDUE",
    isCompleted,
  };
}

/**
 * Counts active projects (status === 'active').
 */
export function countActiveProjects(projects: Project[]): number {
  return projects.filter((p) => p.status === "active").length;
}

/**
 * Counts total tasks, with active and completed breakdown.
 */
export function countTasks(tasks: Task[]): { total: number; active: number; completed: number } {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const active = total - completed;
  return { total, active, completed };
}

/**
 * Counts uncompleted tasks with due dates within [today, today + daysAhead days].
 * Default window is 7 days.
 */
export function countUpcomingDeadlines(
  tasks: Task[],
  referenceDate?: Date | string | null,
  daysAhead = 7
): number {
  const refDate = getNormalizedUtcDate(referenceDate);
  const refTime = refDate.getTime();
  const maxTime = refTime + daysAhead * 24 * 60 * 60 * 1000;

  return tasks.filter((t) => {
    if (t.status === "completed" || !t.due_date) {
      return false;
    }
    const deadline = parseDeadline(t.due_date);
    if (!deadline) {
      return false;
    }
    const dTime = deadline.getTime();
    return dTime >= refTime && dTime <= maxTime;
  }).length;
}

/**
 * Counts uncompleted tasks classified as HIGH risk by determineTaskStatus.
 */
export function countHighRiskTasks(tasks: Task[], referenceDate?: Date | string | null): number {
  return tasks.filter((t) => {
    if (t.status === "completed") return false;
    const assessment = assessTaskRisk(t, referenceDate);
    return assessment.isHighRisk;
  }).length;
}

/**
 * Counts uncompleted tasks that are OVERDUE (deadline < referenceDate).
 */
export function countOverdueTasks(tasks: Task[], referenceDate?: Date | string | null): number {
  return tasks.filter((t) => {
    if (t.status === "completed") return false;
    const assessment = assessTaskRisk(t, referenceDate);
    return assessment.isOverdue;
  }).length;
}

/**
 * Aggregates all 4 core summary metrics for the Today dashboard.
 */
export function calculateSummaryMetrics(
  projects: Project[],
  tasks: Task[],
  referenceDate?: Date | string | null
): SummaryMetricsResult {
  const activeProjectsCount = countActiveProjects(projects);
  const { total, completed } = countTasks(tasks);
  const upcomingDeadlinesCount = countUpcomingDeadlines(tasks, referenceDate, 7);
  const highRiskTasksCount = countHighRiskTasks(tasks, referenceDate);
  const overdueTasksCount = countOverdueTasks(tasks, referenceDate);

  return {
    activeProjectsCount,
    totalTasksCount: total,
    completedTasksCount: completed,
    upcomingDeadlinesCount,
    highRiskTasksCount,
    overdueTasksCount,
  };
}

/**
 * Aggregates weekly activity:
 * - Completed tasks within the last 7 calendar days
 * - Distinct active days with completions
 */
export function calculateWeeklyProgress(
  tasks: Task[],
  referenceDate?: Date | string | null
): WeeklyProgressResult {
  const refDate = getNormalizedUtcDate(referenceDate);
  const sevenDaysAgoTime = refDate.getTime() - 7 * 24 * 60 * 60 * 1000;

  const completedRecent = tasks.filter((t) => {
    if (t.status !== "completed") return false;
    // Prefer completed_at timestamp, fallback to updated_at
    const timestampStr = t.completed_at || t.updated_at;
    if (!timestampStr) return false;
    const compTime = new Date(timestampStr).getTime();
    return !Number.isNaN(compTime) && compTime >= sevenDaysAgoTime;
  });

  const activeDaysSet = new Set<string>();
  for (const t of completedRecent) {
    const ts = t.completed_at || t.updated_at;
    if (ts) {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        activeDaysSet.add(d.toISOString().slice(0, 10));
      }
    }
  }

  return {
    completedThisWeek: completedRecent.length,
    activeDaysCount: activeDaysSet.size,
    periodLabel: "Last 7 days",
  };
}

/**
 * Calculates project completion percentage and current milestone.
 */
export function calculateProjectProgress(
  projectId: string,
  tasks: Task[],
  milestones: Milestone[] = []
): ProjectProgressResult {
  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.status === "completed").length;

  const projectMilestones = milestones.filter((m) => m.project_id === projectId);
  const totalMilestones = projectMilestones.length;
  const milestonesAchieved = projectMilestones.filter((m) => m.status === "achieved").length;

  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const milestonePercentage = totalMilestones > 0 ? Math.round((milestonesAchieved / totalMilestones) * 100) : 0;

  // Primary percentage: defaults to task completion if tasks exist, otherwise milestone completion
  let percentage = 0;
  if (totalTasks > 0) {
    percentage = taskPercentage;
  } else if (totalMilestones > 0) {
    percentage = milestonePercentage;
  }

  // Next pending milestone ordered by target_date
  const pendingMilestones = projectMilestones
    .filter((m) => m.status === "pending")
    .sort((a, b) => {
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return a.target_date.localeCompare(b.target_date);
    });

  const currentMilestone = pendingMilestones[0] || null;

  return {
    completedTasks,
    totalTasks,
    taskPercentage,
    percentage,
    currentMilestone,
    milestonesAchieved,
    totalMilestones,
    milestonePercentage,
  };
}

/**
 * Counts unachieved milestones with target dates within [today, today + daysAhead].
 */
export function countUpcomingMilestones(
  milestones: Milestone[],
  referenceDate?: Date | string | null,
  daysAhead = 14
): number {
  const refDate = getNormalizedUtcDate(referenceDate);
  const refTime = refDate.getTime();
  const maxTime = refTime + daysAhead * 24 * 60 * 60 * 1000;

  return milestones.filter((m) => {
    if (m.status === "achieved" || !m.target_date) return false;
    const deadline = parseDeadline(m.target_date);
    if (!deadline) return false;
    const dTime = deadline.getTime();
    return dTime >= refTime && dTime <= maxTime;
  }).length;
}

/**
 * Aggregates summary figures for the Goals workspace.
 */
export function calculateGoalsSummaryMetrics(
  projects: Project[],
  milestones: Milestone[],
  referenceDate?: Date | string | null
): GoalsSummaryMetrics {
  const activeProjectsCount = projects.filter((p) => p.status === "active").length;
  const completedProjectsCount = projects.filter((p) => p.status === "completed").length;
  const totalMilestonesCount = milestones.length;
  const upcomingMilestonesCount = countUpcomingMilestones(milestones, referenceDate, 14);

  return {
    activeProjectsCount,
    completedProjectsCount,
    totalMilestonesCount,
    upcomingMilestonesCount,
  };
}

/**
 * Returns a human-friendly date group label ('Today', 'Yesterday', or 'MMM D, YYYY').
 */
export function formatDateGroup(
  timestamp: string,
  referenceDate?: Date | string | null
): string {
  const refDate = getNormalizedUtcDate(referenceDate);
  const eventDate = new Date(timestamp);
  if (Number.isNaN(eventDate.getTime())) return "Past Activity";

  const eventIso = formatIsoDate(
    new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()))
  );
  const refIso = formatIsoDate(refDate);

  if (eventIso === refIso) {
    return "Today";
  }

  const yesterdayDate = new Date(refDate.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayIso = formatIsoDate(yesterdayDate);
  if (eventIso === yesterdayIso) {
    return "Yesterday";
  }

  return eventDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Unifies task_events and achieved milestones into a chronological evidence timeline.
 * Sorted newest first, grouped by date.
 */
export function buildEvidenceTimeline(
  taskEvents: TaskEvent[],
  tasks: Task[],
  milestones: Milestone[],
  projects: Project[],
  referenceDate?: Date | string | null
): TimelineItem[] {
  const projectMap = new Map<string, string>();
  for (const p of projects) {
    projectMap.set(p.id, p.name);
  }

  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const items: TimelineItem[] = [];

  // 1. Process Task Events
  for (const ev of taskEvents) {
    const task = taskMap.get(ev.task_id);
    const projectName = task ? projectMap.get(task.project_id) : undefined;
    const eventData = (ev.event_data as Record<string, unknown>) || {};
    const taskTitle = task?.title || (typeof eventData.title === "string" ? eventData.title : "Task");

    let type: TimelineEventType = "task_completed";
    let tier: EvidenceTier = "evidence";
    let note = "Verified task completion";

    if (ev.event_type === "completed") {
      type = "task_completed";
      tier = "evidence";
      note = "Verified task completion";
    } else if (ev.event_type === "uncompleted") {
      type = "task_uncompleted";
      tier = "activity";
      note = "Task returned to active execution";
    } else if (ev.event_type === "created") {
      type = "task_created";
      tier = "activity";
      note = "Task added to workload";
    } else {
      // Ignore internal property adjustments from cluttering personal evidence timeline
      continue;
    }

    items.push({
      id: ev.id,
      timestamp: ev.created_at,
      dateGroup: formatDateGroup(ev.created_at, referenceDate),
      type,
      tier,
      title: taskTitle,
      projectName,
      note,
      meta: eventData,
    });
  }

  // 2. Process Achieved Milestones as Achievements
  for (const m of milestones) {
    if (m.status !== "achieved") continue;

    const projectName = projectMap.get(m.project_id);
    const milestoneTimestamp = m.updated_at || m.created_at;

    items.push({
      id: `ms-${m.id}`,
      timestamp: milestoneTimestamp,
      dateGroup: formatDateGroup(milestoneTimestamp, referenceDate),
      type: "milestone_achieved",
      tier: "achievement",
      title: m.title,
      projectName,
      note: m.description || "Project checkpoint achieved",
    });
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items;
}

/**
 * Calculates high-level progress overview figures for the Journey view.
 */
export function calculateProgressOverview(
  tasks: Task[],
  milestones: Milestone[],
  projects: Project[]
): ProgressOverviewResult {
  const totalCompletedTasks = tasks.filter((t) => t.status === "completed").length;
  const completedMilestones = milestones.filter((m) => m.status === "achieved").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  // Compute distinct active execution days across completions and milestones
  const activeDaysSet = new Set<string>();
  for (const t of tasks) {
    if (t.status === "completed") {
      const ts = t.completed_at || t.updated_at;
      if (ts) activeDaysSet.add(new Date(ts).toISOString().slice(0, 10));
    }
  }
  for (const m of milestones) {
    if (m.status === "achieved") {
      const ts = m.updated_at || m.created_at;
      if (ts) activeDaysSet.add(new Date(ts).toISOString().slice(0, 10));
    }
  }

  // Determine recent accomplishment
  let recentAccomplishment: string | null = null;
  const achievedMilestones = milestones
    .filter((m) => m.status === "achieved")
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  if (achievedMilestones.length > 0) {
    recentAccomplishment = `Milestone: ${achievedMilestones[0].title}`;
  } else {
    const completedTasksList = tasks
      .filter((t) => t.status === "completed")
      .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime());
    if (completedTasksList.length > 0) {
      recentAccomplishment = completedTasksList[0].title;
    }
  }

  return {
    totalCompletedTasks,
    completedMilestones,
    activeProjects,
    totalActiveDays: activeDaysSet.size,
    recentAccomplishment,
  };
}

/**
 * Computes weekly or monthly review metrics strictly derived from real records.
 */
export function calculatePeriodReview(
  period: "week" | "month",
  tasks: Task[],
  milestones: Milestone[],
  projects: Project[],
  referenceDate?: Date | string | null
): PeriodReviewResult {
  const refDate = getNormalizedUtcDate(referenceDate);
  const projectMap = new Map<string, string>();
  for (const p of projects) {
    projectMap.set(p.id, p.name);
  }

  let startTimeMs = 0;
  let endTimeMs = refDate.getTime() + 24 * 60 * 60 * 1000 - 1; // End of reference day
  let periodLabel = "";

  if (period === "week") {
    // 7 days prior up to reference date
    startTimeMs = refDate.getTime() - 6 * 24 * 60 * 60 * 1000;
    const startObj = new Date(startTimeMs);
    const endObj = refDate;
    periodLabel = `Last 7 Days (${startObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${endObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })})`;
  } else {
    // Start of the calendar month of referenceDate
    const startOfMonth = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), 1));
    startTimeMs = startOfMonth.getTime();
    const endOfMonth = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() + 1, 0, 23, 59, 59));
    endTimeMs = endOfMonth.getTime();
    periodLabel = startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  }

  // Filter tasks completed in window
  const tasksInWindow = tasks.filter((t) => {
    if (t.status !== "completed") return false;
    const ts = t.completed_at || t.updated_at;
    if (!ts) return false;
    const time = new Date(ts).getTime();
    return time >= startTimeMs && time <= endTimeMs;
  });

  // Filter milestones achieved in window
  const milestonesInWindow = milestones.filter((m) => {
    if (m.status !== "achieved") return false;
    const ts = m.updated_at || m.created_at;
    if (!ts) return false;
    const time = new Date(ts).getTime();
    return time >= startTimeMs && time <= endTimeMs;
  });

  // Distinct active days in window
  const activeDaysSet = new Set<string>();
  for (const t of tasksInWindow) {
    const ts = t.completed_at || t.updated_at;
    if (ts) activeDaysSet.add(new Date(ts).toISOString().slice(0, 10));
  }
  for (const m of milestonesInWindow) {
    const ts = m.updated_at || m.created_at;
    if (ts) activeDaysSet.add(new Date(ts).toISOString().slice(0, 10));
  }

  // Distinct projects progressed
  const projectsSet = new Set<string>();
  for (const t of tasksInWindow) {
    if (t.project_id) projectsSet.add(t.project_id);
  }
  for (const m of milestonesInWindow) {
    if (m.project_id) projectsSet.add(m.project_id);
  }

  // Accomplishments list (milestones first, then tasks)
  const accomplishments: PeriodReviewResult["accomplishments"] = [];

  for (const m of milestonesInWindow) {
    accomplishments.push({
      id: m.id,
      type: "milestone",
      title: m.title,
      projectName: projectMap.get(m.project_id),
      completedAt: m.updated_at || m.created_at,
    });
  }

  for (const t of tasksInWindow) {
    accomplishments.push({
      id: t.id,
      type: "task",
      title: t.title,
      projectName: projectMap.get(t.project_id),
      completedAt: t.completed_at || t.updated_at,
    });
  }

  // Honest factual summary sentence
  const taskCount = tasksInWindow.length;
  const milestoneCount = milestonesInWindow.length;
  const projCount = projectsSet.size;
  const daysCount = activeDaysSet.size;

  let factualSummary = `In this ${period}, you completed ${taskCount} task${taskCount === 1 ? "" : "s"} and reached ${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"} across ${projCount} project workspace${projCount === 1 ? "" : "s"} over ${daysCount} active execution day${daysCount === 1 ? "" : "s"}.`;

  if (taskCount === 0 && milestoneCount === 0) {
    factualSummary = `No task or milestone completions were recorded during this ${period}.`;
  }

  return {
    period,
    periodLabel,
    tasksCompletedCount: taskCount,
    milestonesAchievedCount: milestoneCount,
    activeDaysCount: daysCount,
    projectsProgressedCount: projCount,
    accomplishments,
    factualSummary,
  };
}

// =========================================================================
// 7. STAGE 2C.5: CHAPTERS (FUTURE-SELF COMMUNICATION SYSTEM)
// =========================================================================

export type ChapterCategory =
  | "reflection"
  | "milestone"
  | "mindset"
  | "commitment"
  | "letter";

export type ChapterStatus = "sealed" | "ready_to_unlock" | "past";

export interface Chapter {
  id: string;
  owner_id: string;
  title: string;
  category: ChapterCategory;
  unlock_at: string; // ISO 8601 UTC
  reflection: string | null;
  reflection_recorded_at: string | null;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChapterMessage {
  chapter_id: string;
  owner_id: string;
  message: string;
  created_at: string;
}

export interface ChapterWithPayload extends Chapter {
  message?: string | null;
}

export interface ChapterSectionsResult {
  sealed: Chapter[];
  readyToUnlock: Chapter[];
  past: Chapter[];
  nextScheduledUnlock: {
    chapter: Chapter | null;
    remainingDays: number | null;
    remainingHours: number | null;
    formattedTimeRemaining: string | null;
  };
}

/**
 * Determines the authoritative status of a Chapter relative to a reference timestamp.
 * - 'past': Unlocked and opened / acknowledged by the user.
 * - 'ready_to_unlock': unlock_at has arrived or passed, awaiting reveal.
 * - 'sealed': Scheduled in the future (unlock_at > now).
 */
export function getChapterStatus(
  chapter: Pick<Chapter, "unlock_at" | "unlocked_at">,
  referenceDate: Date = new Date()
): ChapterStatus {
  if (chapter.unlocked_at) {
    return "past";
  }

  const unlockTime = new Date(chapter.unlock_at).getTime();
  if (Number.isNaN(unlockTime)) {
    return "sealed";
  }

  if (referenceDate.getTime() >= unlockTime) {
    return "ready_to_unlock";
  }

  return "sealed";
}

/**
 * Combines local date (YYYY-MM-DD) and time (HH:MM) strings into a standard UTC ISO string.
 */
export function combineDateAndTimeToUtcIso(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  if (!year || !month || !day || isNaN(hours) || isNaN(minutes)) {
    return "";
  }

  // Create date using browser's local timezone
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(localDate.getTime())) {
    return "";
  }

  return localDate.toISOString();
}

/**
 * Validates Chapter creation input parameters before persistence.
 */
export function validateChapterCreation(
  input: {
    title: string;
    message: string;
    unlockAtIso: string;
    category?: string;
  },
  referenceDate: Date = new Date()
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const trimmedTitle = input.title ? input.title.trim() : "";
  if (trimmedTitle.length === 0) {
    errors.push("Chapter title is required.");
  } else if (trimmedTitle.length > 200) {
    errors.push("Chapter title must not exceed 200 characters.");
  }

  const trimmedMessage = input.message ? input.message.trim() : "";
  if (trimmedMessage.length === 0) {
    errors.push("Personal message to your future self is required.");
  } else if (trimmedMessage.length > 50000) {
    errors.push("Personal message must not exceed 50,000 characters.");
  }

  if (!input.unlockAtIso) {
    errors.push("Unlock date and time are required.");
  } else {
    const unlockTime = new Date(input.unlockAtIso).getTime();
    if (Number.isNaN(unlockTime)) {
      errors.push("Invalid unlock date and time format.");
    } else if (unlockTime <= referenceDate.getTime()) {
      errors.push("Unlock time must be in the future when creating a scheduled Chapter.");
    }
  }

  if (input.category) {
    const validCategories: ChapterCategory[] = [
      "reflection",
      "milestone",
      "mindset",
      "commitment",
      "letter",
    ];
    if (!validCategories.includes(input.category as ChapterCategory)) {
      errors.push(`Invalid category: ${input.category}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a present-day revisit reflection.
 */
export function validateChapterReflection(
  reflection: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmed = reflection ? reflection.trim() : "";

  if (trimmed.length === 0) {
    errors.push("Reflection note cannot be empty.");
  } else if (trimmed.length > 20000) {
    errors.push("Reflection note must not exceed 20,000 characters.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Categorizes an array of chapters into the 3 canonical workspace sections:
 * 1. Sealed Chapters
 * 2. Ready to Unlock Chapters
 * 3. Past Chapters
 *
 * Also computes the earliest upcoming unlock countdown.
 */
export function groupChapterSections(
  chapters: Chapter[],
  referenceDate: Date = new Date()
): ChapterSectionsResult {
  const sealed: Chapter[] = [];
  const readyToUnlock: Chapter[] = [];
  const past: Chapter[] = [];

  for (const ch of chapters) {
    const status = getChapterStatus(ch, referenceDate);
    if (status === "sealed") {
      sealed.push(ch);
    } else if (status === "ready_to_unlock") {
      readyToUnlock.push(ch);
    } else {
      past.push(ch);
    }
  }

  // Sort sealed ascending by unlock_at (earliest upcoming first)
  sealed.sort(
    (a, b) => new Date(a.unlock_at).getTime() - new Date(b.unlock_at).getTime()
  );

  // Sort readyToUnlock descending by unlock_at (most recently ready first)
  readyToUnlock.sort(
    (a, b) => new Date(b.unlock_at).getTime() - new Date(a.unlock_at).getTime()
  );

  // Sort past descending by unlocked_at, then updated_at
  past.sort((a, b) => {
    const timeA = new Date(a.unlocked_at || a.updated_at).getTime();
    const timeB = new Date(b.unlocked_at || b.updated_at).getTime();
    return timeB - timeA;
  });

  // Calculate Next Scheduled Unlock Spotlight
  const nextChapter = sealed.length > 0 ? sealed[0] : null;
  let remainingDays: number | null = null;
  let remainingHours: number | null = null;
  let formattedTimeRemaining: string | null = null;

  if (nextChapter) {
    const diffMs =
      new Date(nextChapter.unlock_at).getTime() - referenceDate.getTime();
    if (diffMs > 0) {
      remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      remainingHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (remainingDays > 1) {
        formattedTimeRemaining = `Unlocks in ${remainingDays} days`;
      } else if (remainingDays === 1) {
        formattedTimeRemaining = `Unlocks tomorrow`;
      } else if (remainingHours > 0) {
        formattedTimeRemaining = `Unlocks in ${remainingHours} hour${
          remainingHours === 1 ? "" : "s"
        }`;
      } else {
        formattedTimeRemaining = `Unlocks shortly`;
      }
    }
  }

  return {
    sealed,
    readyToUnlock,
    past,
    nextScheduledUnlock: {
      chapter: nextChapter,
      remainingDays,
      remainingHours,
      formattedTimeRemaining,
    },
  };
}
