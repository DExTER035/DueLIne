"use client";

/**
 * use-journey-workspace.ts - Authenticated Data Hook for DueLine's Journey Workspace.
 *
 * Implements the Evidence layer of the product loop:
 * - Aggregates task_events, achieved milestones, projects, and tasks under RLS.
 * - Compiles chronological evidence timeline with semantic tier distinctions.
 * - Extracts and manages device-local private daily reflections from localStorage.
 * - Computes factual weekly and monthly review summaries.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  buildEvidenceTimeline,
  calculateProgressOverview,
  calculatePeriodReview,
  formatIsoDate,
  type Project,
  type Task,
  type Milestone,
  type TaskEvent,
  type TimelineItem,
  type ProgressOverviewResult,
  type PeriodReviewResult,
} from "@/lib/dashboard-calculations";

export type TimelineFilter = "all" | "achievements" | "evidence" | "activity";

export interface LocalReflectionItem {
  date: string;
  formattedDate: string;
  text: string;
}

const REFLECTION_PREFIX = "dueline_daily_reflection_";
const INITIAL_TIMELINE_PAGE_SIZE = 15;
const LOCAL_STORAGE_PROJECTS_KEY = "dueline_goals_projects_preview_v2";
const LOCAL_STORAGE_TASKS_KEY = "dueline_goals_tasks_preview_v2";
const LOCAL_STORAGE_MILESTONES_KEY = "dueline_goals_milestones_preview_v2";

function getInitialSampleJourneyEvents(): TaskEvent[] {
  const now = Date.now();
  return [
    {
      id: "ev-1",
      task_id: "t-w-3",
      owner_id: "demo-user",
      event_type: "completed",
      event_data: { title: "30 min focused work" },
      created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ev-2",
      task_id: "t-l-2",
      owner_id: "demo-user",
      event_type: "completed",
      event_data: { title: "Review project milestone" },
      created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ev-3",
      task_id: "t-w-2",
      owner_id: "demo-user",
      event_type: "completed",
      event_data: { title: "Draft chapter 1: Ambition Loops" },
      created_at: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ev-4",
      task_id: "t-w-1",
      owner_id: "demo-user",
      event_type: "completed",
      event_data: { title: "Outline table of contents" },
      created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ev-5",
      task_id: "t-l-1",
      owner_id: "demo-user",
      event_type: "completed",
      event_data: { title: "Wireframe responsive layout" },
      created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getInitialLocalReflections(): LocalReflectionItem[] {
  if (typeof window === "undefined") return [];

  try {
    const items: LocalReflectionItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(REFLECTION_PREFIX)) {
        const dateStr = key.replace(REFLECTION_PREFIX, "");
        const text = localStorage.getItem(key) || "";
        if (text.trim()) {
          const dateObj = new Date(dateStr + "T00:00:00Z");
          const formatted = !Number.isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })
            : dateStr;

          items.push({
            date: dateStr,
            formattedDate: formatted,
            text: text.trim(),
          });
        }
      }
    }

    // Sort newest date first
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  } catch {
    return [];
  }
}

export function useJourneyWorkspace() {
  const { user, isAuthenticated, isConfigured, loading: authLoading } = useAuth();
  const isLocalPreview = !isAuthenticated || !isConfigured;

  // Deterministic initial state guarantees identical server and client initial render
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [taskEvents, setTaskEvents] = useState<TaskEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(isAuthenticated && isConfigured));
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Timeline UI state
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_TIMELINE_PAGE_SIZE);

  // Review UI state
  const [reviewPeriod, setReviewPeriod] = useState<"week" | "month">("week");

  // Device-local reflections state
  const [reflections, setReflections] = useState<LocalReflectionItem[]>([]);

  // Hydrate preview mode data and reflections safely after initial client mount
  useEffect(() => {
    setReflections(getInitialLocalReflections());

    if (!isLocalPreview) return;
    try {
      const storedP = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
      const storedT = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      const storedM = localStorage.getItem(LOCAL_STORAGE_MILESTONES_KEY);

      if (storedP) setProjects(JSON.parse(storedP));
      if (storedT) setTasks(JSON.parse(storedT));
      if (storedM) setMilestones(JSON.parse(storedM));
      setTaskEvents(getInitialSampleJourneyEvents());
    } catch {}
  }, [isLocalPreview]);

  // 1. Fetch Supabase database records
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

    async function loadJourneyData() {
      try {
        const [projectsRes, tasksRes, milestonesRes, eventsRes] = await Promise.all([
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
          activeClient
            .from("task_events")
            .select("*")
            .eq("owner_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(200),
        ]);

        if (!isSubscribed) return;

        if (projectsRes.error) throw new Error(projectsRes.error.message);
        if (tasksRes.error) throw new Error(tasksRes.error.message);
        if (milestonesRes.error) throw new Error(milestonesRes.error.message);
        if (eventsRes.error) throw new Error(eventsRes.error.message);

        setProjects(projectsRes.data ?? []);
        setTasks(tasksRes.data ?? []);
        setMilestones(milestonesRes.data ?? []);
        setTaskEvents(eventsRes.data ?? []);
        setError(null);
      } catch (err) {
        if (!isSubscribed) return;
        console.error("[DueLine Journey] Data fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load journey evidence");
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadJourneyData();

    return () => {
      isSubscribed = false;
    };
  }, [authLoading, isAuthenticated, user, refreshKey]);

  // 2. Read device-local reflections from localStorage
  const loadLocalReflections = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const items: LocalReflectionItem[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(REFLECTION_PREFIX)) {
          const dateStr = key.replace(REFLECTION_PREFIX, "");
          const text = localStorage.getItem(key) || "";
          if (text.trim()) {
            const dateObj = new Date(dateStr + "T00:00:00Z");
            const formatted = !Number.isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : dateStr;

            items.push({
              date: dateStr,
              formattedDate: formatted,
              text: text.trim(),
            });
          }
        }
      }

      // Sort newest date first
      items.sort((a, b) => b.date.localeCompare(a.date));
      setReflections(items);
    } catch {
      // Storage access blocked in strict private browsing
    }
  }, []);

  // 2. Synchronize reflections on cross-tab storage events
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleStorage(e: StorageEvent) {
      if (e.key && e.key.startsWith(REFLECTION_PREFIX)) {
        loadLocalReflections();
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadLocalReflections]);

  const saveDailyReflection = useCallback(
    (text: string, targetDate?: string) => {
      if (typeof window === "undefined") return;
      const dateKey = targetDate || formatIsoDate(new Date());
      try {
        localStorage.setItem(`${REFLECTION_PREFIX}${dateKey}`, text);
        loadLocalReflections();
      } catch {
        // Ignore storage write failure
      }
    },
    [loadLocalReflections]
  );

  const refreshJourney = useCallback(() => {
    setRefreshKey((k) => k + 1);
    loadLocalReflections();
  }, [loadLocalReflections]);

  // Progress Overview Metrics
  const progressOverview: ProgressOverviewResult = useMemo(() => {
    return calculateProgressOverview(tasks, milestones, projects);
  }, [tasks, milestones, projects]);

  // Unified Evidence Timeline Items
  const allTimelineItems: TimelineItem[] = useMemo(() => {
    return buildEvidenceTimeline(taskEvents, tasks, milestones, projects);
  }, [taskEvents, tasks, milestones, projects]);

  // Filtered Timeline
  const filteredTimelineItems: TimelineItem[] = useMemo(() => {
    return allTimelineItems.filter((item) => {
      switch (timelineFilter) {
        case "achievements":
          return item.tier === "achievement";
        case "evidence":
          return item.tier === "evidence";
        case "activity":
          return item.tier === "activity";
        case "all":
        default:
          return true;
      }
    });
  }, [allTimelineItems, timelineFilter]);

  // Paginated Timeline
  const paginatedTimelineItems = useMemo(() => {
    return filteredTimelineItems.slice(0, visibleCount);
  }, [filteredTimelineItems, visibleCount]);

  const hasMoreTimeline = visibleCount < filteredTimelineItems.length;

  const loadMoreTimeline = useCallback(() => {
    setVisibleCount((prev) => prev + INITIAL_TIMELINE_PAGE_SIZE);
  }, []);

  // Timeline grouped by Date Label ("Today", "Yesterday", "Nov 4, 2026")
  const groupedTimeline = useMemo(() => {
    const groups: Array<{ dateGroup: string; items: TimelineItem[] }> = [];
    const groupMap = new Map<string, TimelineItem[]>();

    for (const item of paginatedTimelineItems) {
      const g = item.dateGroup;
      if (!groupMap.has(g)) {
        const list: TimelineItem[] = [];
        groupMap.set(g, list);
        groups.push({ dateGroup: g, items: list });
      }
      groupMap.get(g)!.push(item);
    }

    return groups;
  }, [paginatedTimelineItems]);

  // Weekly & Monthly Reviews
  const weeklyReview: PeriodReviewResult = useMemo(() => {
    return calculatePeriodReview("week", tasks, milestones, projects);
  }, [tasks, milestones, projects]);

  const monthlyReview: PeriodReviewResult = useMemo(() => {
    return calculatePeriodReview("month", tasks, milestones, projects);
  }, [tasks, milestones, projects]);

  const activeReview = reviewPeriod === "week" ? weeklyReview : monthlyReview;

  return {
    user,
    progressOverview,
    timelineItems: paginatedTimelineItems,
    groupedTimeline,
    totalTimelineCount: filteredTimelineItems.length,
    hasMoreTimeline,
    loadMoreTimeline,
    timelineFilter,
    setTimelineFilter,
    reflections,
    saveDailyReflection,
    reviewPeriod,
    setReviewPeriod,
    activeReview,
    weeklyReview,
    monthlyReview,
    isLoading: authLoading || isLoading,
    error,
    isConfigured,
    isAuthenticated,
    isLocalPreview,
    refreshJourney,
  };
}
