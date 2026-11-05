"use client";

/**
 * use-today-dashboard.ts - Authenticated Supabase Data Hook for the Today Dashboard.
 *
 * Implements clean separation of data fetching, state aggregation, and mutations:
 * - Aggregates real profiles, projects, tasks, and milestones with RLS enforcement.
 * - Prevents duplicate submissions with in-flight mutation locks.
 * - Deterministic summary metrics and risk evaluations via dashboard-calculations.ts.
 * - Optimistic updates with rollback on network failure.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  calculateSummaryMetrics,
  calculateWeeklyProgress,
  calculateProjectProgress,
  assessTaskRisk,
  type Project,
  type Task,
  type Milestone,
  type SummaryMetricsResult,
  type WeeklyProgressResult,
  type TaskRiskAssessment,
} from "@/lib/dashboard-calculations";
import type { Database, TaskStatus, TaskPriority } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface TaskWithRisk extends Task {
  assessment: TaskRiskAssessment;
  projectName?: string;
}

export interface CreateTaskPayload {
  title: string;
  project_id: string;
  due_date?: string | null;
  estimated_hours: number;
  priority: TaskPriority;
  description?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  target_date?: string | null;
}

export function useTodayDashboard() {
  const { user, isAuthenticated, isConfigured, loading: authLoading } = useAuth();
  const isLocalPreview = !isAuthenticated || !isConfigured;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(isAuthenticated && isConfigured));
  const [error, setError] = useState<string | null>(null);

  // In-flight mutation locking
  const [mutatingTaskIds, setMutatingTaskIds] = useState<Set<string>>(new Set());
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all dashboard data for the authenticated user
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const activeClient = supabase;
    const currentUserId = user.id;
    let isSubscribed = true;

    async function loadDashboardData() {
      try {
        // Fetch profile, projects, tasks, and milestones in parallel
        const [profileRes, projectsRes, tasksRes, milestonesRes] = await Promise.all([
          activeClient
            .from("profiles")
            .select("*")
            .eq("id", currentUserId)
            .maybeSingle(),
          activeClient
            .from("projects")
            .select("*")
            .eq("owner_id", currentUserId)
            .order("updated_at", { ascending: false }),
          activeClient
            .from("tasks")
            .select("*")
            .eq("owner_id", currentUserId)
            .order("created_at", { ascending: false }),
          activeClient
            .from("milestones")
            .select("*")
            .eq("owner_id", currentUserId)
            .order("target_date", { ascending: true }),
        ]);

        if (!isSubscribed) return;

        if (profileRes.error) {
          console.warn("[DueLine Dashboard] Profile fetch warning:", profileRes.error.message);
        }
        if (projectsRes.error) {
          throw new Error(projectsRes.error.message);
        }
        if (tasksRes.error) {
          throw new Error(tasksRes.error.message);
        }
        if (milestonesRes.error) {
          console.warn("[DueLine Dashboard] Milestones fetch warning:", milestonesRes.error.message);
        }

        setProfile(profileRes.data ?? null);
        setProjects(projectsRes.data ?? []);
        setTasks(tasksRes.data ?? []);
        setMilestones(milestonesRes.data ?? []);
        setError(null);
      } catch (err) {
        if (!isSubscribed) return;
        console.error("[DueLine Dashboard] Data fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isSubscribed = false;
    };
  }, [authLoading, isAuthenticated, user, refreshKey]);

  const refreshDashboard = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  // Tasks enriched with deterministic risk assessment & project name
  const tasksWithRisk: TaskWithRisk[] = useMemo(() => {
    return tasks.map((t) => {
      const assessment = assessTaskRisk(t);
      const project = projectMap.get(t.project_id);
      return {
        ...t,
        assessment,
        projectName: project ? project.name : undefined,
      };
    });
  }, [tasks, projectMap]);

  // Summary Metrics
  const summaryMetrics: SummaryMetricsResult = useMemo(() => {
    return calculateSummaryMetrics(projects, tasks);
  }, [projects, tasks]);

  // Weekly Progress
  const weeklyProgress: WeeklyProgressResult = useMemo(() => {
    return calculateWeeklyProgress(tasks);
  }, [tasks]);

  // Active Goal (the primary active project with highest priority or most recent activity)
  const activeGoal = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === "active");
    if (activeProjects.length === 0) return null;

    // Pick the first active project (ordered by updated_at descending)
    const primaryProject = activeProjects[0];
    const progress = calculateProjectProgress(primaryProject.id, tasks, milestones);

    return {
      project: primaryProject,
      progress,
    };
  }, [projects, tasks, milestones]);

  // Mutation: Toggle task completion / reopening
  const toggleTaskStatus = useCallback(
    async (taskId: string, currentStatus: TaskStatus): Promise<{ error?: string }> => {
      if (!user || mutatingTaskIds.has(taskId)) {
        return { error: "Action in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured" };
      }

      const nextStatus: TaskStatus = currentStatus === "completed" ? "todo" : "completed";
      const completedAt = nextStatus === "completed" ? new Date().toISOString() : null;

      // Lock task
      setMutatingTaskIds((prev) => new Set(prev).add(taskId));

      // Optimistic update
      const previousTasks = [...tasks];
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: nextStatus, completed_at: completedAt }
            : t
        )
      );

      try {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            status: nextStatus,
            completed_at: completedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .eq("owner_id", user.id);

        if (updateError) {
          throw updateError;
        }

        // Log task event asynchronously (non-blocking)
        supabase
          .from("task_events")
          .insert({
            task_id: taskId,
            owner_id: user.id,
            event_type: nextStatus === "completed" ? "completed" : "uncompleted",
            event_data: {
              previous_status: currentStatus,
              new_status: nextStatus,
            },
          })
          .then(({ error: eventError }) => {
            if (eventError) {
              console.warn("[DueLine TaskEvent] Failed to log event:", eventError.message);
            }
          });

        return {};
      } catch (err) {
        // Rollback optimistic update
        setTasks(previousTasks);
        const msg = err instanceof Error ? err.message : "Failed to update task";
        return { error: msg };
      } finally {
        setMutatingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [user, mutatingTaskIds, tasks]
  );

  // Mutation: Create task
  const createTask = useCallback(
    async (payload: CreateTaskPayload): Promise<{ error?: string; task?: Task }> => {
      if (!user || isCreatingTask) {
        return { error: "Action in progress or user not authenticated" };
      }

      const trimmedTitle = payload.title.trim();
      if (!trimmedTitle || trimmedTitle.length > 200) {
        return { error: "Title must be between 1 and 200 characters" };
      }

      if (!payload.project_id) {
        return { error: "Please select an associated project" };
      }

      const estHours = Number(payload.estimated_hours);
      if (Number.isNaN(estHours) || estHours < 0) {
        return { error: "Estimated hours must be a non-negative number" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured" };
      }

      setIsCreatingTask(true);

      try {
        const { data: newTask, error: insertError } = await supabase
          .from("tasks")
          .insert({
            owner_id: user.id,
            project_id: payload.project_id,
            title: trimmedTitle,
            description: payload.description?.trim() || null,
            due_date: payload.due_date || null,
            estimated_hours: estHours,
            priority: payload.priority,
            status: "todo",
          })
          .select("*")
          .single();

        if (insertError) {
          throw insertError;
        }

        // Add to tasks list
        if (newTask) {
          setTasks((prev) => [newTask, ...prev]);

          // Asynchronously record event
          supabase
            .from("task_events")
            .insert({
              task_id: newTask.id,
              owner_id: user.id,
              event_type: "created",
              event_data: {
                title: newTask.title,
                project_id: newTask.project_id,
              },
            })
            .then(() => {});
        }

        return { task: newTask ?? undefined };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create task";
        return { error: msg };
      } finally {
        setIsCreatingTask(false);
      }
    },
    [user, isCreatingTask]
  );

  // Mutation: Create project (if user has none or wants a new one)
  const createProject = useCallback(
    async (payload: CreateProjectPayload): Promise<{ error?: string; project?: Project }> => {
      if (!user || isCreatingProject) {
        return { error: "Action in progress or user not authenticated" };
      }

      const trimmedName = payload.name.trim();
      if (!trimmedName || trimmedName.length > 100) {
        return { error: "Project name must be between 1 and 100 characters" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured" };
      }

      setIsCreatingProject(true);

      try {
        const { data: newProject, error: insertError } = await supabase
          .from("projects")
          .insert({
            owner_id: user.id,
            name: trimmedName,
            description: payload.description?.trim() || null,
            target_date: payload.target_date || null,
            status: "active",
          })
          .select("*")
          .single();

        if (insertError) {
          throw insertError;
        }

        if (newProject) {
          setProjects((prev) => [newProject, ...prev]);
        }

        return { project: newProject ?? undefined };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create project";
        return { error: msg };
      } finally {
        setIsCreatingProject(false);
      }
    },
    [user, isCreatingProject]
  );

  return {
    user,
    profile,
    projects,
    tasks: tasksWithRisk,
    milestones,
    summaryMetrics,
    weeklyProgress,
    activeGoal,
    isLoading: authLoading || isLoading,
    error,
    isConfigured,
    isAuthenticated,
    isLocalPreview,
    mutatingTaskIds,
    isCreatingTask,
    isCreatingProject,
    toggleTaskStatus,
    createTask,
    createProject,
    refreshDashboard,
  };
}
