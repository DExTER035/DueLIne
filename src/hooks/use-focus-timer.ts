"use client";

/**
 * use-focus-timer.ts - High-Reliability Focus Timer Hook for DueLine.
 *
 * Implements the Today's Focus timer:
 * - Real wall-clock timestamp comparison (avoids setInterval drift during background tab throttling).
 * - State persistence in localStorage (survives tab switches and refreshes).
 * - Start, pause, resume, reset, and task selection/clearing controls.
 * - Elapsed and remaining time calculations.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task } from "@/lib/dashboard-calculations";

const STORAGE_KEY = "dueline_focus_timer_v1";
const DEFAULT_FOCUS_SECONDS = 25 * 60; // 25-minute Pomodoro

export interface FocusTimerState {
  taskId: string | null;
  taskTitle: string | null;
  projectName?: string | null;
  totalDurationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  targetEndTimeMs: number | null;
}

const DEFAULT_INITIAL_FOCUS_STATE: FocusTimerState = {
  taskId: null,
  taskTitle: null,
  projectName: null,
  totalDurationSeconds: DEFAULT_FOCUS_SECONDS,
  remainingSeconds: DEFAULT_FOCUS_SECONDS,
  isRunning: false,
  targetEndTimeMs: null,
};

export function useFocusTimer() {
  // Deterministic initial state guarantees identical server and initial client render
  const [state, setState] = useState<FocusTimerState>(DEFAULT_INITIAL_FOCUS_STATE);
  const stateRef = useRef(state);
  const isMountedRef = useRef(false);

  // Hydrate persisted timer state after initial client mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FocusTimerState;
        if (parsed.isRunning && parsed.targetEndTimeMs) {
          const now = Date.now();
          const calculatedRemaining = Math.max(
            0,
            Math.round((parsed.targetEndTimeMs - now) / 1000)
          );
          setState({
            ...parsed,
            remainingSeconds: calculatedRemaining,
            isRunning: calculatedRemaining > 0,
            targetEndTimeMs: calculatedRemaining > 0 ? parsed.targetEndTimeMs : null,
          });
        } else {
          setState(parsed);
        }
      }
    } catch {
      // Storage access blocked or invalid JSON
    }
  }, []);

  // Synchronize ref and persist state to localStorage only after mount
  useEffect(() => {
    stateRef.current = state;
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage failure
    }
  }, [state]);

  // Wall-clock interval ticker
  useEffect(() => {
    if (!state.isRunning || !state.targetEndTimeMs) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const target = stateRef.current.targetEndTimeMs;
      if (!target) return;

      const remaining = Math.max(0, Math.round((target - now) / 1000));

      if (remaining <= 0) {
        setState((prev) => ({
          ...prev,
          remainingSeconds: 0,
          isRunning: false,
          targetEndTimeMs: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          remainingSeconds: remaining,
        }));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [state.isRunning, state.targetEndTimeMs]);

  // Handle visibility changes (e.g. user returns to inactive tab)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && stateRef.current.isRunning && stateRef.current.targetEndTimeMs) {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((stateRef.current.targetEndTimeMs - now) / 1000));
        setState((prev) => ({
          ...prev,
          remainingSeconds: remaining,
          isRunning: remaining > 0,
          targetEndTimeMs: remaining > 0 ? prev.targetEndTimeMs : null,
        }));
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const selectTask = useCallback((task: Task, projectName?: string | null) => {
    setState((prev) => ({
      ...prev,
      taskId: task.id,
      taskTitle: task.title,
      projectName: projectName || null,
      isRunning: false,
      targetEndTimeMs: null,
      remainingSeconds: prev.totalDurationSeconds,
    }));
  }, []);

  const clearTask = useCallback(() => {
    setState((prev) => ({
      ...prev,
      taskId: null,
      taskTitle: null,
      projectName: null,
      isRunning: false,
      targetEndTimeMs: null,
      remainingSeconds: prev.totalDurationSeconds,
    }));
  }, []);

  const start = useCallback(() => {
    setState((prev) => {
      if (prev.remainingSeconds <= 0) {
        const remaining = prev.totalDurationSeconds;
        return {
          ...prev,
          remainingSeconds: remaining,
          isRunning: true,
          targetEndTimeMs: Date.now() + remaining * 1000,
        };
      }
      return {
        ...prev,
        isRunning: true,
        targetEndTimeMs: Date.now() + prev.remainingSeconds * 1000,
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev.isRunning || !prev.targetEndTimeMs) return prev;
      const now = Date.now();
      const actualRemaining = Math.max(0, Math.round((prev.targetEndTimeMs - now) / 1000));
      return {
        ...prev,
        isRunning: false,
        remainingSeconds: actualRemaining,
        targetEndTimeMs: null,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      remainingSeconds: prev.totalDurationSeconds,
      targetEndTimeMs: null,
    }));
  }, []);

  const setDurationMinutes = useCallback((minutes: number) => {
    const seconds = Math.max(60, minutes * 60);
    setState((prev) => ({
      ...prev,
      totalDurationSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: false,
      targetEndTimeMs: null,
    }));
  }, []);

  const elapsedSeconds = Math.max(
    0,
    state.totalDurationSeconds - state.remainingSeconds
  );

  const formattedTime = `${String(Math.floor(state.remainingSeconds / 60)).padStart(2, "0")}:${String(
    state.remainingSeconds % 60
  ).padStart(2, "0")}`;

  return {
    taskId: state.taskId,
    taskTitle: state.taskTitle,
    projectName: state.projectName,
    remainingSeconds: state.remainingSeconds,
    totalDurationSeconds: state.totalDurationSeconds,
    elapsedSeconds,
    formattedTime,
    isRunning: state.isRunning,
    selectTask,
    clearTask,
    start,
    pause,
    reset,
    setDurationMinutes,
  };
}
