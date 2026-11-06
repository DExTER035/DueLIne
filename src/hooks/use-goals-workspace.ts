"use client";

/**
 * use-goals-workspace.ts - Authenticated Supabase Data Hook for the Goals Workspace.
 *
 * Implements end-to-end data management for Projects & Milestones:
 * - Real Supabase queries enforcing RLS and composite relational keys.
 * - Project CRUD with status lifecycle management ('active', 'on_hold', 'completed', 'archived').
 * - Milestone CRUD with achievement toggling and target-date checkpoints.
 * - In-flight mutation locking to prevent duplicate network submissions.
 * - Deep task integration allowing task creation and completion directly within project views.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  calculateGoalsSummaryMetrics,
  calculateProjectProgress,
  assessTaskRisk,
  type Project,
  type Task,
  type Milestone,
  type GoalsSummaryMetrics,
  type ProjectProgressResult,
  type TaskRiskAssessment,
} from "@/lib/dashboard-calculations";
import type {
  ProjectStatus,
  MilestoneStatus,
  TaskStatus,
  TaskPriority,
} from "@/lib/supabase/database.types";

export interface TaskWithRiskInProject extends Task {
  assessment: TaskRiskAssessment;
  projectName?: string;
}

export interface ProjectWithDetails extends Project {
  progress: ProjectProgressResult;
  milestones: Milestone[];
  tasks: TaskWithRiskInProject[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  target_date?: string | null;
  start_date?: string | null;
  status?: ProjectStatus;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  target_date?: string | null;
  start_date?: string | null;
  status?: ProjectStatus;
}

export interface CreateMilestonePayload {
  project_id: string;
  title: string;
  description?: string | null;
  target_date?: string | null;
}

export interface UpdateMilestonePayload {
  title?: string;
  description?: string | null;
  target_date?: string | null;
  status?: MilestoneStatus;
}

export interface CreateProjectTaskPayload {
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  estimated_hours: number;
  priority: TaskPriority;
}

const LOCAL_STORAGE_PROJECTS_KEY = "dueline_goals_projects_preview_v2";
const LOCAL_STORAGE_TASKS_KEY = "dueline_goals_tasks_preview_v2";
const LOCAL_STORAGE_MILESTONES_KEY = "dueline_goals_milestones_preview_v2";

function getInitialSampleGoals() {
  const now = Date.now();
  const sampleProjects: Project[] = [
    {
      id: "proj-writing-01",
      owner_id: "demo-user",
      name: "Build a consistent writing habit",
      description: "Daily focused writing sessions to draft our product development philosophy.",
      target_date: new Date(now + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      start_date: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active",
      created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "proj-launch-02",
      owner_id: "demo-user",
      name: "Launch my personal project",
      description: "Build, verify, and launch the DueLine application with full design fidelity.",
      target_date: new Date(now + 42 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      start_date: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active",
      created_at: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const sampleMilestones: Milestone[] = [
    {
      id: "m-writing-01",
      owner_id: "demo-user",
      project_id: "proj-writing-01",
      title: "Draft 5 core philosophy chapters",
      description: "Complete first draft of ambition, action, evidence, and memory loops.",
      target_date: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "achieved",
      created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "m-writing-02",
      owner_id: "demo-user",
      project_id: "proj-writing-01",
      title: "Community edition publishing",
      description: "Publish initial distribution edition for early readers.",
      target_date: new Date(now + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "pending",
      created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "m-launch-01",
      owner_id: "demo-user",
      project_id: "proj-launch-02",
      title: "Deploy production release",
      description: "Deliver responsive frontend, robust auth guards, and complete test suite.",
      target_date: new Date(now + 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "pending",
      created_at: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const sampleTasks: Task[] = [
    {
      id: "t-w-1",
      owner_id: "demo-user",
      project_id: "proj-writing-01",
      title: "Outline table of contents",
      description: "Map out the 5 core chapters and thematic flow.",
      due_date: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 2,
      priority: "high",
      status: "completed",
      completed_at: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "t-w-2",
      owner_id: "demo-user",
      project_id: "proj-writing-01",
      title: "Draft chapter 1: Ambition Loops",
      description: "Write first 2,000 words on turning vague intent into structured goals.",
      due_date: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 4,
      priority: "high",
      status: "completed",
      completed_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "t-w-3",
      owner_id: "demo-user",
      project_id: "proj-writing-01",
      title: "30 min focused work",
      description: "Daily sprint on drafting chapter 2.",
      due_date: new Date().toISOString().split("T")[0],
      estimated_hours: 1,
      priority: "medium",
      status: "completed",
      completed_at: new Date().toISOString(),
      created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "t-w-4",
      owner_id: "demo-user",
      project_id: "proj-writing-01",
      title: "Draft chapter 2: Deterministic Action",
      description: "Flesh out the deterministic risk assessment principles.",
      due_date: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 3,
      priority: "medium",
      status: "in_progress",
      completed_at: null,
      created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "t-w-5",
      owner_id: "demo-user",
      project_id: "proj-writing-01",
      title: "Peer review session",
      description: "Review chapters 1 & 2 with design and engineering peers.",
      due_date: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 2,
      priority: "low",
      status: "todo",
      completed_at: null,
      created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "t-l-1",
      owner_id: "demo-user",
      project_id: "proj-launch-02",
      title: "Wireframe responsive layout",
      description: "Design 1440px desktop and 390px mobile wireframes.",
      due_date: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 6,
      priority: "high",
      status: "completed",
      completed_at: new Date(now - 11 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 11 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "t-l-2",
      owner_id: "demo-user",
      project_id: "proj-launch-02",
      title: "Review project milestone",
      description: "Audit milestone checkpoint against architectural specifications.",
      due_date: new Date().toISOString().split("T")[0],
      estimated_hours: 2,
      priority: "high",
      status: "completed",
      completed_at: new Date().toISOString(),
      created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "t-l-3",
      owner_id: "demo-user",
      project_id: "proj-launch-02",
      title: "Implement Supabase RLS security",
      description: "Verify row level security policies and composite foreign keys.",
      due_date: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 5,
      priority: "high",
      status: "in_progress",
      completed_at: null,
      created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "t-l-4",
      owner_id: "demo-user",
      project_id: "proj-launch-02",
      title: "Connect analytics & error logging",
      description: "Wire telemetry and error handling without compromising privacy.",
      due_date: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 3,
      priority: "low",
      status: "todo",
      completed_at: null,
      created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "t-l-5",
      owner_id: "demo-user",
      project_id: "proj-launch-02",
      title: "User acceptance testing",
      description: "End-to-end walkthrough on desktop and mobile viewports.",
      due_date: new Date(now + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      estimated_hours: 4,
      priority: "medium",
      status: "todo",
      completed_at: null,
      created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return { sampleProjects, sampleMilestones, sampleTasks };
}

export function useGoalsWorkspace() {
  const { user, isAuthenticated, isConfigured, loading: authLoading } = useAuth();
  const isLocalPreview = !isAuthenticated || !isConfigured;

  // Deterministic initial state guarantees identical server and client initial render
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(isAuthenticated && isConfigured));
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Selected project for deep inspection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Hydrate preview mode data safely after initial client mount
  useEffect(() => {
    if (!isLocalPreview) return;
    try {
      const storedP = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
      const storedM = localStorage.getItem(LOCAL_STORAGE_MILESTONES_KEY);
      const storedT = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);

      if (storedP && storedM && storedT) {
        setProjects(JSON.parse(storedP));
        setMilestones(JSON.parse(storedM));
        setTasks(JSON.parse(storedT));
      } else {
        const { sampleProjects, sampleMilestones, sampleTasks } = getInitialSampleGoals();
        setProjects(sampleProjects);
        setMilestones(sampleMilestones);
        setTasks(sampleTasks);
        localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(sampleProjects));
        localStorage.setItem(LOCAL_STORAGE_MILESTONES_KEY, JSON.stringify(sampleMilestones));
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(sampleTasks));
      }
    } catch {
      const { sampleProjects, sampleMilestones, sampleTasks } = getInitialSampleGoals();
      setProjects(sampleProjects);
      setMilestones(sampleMilestones);
      setTasks(sampleTasks);
    }
  }, [isLocalPreview]);

  // Sync to local storage in preview mode
  const persistPreviewData = useCallback((nextP: Project[], nextM: Milestone[], nextT: Task[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(nextP));
        localStorage.setItem(LOCAL_STORAGE_MILESTONES_KEY, JSON.stringify(nextM));
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(nextT));
      } catch (e) {
        console.warn("[DueLine Goals Preview] Failed to persist:", e);
      }
    }
  }, []);

  const resetPreviewData = useCallback(() => {
    const { sampleProjects, sampleMilestones, sampleTasks } = getInitialSampleGoals();
    setProjects(sampleProjects);
    setMilestones(sampleMilestones);
    setTasks(sampleTasks);
    setSelectedProjectId(null);
    persistPreviewData(sampleProjects, sampleMilestones, sampleTasks);
  }, [persistPreviewData, setSelectedProjectId]);

  // In-flight mutation locks
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);
  const [mutatingMilestoneIds, setMutatingMilestoneIds] = useState<Set<string>>(new Set());
  const [mutatingTaskIds, setMutatingTaskIds] = useState<Set<string>>(new Set());

  // Fetch all projects, tasks, and milestones for the authenticated user
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

    async function loadGoalsData() {
      try {
        const [projectsRes, tasksRes, milestonesRes] = await Promise.all([
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

        if (projectsRes.error) throw new Error(projectsRes.error.message);
        if (tasksRes.error) throw new Error(tasksRes.error.message);
        if (milestonesRes.error) throw new Error(milestonesRes.error.message);

        setProjects(projectsRes.data ?? []);
        setTasks(tasksRes.data ?? []);
        setMilestones(milestonesRes.data ?? []);
        setError(null);
      } catch (err) {
        if (!isSubscribed) return;
        console.error("[DueLine Goals] Data fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load goals data");
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadGoalsData();

    return () => {
      isSubscribed = false;
    };
  }, [authLoading, isAuthenticated, user, refreshKey]);

  const refreshGoals = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Summary figures
  const summaryMetrics: GoalsSummaryMetrics = useMemo(() => {
    return calculateGoalsSummaryMetrics(projects, milestones);
  }, [projects, milestones]);

  // Projects enriched with progress, milestones, and tasks
  const projectsWithDetails: ProjectWithDetails[] = useMemo(() => {
    return projects.map((p) => {
      const pMilestones = milestones.filter((m) => m.project_id === p.id);
      const pTasks: TaskWithRiskInProject[] = tasks
        .filter((t) => t.project_id === p.id)
        .map((t) => ({
          ...t,
          assessment: assessTaskRisk(t),
          projectName: p.name,
        }));
      const progress = calculateProjectProgress(p.id, tasks, milestones);

      return {
        ...p,
        progress,
        milestones: pMilestones,
        tasks: pTasks,
      };
    });
  }, [projects, milestones, tasks]);

  // Currently inspected project details
  const selectedProject: ProjectWithDetails | null = useMemo(() => {
    if (!selectedProjectId) return null;
    return projectsWithDetails.find((p) => p.id === selectedProjectId) ?? null;
  }, [selectedProjectId, projectsWithDetails]);

  // =========================================================================
  // PROJECT MUTATIONS
  // =========================================================================

  const createProject = useCallback(
    async (payload: CreateProjectPayload): Promise<{ error?: string; project?: Project }> => {
      const trimmedName = payload.name.trim();
      if (!trimmedName || trimmedName.length > 100) {
        return { error: "Project name must be between 1 and 100 characters." };
      }

      if (isLocalPreview) {
        const newProject: Project = {
          id: `proj-local-${Date.now()}`,
          owner_id: "demo-user",
          name: trimmedName,
          description: payload.description?.trim() || null,
          target_date: payload.target_date || null,
          start_date: payload.start_date || null,
          status: payload.status || "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const next = [newProject, ...projects];
        setProjects(next);
        persistPreviewData(next, milestones, tasks);
        return { project: newProject };
      }

      if (!user || isSubmittingProject) {
        return { error: "Operation in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured." };
      }

      setIsSubmittingProject(true);

      try {
        const { data: newProject, error: insertError } = await supabase
          .from("projects")
          .insert({
            owner_id: user.id,
            name: trimmedName,
            description: payload.description?.trim() || null,
            target_date: payload.target_date || null,
            start_date: payload.start_date || null,
            status: payload.status || "active",
          })
          .select("*")
          .single();

        if (insertError) throw insertError;

        if (newProject) {
          setProjects((prev) => [newProject, ...prev]);
        }

        return { project: newProject ?? undefined };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create project";
        return { error: msg };
      } finally {
        setIsSubmittingProject(false);
      }
    },
    [user, isSubmittingProject, isLocalPreview, projects, milestones, tasks, persistPreviewData]
  );

  const updateProject = useCallback(
    async (projectId: string, payload: UpdateProjectPayload): Promise<{ error?: string }> => {
      if (payload.name !== undefined) {
        const trimmed = payload.name.trim();
        if (!trimmed || trimmed.length > 100) {
          return { error: "Project name must be between 1 and 100 characters." };
        }
      }

      if (isLocalPreview) {
        const updates: Partial<Project> = {
          updated_at: new Date().toISOString(),
        };
        if (payload.name !== undefined) updates.name = payload.name.trim();
        if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
        if (payload.target_date !== undefined) updates.target_date = payload.target_date || null;
        if (payload.start_date !== undefined) updates.start_date = payload.start_date || null;
        if (payload.status !== undefined) updates.status = payload.status;

        const next = projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p));
        setProjects(next);
        persistPreviewData(next, milestones, tasks);
        return {};
      }

      if (!user || isSubmittingProject) {
        return { error: "Operation in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured." };
      }

      setIsSubmittingProject(true);

      try {
        const updates: Partial<Project> = {
          updated_at: new Date().toISOString(),
        };
        if (payload.name !== undefined) updates.name = payload.name.trim();
        if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
        if (payload.target_date !== undefined) updates.target_date = payload.target_date || null;
        if (payload.start_date !== undefined) updates.start_date = payload.start_date || null;
        if (payload.status !== undefined) updates.status = payload.status;

        const { error: updateError } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", projectId)
          .eq("owner_id", user.id);

        if (updateError) throw updateError;

        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
        );

        return {};
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update project";
        return { error: msg };
      } finally {
        setIsSubmittingProject(false);
      }
    },
    [user, isSubmittingProject, isLocalPreview, projects, milestones, tasks, persistPreviewData]
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<{ error?: string }> => {
      if (isLocalPreview) {
        const nextP = projects.filter((p) => p.id !== projectId);
        const nextT = tasks.filter((t) => t.project_id !== projectId);
        const nextM = milestones.filter((m) => m.project_id !== projectId);
        setProjects(nextP);
        setTasks(nextT);
        setMilestones(nextM);
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
        }
        persistPreviewData(nextP, nextM, nextT);
        return {};
      }

      if (!user || isSubmittingProject) {
        return { error: "Operation in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured." };
      }

      setIsSubmittingProject(true);

      try {
        const { error: deleteError } = await supabase
          .from("projects")
          .delete()
          .eq("id", projectId)
          .eq("owner_id", user.id);

        if (deleteError) throw deleteError;

        // Cascade delete in local state
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setTasks((prev) => prev.filter((t) => t.project_id !== projectId));
        setMilestones((prev) => prev.filter((m) => m.project_id !== projectId));

        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
        }

        return {};
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete project";
        return { error: msg };
      } finally {
        setIsSubmittingProject(false);
      }
    },
    [user, isSubmittingProject, selectedProjectId, setSelectedProjectId, isLocalPreview, projects, milestones, tasks, persistPreviewData]
  );

  // =========================================================================
  // MILESTONE MUTATIONS
  // =========================================================================

  const createMilestone = useCallback(
    async (payload: CreateMilestonePayload): Promise<{ error?: string; milestone?: Milestone }> => {
      const trimmedTitle = payload.title.trim();
      if (!trimmedTitle || trimmedTitle.length > 200) {
        return { error: "Milestone title must be between 1 and 200 characters." };
      }

      if (!payload.project_id) {
        return { error: "Milestone must be associated with a valid project container." };
      }

      if (isLocalPreview) {
        const newM: Milestone = {
          id: `m-local-${Date.now()}`,
          owner_id: "demo-user",
          project_id: payload.project_id,
          title: trimmedTitle,
          description: payload.description?.trim() || null,
          target_date: payload.target_date || null,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const next = [...milestones, newM];
        setMilestones(next);
        persistPreviewData(projects, next, tasks);
        return { milestone: newM };
      }

      if (!user || isSubmittingMilestone) {
        return { error: "Operation in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured." };
      }

      setIsSubmittingMilestone(true);

      try {
        const { data: newMilestone, error: insertError } = await supabase
          .from("milestones")
          .insert({
            owner_id: user.id,
            project_id: payload.project_id,
            title: trimmedTitle,
            description: payload.description?.trim() || null,
            target_date: payload.target_date || null,
            status: "pending",
          })
          .select("*")
          .single();

        if (insertError) throw insertError;

        if (newMilestone) {
          setMilestones((prev) => [...prev, newMilestone]);
        }

        return { milestone: newMilestone ?? undefined };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create milestone";
        return { error: msg };
      } finally {
        setIsSubmittingMilestone(false);
      }
    },
    [user, isSubmittingMilestone, isLocalPreview, projects, milestones, tasks, persistPreviewData]
  );

  const updateMilestone = useCallback(
    async (milestoneId: string, payload: UpdateMilestonePayload): Promise<{ error?: string }> => {
      if (payload.title !== undefined) {
        const trimmed = payload.title.trim();
        if (!trimmed || trimmed.length > 200) {
          return { error: "Milestone title must be between 1 and 200 characters." };
        }
      }

      if (isLocalPreview) {
        const updates: Partial<Milestone> = {
          updated_at: new Date().toISOString(),
        };
        if (payload.title !== undefined) updates.title = payload.title.trim();
        if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
        if (payload.target_date !== undefined) updates.target_date = payload.target_date || null;
        if (payload.status !== undefined) updates.status = payload.status;

        const next = milestones.map((m) => (m.id === milestoneId ? { ...m, ...updates } : m));
        setMilestones(next);
        persistPreviewData(projects, next, tasks);
        return {};
      }

      if (!user || isSubmittingMilestone) {
        return { error: "Operation in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return { error: "Supabase client not configured." };
      }

      setIsSubmittingMilestone(true);

      try {
        const updates: Partial<Milestone> = {
          updated_at: new Date().toISOString(),
        };
        if (payload.title !== undefined) updates.title = payload.title.trim();
        if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
        if (payload.target_date !== undefined) updates.target_date = payload.target_date || null;
        if (payload.status !== undefined) updates.status = payload.status;

        const { error: updateError } = await supabase
          .from("milestones")
          .update(updates)
          .eq("id", milestoneId)
          .eq("owner_id", user.id);

        if (updateError) throw updateError;

        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, ...updates } : m))
        );

        return {};
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update milestone";
        return { error: msg };
      } finally {
        setIsSubmittingMilestone(false);
      }
    },
    [user, isSubmittingMilestone, isLocalPreview, projects, milestones, tasks, persistPreviewData]
  );

  const toggleMilestoneStatus = useCallback(
    async (milestoneId: string, currentStatus: MilestoneStatus): Promise<{ error?: string }> => {
      const nextStatus: MilestoneStatus = currentStatus === "achieved" ? "pending" : "achieved";

      if (isLocalPreview) {
        const next = milestones.map((m) =>
          m.id === milestoneId ? { ...m, status: nextStatus, updated_at: new Date().toISOString() } : m
        );
        setMilestones(next);
        persistPreviewData(projects, next, tasks);
        return {};
      }

      if (!user || mutatingMilestoneIds.has(milestoneId)) {
        return { error: "Action in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) return { error: "Supabase client not configured." };

      setMutatingMilestoneIds((prev) => new Set(prev).add(milestoneId));

      // Optimistic update
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, status: nextStatus, updated_at: new Date().toISOString() } : m
        )
      );

      try {
        const { error: updateError } = await supabase
          .from("milestones")
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", milestoneId)
          .eq("owner_id", user.id);

        if (updateError) throw updateError;
        return {};
      } catch (err) {
        // Rollback
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId ? { ...m, status: currentStatus } : m
          )
        );
        const msg = err instanceof Error ? err.message : "Failed to toggle milestone";
        return { error: msg };
      } finally {
        setMutatingMilestoneIds((prev) => {
          const next = new Set(prev);
          next.delete(milestoneId);
          return next;
        });
      }
    },
    [user, mutatingMilestoneIds, isLocalPreview, milestones, projects, tasks, persistPreviewData]
  );

  const deleteMilestone = useCallback(
    async (milestoneId: string): Promise<{ error?: string }> => {
      if (isLocalPreview) {
        const next = milestones.filter((m) => m.id !== milestoneId);
        setMilestones(next);
        persistPreviewData(projects, next, tasks);
        return {};
      }

      if (!user || isSubmittingMilestone) {
        return { error: "Operation in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) return { error: "Supabase client not configured." };

      setIsSubmittingMilestone(true);

      try {
        const { error: deleteError } = await supabase
          .from("milestones")
          .delete()
          .eq("id", milestoneId)
          .eq("owner_id", user.id);

        if (deleteError) throw deleteError;

        setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
        return {};
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete milestone";
        return { error: msg };
      } finally {
        setIsSubmittingMilestone(false);
      }
    },
    [user, isSubmittingMilestone, isLocalPreview, milestones, projects, tasks, persistPreviewData]
  );

  // =========================================================================
  // TASK MUTATIONS INSIDE PROJECT VIEW
  // =========================================================================

  const toggleTaskStatus = useCallback(
    async (taskId: string, currentStatus: TaskStatus): Promise<{ error?: string }> => {
      const nextStatus: TaskStatus = currentStatus === "completed" ? "todo" : "completed";
      const completedAt = nextStatus === "completed" ? new Date().toISOString() : null;

      if (isLocalPreview) {
        const next = tasks.map((t) =>
          t.id === taskId ? { ...t, status: nextStatus, completed_at: completedAt } : t
        );
        setTasks(next);
        persistPreviewData(projects, milestones, next);
        return {};
      }

      if (!user || mutatingTaskIds.has(taskId)) {
        return { error: "Action in progress or user not authenticated" };
      }

      const supabase = getSupabaseClient();
      if (!supabase) return { error: "Supabase client not configured." };

      setMutatingTaskIds((prev) => new Set(prev).add(taskId));

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: nextStatus, completed_at: completedAt } : t
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

        if (updateError) throw updateError;

        // Log task event asynchronously
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
          .then(() => {});

        return {};
      } catch (err) {
        // Rollback
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: currentStatus } : t
          )
        );
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
    [user, mutatingTaskIds, isLocalPreview, tasks, projects, milestones, persistPreviewData]
  );

  const createTaskForProject = useCallback(
    async (payload: CreateProjectTaskPayload): Promise<{ error?: string; task?: Task }> => {
      const trimmedTitle = payload.title.trim();
      if (!trimmedTitle || trimmedTitle.length > 200) {
        return { error: "Title must be between 1 and 200 characters." };
      }

      const estHours = Number(payload.estimated_hours);
      if (Number.isNaN(estHours) || estHours < 0) {
        return { error: "Estimated hours must be a non-negative number." };
      }

      if (isLocalPreview) {
        const newTask: Task = {
          id: `t-local-${Date.now()}`,
          owner_id: "demo-user",
          project_id: payload.project_id,
          title: trimmedTitle,
          description: payload.description?.trim() || null,
          due_date: payload.due_date || null,
          estimated_hours: estHours,
          priority: payload.priority,
          status: "todo",
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const next = [newTask, ...tasks];
        setTasks(next);
        persistPreviewData(projects, milestones, next);
        return { task: newTask };
      }

      if (!user) return { error: "User not authenticated." };

      const supabase = getSupabaseClient();
      if (!supabase) return { error: "Supabase client not configured." };

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

        if (insertError) throw insertError;

        if (newTask) {
          setTasks((prev) => [newTask, ...prev]);

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
      }
    },
    [user, isLocalPreview, tasks, projects, milestones, persistPreviewData]
  );

  return {
    user,
    projects: projectsWithDetails,
    summaryMetrics,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    isLoading: authLoading || isLoading,
    error,
    isConfigured,
    isAuthenticated,
    isLocalPreview,
    resetPreviewData,
    isSubmittingProject,
    isSubmittingMilestone,
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
  };
}
