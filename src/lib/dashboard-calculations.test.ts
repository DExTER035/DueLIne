/**
 * dashboard-calculations.test.ts - Unit Tests for Stage 2C.2 Dashboard Calculations.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assessTaskRisk,
  countActiveProjects,
  countTasks,
  countUpcomingDeadlines,
  countHighRiskTasks,
  countOverdueTasks,
  calculateSummaryMetrics,
  calculateWeeklyProgress,
  calculateProjectProgress,
  calculateGoalsSummaryMetrics,
  countUpcomingMilestones,
  formatDateGroup,
  buildEvidenceTimeline,
  calculateProgressOverview,
  calculatePeriodReview,
  getChapterStatus,
  combineDateAndTimeToUtcIso,
  validateChapterCreation,
  validateChapterReflection,
  groupChapterSections,
  type Chapter,
  type Project,
  type Task,
  type Milestone,
  type TaskEvent,
} from "./dashboard-calculations.ts";

const MOCK_USER_ID = "00000000-0000-4000-a000-000000000001";
const REF_DATE = "2026-11-05"; // Thursday

function makeMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    owner_id: MOCK_USER_ID,
    name: "DueLine Platform Core",
    description: "Personal and social productivity SaaS",
    status: "active",
    start_date: "2026-11-01",
    target_date: "2026-12-01",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

function makeMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    project_id: "proj-1",
    owner_id: MOCK_USER_ID,
    title: "Verify database constraints",
    description: "Check unique indexes and composite foreign keys",
    status: "todo",
    priority: "medium",
    due_date: "2026-11-06", // Tomorrow (1 day remaining = 8 avail hours)
    estimated_hours: 4,     // 4h needed vs 8h available -> LOW (avail >= 1.2 * est)
    completed_at: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

function makeMockMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "ms-1",
    project_id: "proj-1",
    owner_id: MOCK_USER_ID,
    title: "Alpha Milestone",
    description: "Core features functional",
    target_date: "2026-11-15",
    status: "pending",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

function makeMockTaskEvent(overrides: Partial<TaskEvent> = {}): TaskEvent {
  return {
    id: "ev-1",
    task_id: "task-1",
    owner_id: MOCK_USER_ID,
    event_type: "completed",
    event_data: { previous_status: "todo", new_status: "completed" },
    created_at: "2026-11-05T10:00:00Z",
    ...overrides,
  };
}

describe("Stage 2C.2: Dashboard Calculations & Metrics Engine", () => {
  describe("1. Summary Metrics & Counting Rules", () => {
    it("handles an empty user account with zero counts without crashing", () => {
      const metrics = calculateSummaryMetrics([], [], REF_DATE);
      assert.equal(metrics.activeProjectsCount, 0);
      assert.equal(metrics.totalTasksCount, 0);
      assert.equal(metrics.completedTasksCount, 0);
      assert.equal(metrics.upcomingDeadlinesCount, 0);
      assert.equal(metrics.highRiskTasksCount, 0);
      assert.equal(metrics.overdueTasksCount, 0);
    });

    it("counts only active projects, excluding archived, completed, or on_hold", () => {
      const projects: Project[] = [
        makeMockProject({ id: "p1", status: "active" }),
        makeMockProject({ id: "p2", status: "active" }),
        makeMockProject({ id: "p3", status: "completed" }),
        makeMockProject({ id: "p4", status: "archived" }),
        makeMockProject({ id: "p5", status: "on_hold" }),
      ];

      assert.equal(countActiveProjects(projects), 2);
    });

    it("correctly breaks down total, active, and completed tasks", () => {
      const tasks: Task[] = [
        makeMockTask({ id: "t1", status: "todo" }),
        makeMockTask({ id: "t2", status: "in_progress" }),
        makeMockTask({ id: "t3", status: "blocked" }),
        makeMockTask({ id: "t4", status: "completed" }),
        makeMockTask({ id: "t5", status: "completed" }),
      ];

      const counts = countTasks(tasks);
      assert.equal(counts.total, 5);
      assert.equal(counts.active, 3);
      assert.equal(counts.completed, 2);
    });

    it("counts upcoming deadlines strictly within the next 7 days [today, today + 7d]", () => {
      const tasks: Task[] = [
        makeMockTask({ id: "t1", due_date: "2026-11-05", status: "todo" }),        // Today (+0d) -> YES
        makeMockTask({ id: "t2", due_date: "2026-11-06", status: "todo" }),        // Tomorrow (+1d) -> YES
        makeMockTask({ id: "t3", due_date: "2026-11-12", status: "in_progress" }), // Exactly +7d -> YES
        makeMockTask({ id: "t4", due_date: "2026-11-13", status: "todo" }),        // +8d -> NO (beyond window)
        makeMockTask({ id: "t5", due_date: "2026-11-04", status: "todo" }),        // Yesterday (-1d) -> NO (overdue)
        makeMockTask({ id: "t6", due_date: "2026-11-07", status: "completed" }),   // Completed -> NO (excluded)
        makeMockTask({ id: "t7", due_date: null, status: "todo" }),                 // No deadline -> NO
      ];

      assert.equal(countUpcomingDeadlines(tasks, REF_DATE, 7), 3);
    });
  });

  describe("2. Deterministic Risk Engine Integration", () => {
    it("classifies tasks as HIGH risk when available hours < estimated hours", () => {
      // REF_DATE is 2026-11-05. Due tomorrow (2026-11-06) gives 1 day * 8h = 8h available.
      // If estimated hours = 10, avail (8) < est (10) -> HIGH
      const highRiskTask = makeMockTask({
        id: "t-high",
        due_date: "2026-11-06",
        estimated_hours: 10,
        status: "todo",
      });

      const assessment = assessTaskRisk(highRiskTask, REF_DATE);
      assert.equal(assessment.status, "HIGH");
      assert.equal(assessment.isHighRisk, true);
      assert.equal(assessment.isOverdue, false);
      assert.equal(assessment.remainingDays, 1);
      assert.equal(assessment.availableHours, 8);
      assert.ok(assessment.explanation.includes("High risk"));
    });

    it("classifies tasks as MEDIUM risk when available hours cover the work but buffer < 20%", () => {
      // 1 day remaining = 8h available. Estimated = 7h.
      // 8h >= 7h, but 8h < 1.2 * 7h (8.4h) -> MEDIUM
      const mediumRiskTask = makeMockTask({
        id: "t-med",
        due_date: "2026-11-06",
        estimated_hours: 7,
        status: "todo",
      });

      const assessment = assessTaskRisk(mediumRiskTask, REF_DATE);
      assert.equal(assessment.status, "MEDIUM");
      assert.equal(assessment.isHighRisk, false);
      assert.equal(assessment.isOverdue, false);
    });

    it("classifies tasks as LOW risk when available hours exceed 1.2 * estimated hours", () => {
      // 2 days remaining (2026-11-07) = 16h available. Estimated = 5h.
      // 16h >= 1.2 * 5h (6h) -> LOW
      const lowRiskTask = makeMockTask({
        id: "t-low",
        due_date: "2026-11-07",
        estimated_hours: 5,
        status: "todo",
      });

      const assessment = assessTaskRisk(lowRiskTask, REF_DATE);
      assert.equal(assessment.status, "LOW");
      assert.equal(assessment.isHighRisk, false);
    });

    it("distinguishes OVERDUE tasks from future high-risk tasks", () => {
      const overdueTask = makeMockTask({
        id: "t-overdue",
        due_date: "2026-11-04", // Yesterday
        status: "todo",
      });

      const assessment = assessTaskRisk(overdueTask, REF_DATE);
      assert.equal(assessment.status, "OVERDUE");
      assert.equal(assessment.isOverdue, true);
      assert.equal(assessment.isHighRisk, false);

      const tasks = [overdueTask];
      assert.equal(countOverdueTasks(tasks, REF_DATE), 1);
      assert.equal(countHighRiskTasks(tasks, REF_DATE), 0);
    });

    it("does NOT classify completed tasks as active risks or overdue", () => {
      const completedTask = makeMockTask({
        id: "t-done",
        due_date: "2026-11-04", // Passed date
        estimated_hours: 20,    // High hours
        status: "completed",
        completed_at: "2026-11-04T12:00:00Z",
      });

      const assessment = assessTaskRisk(completedTask, REF_DATE);
      assert.equal(assessment.status, "COMPLETED");
      assert.equal(assessment.isHighRisk, false);
      assert.equal(assessment.isOverdue, false);
      assert.equal(assessment.isCompleted, true);

      assert.equal(countHighRiskTasks([completedTask], REF_DATE), 0);
      assert.equal(countOverdueTasks([completedTask], REF_DATE), 0);
    });

    it("handles tasks with missing or null deadlines gracefully as INVALID", () => {
      const noDateTask = makeMockTask({
        id: "t-nodate",
        due_date: null,
        status: "todo",
      });

      const assessment = assessTaskRisk(noDateTask, REF_DATE);
      assert.equal(assessment.status, "INVALID");
      assert.equal(assessment.isHighRisk, false);
      assert.equal(assessment.isOverdue, false);
      assert.equal(assessment.remainingDays, null);
      assert.equal(assessment.availableHours, null);
    });
  });

  describe("3. Weekly Progress Aggregation", () => {
    it("aggregates completed tasks in the last 7 days and distinct active days", () => {
      const tasks: Task[] = [
        // Completed today (2026-11-05)
        makeMockTask({
          id: "t1",
          status: "completed",
          completed_at: "2026-11-05T10:00:00Z",
        }),
        makeMockTask({
          id: "t2",
          status: "completed",
          completed_at: "2026-11-05T14:30:00Z",
        }),
        // Completed 2 days ago (2026-11-03)
        makeMockTask({
          id: "t3",
          status: "completed",
          completed_at: "2026-11-03T09:00:00Z",
        }),
        // Completed 10 days ago (2026-10-26) -> outside 7 days
        makeMockTask({
          id: "t4",
          status: "completed",
          completed_at: "2026-10-26T12:00:00Z",
        }),
        // Not completed
        makeMockTask({
          id: "t5",
          status: "todo",
          completed_at: null,
        }),
      ];

      const progress = calculateWeeklyProgress(tasks, REF_DATE);
      assert.equal(progress.completedThisWeek, 3);
      assert.equal(progress.activeDaysCount, 2); // 2026-11-05 and 2026-11-03
    });
  });

  describe("4. Project Progress & Milestone Tracking", () => {
    it("calculates percentage accurately based on task completion ratio", () => {
      const tasks: Task[] = [
        makeMockTask({ id: "t1", project_id: "p1", status: "completed" }),
        makeMockTask({ id: "t2", project_id: "p1", status: "completed" }),
        makeMockTask({ id: "t3", project_id: "p1", status: "todo" }),
        makeMockTask({ id: "t4", project_id: "p1", status: "in_progress" }),
      ];

      const progress = calculateProjectProgress("p1", tasks, []);
      assert.equal(progress.totalTasks, 4);
      assert.equal(progress.completedTasks, 2);
      assert.equal(progress.percentage, 50);
    });

    it("identifies the next upcoming pending milestone by target date", () => {
      const milestones: Milestone[] = [
        makeMockMilestone({ id: "m1", status: "achieved", target_date: "2026-11-01" }),
        makeMockMilestone({ id: "m2", status: "pending", target_date: "2026-11-20" }),
        makeMockMilestone({ id: "m3", status: "pending", target_date: "2026-11-10" }), // earliest pending
      ];

      const progress = calculateProjectProgress("proj-1", [], milestones);
      assert.notEqual(progress.currentMilestone, null);
      assert.equal(progress.currentMilestone?.id, "m3");
      assert.equal(progress.milestonesAchieved, 1);
      assert.equal(progress.totalMilestones, 3);
      assert.equal(progress.milestonePercentage, 33);
    });

    it("handles an empty project with 0 tasks and 0 milestones without dividing by zero", () => {
      const progress = calculateProjectProgress("empty-proj", [], []);
      assert.equal(progress.totalTasks, 0);
      assert.equal(progress.completedTasks, 0);
      assert.equal(progress.taskPercentage, 0);
      assert.equal(progress.totalMilestones, 0);
      assert.equal(progress.milestonesAchieved, 0);
      assert.equal(progress.milestonePercentage, 0);
      assert.equal(progress.percentage, 0);
      assert.equal(progress.currentMilestone, null);
    });

    it("maintains distinct task completion and milestone completion percentages", () => {
      const tasks: Task[] = [
        makeMockTask({ id: "t1", project_id: "p1", status: "completed" }),
        makeMockTask({ id: "t2", project_id: "p1", status: "todo" }),
      ]; // 1/2 = 50%
      const milestones: Milestone[] = [
        makeMockMilestone({ id: "m1", project_id: "p1", status: "achieved" }),
        makeMockMilestone({ id: "m2", project_id: "p1", status: "achieved" }),
        makeMockMilestone({ id: "m3", project_id: "p1", status: "achieved" }),
        makeMockMilestone({ id: "m4", project_id: "p1", status: "pending" }),
      ]; // 3/4 = 75%

      const progress = calculateProjectProgress("p1", tasks, milestones);
      assert.equal(progress.taskPercentage, 50);
      assert.equal(progress.milestonePercentage, 75);
    });
  });

  describe("5. Goals Workspace Metrics Aggregation", () => {
    it("aggregates active projects, completed projects, and upcoming milestones", () => {
      const projects: Project[] = [
        makeMockProject({ id: "p1", status: "active" }),
        makeMockProject({ id: "p2", status: "active" }),
        makeMockProject({ id: "p3", status: "completed" }),
        makeMockProject({ id: "p4", status: "on_hold" }),
      ];

      const milestones: Milestone[] = [
        makeMockMilestone({ id: "m1", status: "pending", target_date: "2026-11-10" }), // in 5 days -> upcoming
        makeMockMilestone({ id: "m2", status: "pending", target_date: "2026-11-18" }), // in 13 days -> upcoming (<= 14d)
        makeMockMilestone({ id: "m3", status: "pending", target_date: "2026-11-30" }), // in 25 days -> not upcoming
        makeMockMilestone({ id: "m4", status: "achieved", target_date: "2026-11-06" }), // achieved -> not upcoming
      ];

      const metrics = calculateGoalsSummaryMetrics(projects, milestones, REF_DATE);
      assert.equal(metrics.activeProjectsCount, 2);
      assert.equal(metrics.completedProjectsCount, 1);
      assert.equal(metrics.totalMilestonesCount, 4);
      assert.equal(metrics.upcomingMilestonesCount, 2);
      assert.equal(countUpcomingMilestones(milestones, REF_DATE, 14), 2);
    });

    it("handles empty goals accounts gracefully", () => {
      const metrics = calculateGoalsSummaryMetrics([], [], REF_DATE);
      assert.equal(metrics.activeProjectsCount, 0);
      assert.equal(metrics.completedProjectsCount, 0);
      assert.equal(metrics.totalMilestonesCount, 0);
      assert.equal(metrics.upcomingMilestonesCount, 0);
    });
  });

  describe("6. Stage 2C.4: Journey & Evidence System", () => {
    it("formats date groups accurately relative to reference date", () => {
      assert.equal(formatDateGroup("2026-11-05T15:30:00Z", REF_DATE), "Today");
      assert.equal(formatDateGroup("2026-11-04T18:00:00Z", REF_DATE), "Yesterday");
      assert.equal(formatDateGroup("2026-11-02T12:00:00Z", REF_DATE), "Nov 2, 2026");
      assert.equal(formatDateGroup("invalid-date", REF_DATE), "Past Activity");
    });

    it("orders evidence timeline strictly chronological with newest first", () => {
      const task = makeMockTask({ id: "t1", title: "Audit Database" });
      const events: TaskEvent[] = [
        makeMockTaskEvent({ id: "e1", task_id: "t1", created_at: "2026-11-03T10:00:00Z" }),
        makeMockTaskEvent({ id: "e2", task_id: "t1", created_at: "2026-11-05T12:00:00Z" }),
        makeMockTaskEvent({ id: "e3", task_id: "t1", created_at: "2026-11-04T09:00:00Z" }),
      ];

      const timeline = buildEvidenceTimeline(events, [task], [], [], REF_DATE);
      assert.equal(timeline.length, 3);
      assert.equal(timeline[0].id, "e2"); // Nov 5
      assert.equal(timeline[1].id, "e3"); // Nov 4
      assert.equal(timeline[2].id, "e1"); // Nov 3
    });

    it("distinguishes achievements, evidence, and activity tiers correctly", () => {
      const project = makeMockProject({ id: "p1", name: "DueLine Platform" });
      const task = makeMockTask({ id: "t1", project_id: "p1", title: "Build RLS" });
      const milestone = makeMockMilestone({
        id: "m1",
        project_id: "p1",
        title: "Alpha Checkpoint",
        status: "achieved",
        updated_at: "2026-11-05T14:00:00Z",
      });

      const events: TaskEvent[] = [
        makeMockTaskEvent({ id: "e-comp", task_id: "t1", event_type: "completed", created_at: "2026-11-05T11:00:00Z" }),
        makeMockTaskEvent({ id: "e-reopen", task_id: "t1", event_type: "uncompleted", created_at: "2026-11-05T09:00:00Z" }),
        makeMockTaskEvent({ id: "e-create", task_id: "t1", event_type: "created", created_at: "2026-11-04T08:00:00Z" }),
      ];

      const timeline = buildEvidenceTimeline(events, [task], [milestone], [project], REF_DATE);
      assert.equal(timeline.length, 4);

      // Milestone reached = achievement
      const milestoneItem = timeline.find((i) => i.id === "ms-m1");
      assert.notEqual(milestoneItem, undefined);
      assert.equal(milestoneItem?.tier, "achievement");
      assert.equal(milestoneItem?.type, "milestone_achieved");
      assert.equal(milestoneItem?.projectName, "DueLine Platform");

      // Task completed = evidence
      const completedItem = timeline.find((i) => i.id === "e-comp");
      assert.notEqual(completedItem, undefined);
      assert.equal(completedItem?.tier, "evidence");
      assert.equal(completedItem?.type, "task_completed");

      // Reopened = activity
      const reopenedItem = timeline.find((i) => i.id === "e-reopen");
      assert.notEqual(reopenedItem, undefined);
      assert.equal(reopenedItem?.tier, "activity");
      assert.equal(reopenedItem?.type, "task_uncompleted");
    });

    it("handles empty timeline history without crashing", () => {
      const timeline = buildEvidenceTimeline([], [], [], [], REF_DATE);
      assert.deepEqual(timeline, []);

      const overview = calculateProgressOverview([], [], []);
      assert.equal(overview.totalCompletedTasks, 0);
      assert.equal(overview.completedMilestones, 0);
      assert.equal(overview.activeProjects, 0);
      assert.equal(overview.totalActiveDays, 0);
      assert.equal(overview.recentAccomplishment, null);
    });

    it("calculates weekly and monthly review metrics strictly from factual records", () => {
      const project = makeMockProject({ id: "p1", name: "DueLine Platform" });
      const tasks: Task[] = [
        makeMockTask({ id: "t1", project_id: "p1", status: "completed", completed_at: "2026-11-05T10:00:00Z" }), // In week & month
        makeMockTask({ id: "t2", project_id: "p1", status: "completed", completed_at: "2026-11-02T12:00:00Z" }), // In week & month
        makeMockTask({ id: "t3", project_id: "p1", status: "completed", completed_at: "2026-10-15T09:00:00Z" }), // Out of week & month
      ];
      const milestones: Milestone[] = [
        makeMockMilestone({ id: "m1", project_id: "p1", status: "achieved", updated_at: "2026-11-04T15:00:00Z" }),
      ];

      const weeklyReview = calculatePeriodReview("week", tasks, milestones, [project], REF_DATE);
      assert.equal(weeklyReview.tasksCompletedCount, 2);
      assert.equal(weeklyReview.milestonesAchievedCount, 1);
      assert.equal(weeklyReview.activeDaysCount, 3); // Nov 5, Nov 4, Nov 2
      assert.equal(weeklyReview.projectsProgressedCount, 1);
      assert.ok(weeklyReview.factualSummary.includes("completed 2 tasks and reached 1 milestone"));

      const monthlyReview = calculatePeriodReview("month", tasks, milestones, [project], REF_DATE);
      assert.equal(monthlyReview.tasksCompletedCount, 2);
      assert.equal(monthlyReview.milestonesAchievedCount, 1);
    });
  });

  describe("7. Stage 2C.5: Chapters (Future-Self Communication System)", () => {
    const REF_NOW = new Date("2026-11-05T12:00:00Z");

    function makeMockChapter(overrides: Partial<Chapter> = {}): Chapter {
      return {
        id: "ch-1",
        owner_id: MOCK_USER_ID,
        title: "Letter to Myself at Launch",
        category: "letter",
        unlock_at: "2027-01-01T00:00:00Z",
        reflection: null,
        reflection_recorded_at: null,
        unlocked_at: null,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
        ...overrides,
      };
    }

    it("evaluates Chapter status accurately based on unlock timestamp", () => {
      // 1. Future unlock_at -> sealed
      const sealedCh = makeMockChapter({ unlock_at: "2027-01-01T00:00:00Z", unlocked_at: null });
      assert.equal(getChapterStatus(sealedCh, REF_NOW), "sealed");

      // 2. Past unlock_at with no unlocked_at -> ready_to_unlock
      const readyCh = makeMockChapter({ unlock_at: "2026-11-04T00:00:00Z", unlocked_at: null });
      assert.equal(getChapterStatus(readyCh, REF_NOW), "ready_to_unlock");

      // 3. Any chapter with unlocked_at set -> past
      const pastCh = makeMockChapter({
        unlock_at: "2026-11-01T00:00:00Z",
        unlocked_at: "2026-11-02T10:00:00Z",
      });
      assert.equal(getChapterStatus(pastCh, REF_NOW), "past");
    });

    it("combines local date and time strings into valid UTC ISO format", () => {
      const iso = combineDateAndTimeToUtcIso("2027-01-01", "09:30");
      assert.ok(iso.length > 0);
      assert.ok(iso.endsWith("Z") || iso.includes("+") || !isNaN(new Date(iso).getTime()));

      // Invalid handling
      assert.equal(combineDateAndTimeToUtcIso("invalid", "09:30"), "");
      assert.equal(combineDateAndTimeToUtcIso("2027-01-01", "invalid"), "");
    });

    it("validates Chapter creation parameters strictly", () => {
      // Missing title
      const res1 = validateChapterCreation(
        { title: "", message: "Hello future me", unlockAtIso: "2027-01-01T00:00:00Z" },
        REF_NOW
      );
      assert.equal(res1.isValid, false);
      assert.ok(res1.errors.some((e) => e.includes("title is required")));

      // Missing message
      const res2 = validateChapterCreation(
        { title: "My Goals", message: "", unlockAtIso: "2027-01-01T00:00:00Z" },
        REF_NOW
      );
      assert.equal(res2.isValid, false);
      assert.ok(res2.errors.some((e) => e.includes("message to your future self is required")));

      // Past unlock time
      const res3 = validateChapterCreation(
        { title: "Past Goal", message: "Hello", unlockAtIso: "2026-11-01T00:00:00Z" },
        REF_NOW
      );
      assert.equal(res3.isValid, false);
      assert.ok(res3.errors.some((e) => e.includes("Unlock time must be in the future")));

      // Valid input
      const res4 = validateChapterCreation(
        {
          title: "Launch Letter",
          message: "Keep building with clarity and focus.",
          unlockAtIso: "2027-01-01T00:00:00Z",
          category: "letter",
        },
        REF_NOW
      );
      assert.equal(res4.isValid, true);
      assert.equal(res4.errors.length, 0);
    });

    it("validates present-day revisit reflection", () => {
      const invalid = validateChapterReflection("");
      assert.equal(invalid.isValid, false);

      const valid = validateChapterReflection("Looking back, we stayed on track.");
      assert.equal(valid.isValid, true);
    });

    it("groups chapters into sealed, readyToUnlock, and past sections with countdown", () => {
      const chapters: Chapter[] = [
        makeMockChapter({ id: "ch-sealed-1", unlock_at: "2026-11-10T12:00:00Z" }), // 5 days away
        makeMockChapter({ id: "ch-sealed-2", unlock_at: "2026-11-20T12:00:00Z" }), // 15 days away
        makeMockChapter({ id: "ch-ready", unlock_at: "2026-11-04T12:00:00Z" }), // Ready to unlock
        makeMockChapter({
          id: "ch-past",
          unlock_at: "2026-10-01T12:00:00Z",
          unlocked_at: "2026-10-02T12:00:00Z",
          reflection: "Great journey",
        }),
      ];

      const sections = groupChapterSections(chapters, REF_NOW);
      assert.equal(sections.sealed.length, 2);
      assert.equal(sections.readyToUnlock.length, 1);
      assert.equal(sections.past.length, 1);

      // Verify next scheduled unlock spotlight is the earliest sealed chapter (ch-sealed-1)
      assert.equal(sections.nextScheduledUnlock.chapter?.id, "ch-sealed-1");
      assert.equal(sections.nextScheduledUnlock.remainingDays, 5);
      assert.equal(sections.nextScheduledUnlock.formattedTimeRemaining, "Unlocks in 5 days");
    });
  });
});
