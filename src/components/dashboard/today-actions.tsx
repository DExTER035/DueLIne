"use client";

/**
 * today-actions.tsx - Today's Priorities Card matching DueLine Visual Reference Mockup.
 *
 * Implements:
 * - Header: Target bullseye badge, serif title "Today's Priorities", and "X of Y completed" counter.
 * - Crisp white card with light ivory borders and soft shadow.
 * - Exact 5 tasks baseline with interactive check toggling and colored priority flags:
 *   1. Review project milestone (completed, green flag)
 *   2. 30 min focused work (completed, green flag)
 *   3. Go for a walk (todo, yellow flag)
 *   4. Write daily reflection (todo, orange flag)
 *   5. Plan tomorrow (todo, red flag)
 * - Seamless integration with Supabase real tasks & mutation locking.
 * - "+ Add task" trigger button.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Check, Plus, Flag, Target, Loader2, Pencil, Trash2, X } from "lucide-react";
import type { TaskWithRisk } from "@/hooks/use-today-dashboard";
import type { TaskStatus, TaskPriority } from "@/lib/supabase/database.types";

interface TodayActionsProps {
  tasks: TaskWithRisk[];
  mutatingTaskIds: Set<string>;
  onToggleTaskStatus: (taskId: string, currentStatus: TaskStatus) => Promise<{ error?: string }>;
  onSelectFocusTask: (task: TaskWithRisk) => void;
  onOpenRiskModal: (task: TaskWithRisk) => void;
  onNewTaskClick: () => void;
  onCountsChange?: (completed: number, total: number) => void;
  isLocalPreview?: boolean;
}

interface DefaultPriorityTask {
  id: string;
  title: string;
  completed: boolean;
  priorityColor: string; // hex color for flag
  priority: TaskPriority;
}

const DEFAULT_PRIORITY_TASKS: DefaultPriorityTask[] = [
  {
    id: "default-task-1",
    title: "Review project milestone",
    completed: true,
    priorityColor: "#22C55E", // green
    priority: "low",
  },
  {
    id: "default-task-2",
    title: "30 min focused work",
    completed: true,
    priorityColor: "#22C55E", // green
    priority: "low",
  },
  {
    id: "default-task-3",
    title: "Go for a walk",
    completed: false,
    priorityColor: "#EAB308", // yellow
    priority: "medium",
  },
  {
    id: "default-task-4",
    title: "Write daily reflection",
    completed: false,
    priorityColor: "#F97316", // orange
    priority: "medium",
  },
  {
    id: "default-task-5",
    title: "Plan tomorrow",
    completed: false,
    priorityColor: "#EF4444", // red
    priority: "high",
  },
];

export function TodayActions({
  tasks,
  mutatingTaskIds,
  onToggleTaskStatus,
  onSelectFocusTask,
  onOpenRiskModal,
  onNewTaskClick,
  onCountsChange,
  isLocalPreview = true,
}: TodayActionsProps) {
  // Deterministic initial state ensures server render and first client render match exactly
  const [localDefaultTasks, setLocalDefaultTasks] = useState<DefaultPriorityTask[]>(DEFAULT_PRIORITY_TASKS);
  const isMountedRef = useRef(false);

  // Inline add and edit state for preview mode
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");

  // Restore client-persisted priority task states safely after initial hydration in preview mode
  useEffect(() => {
    if (!isLocalPreview) return;
    try {
      const stored = localStorage.getItem("dueline_priorities_state_v1");
      if (stored) {
        setLocalDefaultTasks(JSON.parse(stored));
      }
    } catch {
      // Fallback to default
    }
  }, [isLocalPreview]);

  // Persist local defaults on updates only after mount in preview mode
  useEffect(() => {
    if (!isLocalPreview) return;
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    try {
      localStorage.setItem("dueline_priorities_state_v1", JSON.stringify(localDefaultTasks));
    } catch {
      // Ignore
    }
  }, [localDefaultTasks, isLocalPreview]);

  // Calculate completed count
  const { completedCount, totalCount } = useMemo(() => {
    if (!isLocalPreview) {
      const completed = tasks.filter((t) => t.status === "completed").length;
      return { completedCount: completed, totalCount: tasks.length };
    }
    const completed = localDefaultTasks.filter((t) => t.completed).length;
    return { completedCount: completed, totalCount: localDefaultTasks.length };
  }, [isLocalPreview, tasks, localDefaultTasks]);

  // Synchronize counts to parent for progress card integration
  const lastCountsRef = useRef({ completed: -1, total: -1 });
  useEffect(() => {
    if (
      lastCountsRef.current.completed !== completedCount ||
      lastCountsRef.current.total !== totalCount
    ) {
      lastCountsRef.current = { completed: completedCount, total: totalCount };
      onCountsChange?.(completedCount, totalCount);
    }
  }, [completedCount, totalCount, onCountsChange]);

  const handleToggleDefaultTask = (id: string) => {
    setLocalDefaultTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleSaveNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const priorityColor =
      newPriority === "high" ? "#EF4444" : newPriority === "medium" ? "#F97316" : "#22C55E";
    const newTask: DefaultPriorityTask = {
      id: `default-task-${Date.now()}`,
      title: trimmed,
      completed: false,
      priority: newPriority,
      priorityColor,
    };
    setLocalDefaultTasks((prev) => [...prev, newTask]);
    setNewTitle("");
    setIsAddingTask(false);
  };

  const handleStartEdit = (task: DefaultPriorityTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
  };

  const handleSaveEdit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    const priorityColor =
      editPriority === "high" ? "#EF4444" : editPriority === "medium" ? "#F97316" : "#22C55E";
    setLocalDefaultTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              title: trimmed,
              priority: editPriority,
              priorityColor,
            }
          : t
      )
    );
    setEditingTaskId(null);
  };

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalDefaultTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const getPriorityColor = (priority: TaskPriority, isCompleted: boolean): string => {
    if (isCompleted) return "#22C55E";
    switch (priority) {
      case "high":
        return "#EF4444"; // red
      case "medium":
        return "#F97316"; // orange
      case "low":
      default:
        return "#EAB308"; // yellow
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E8E1] p-4 sm:p-6 md:p-7 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#EEF2EC]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF2EB] flex items-center justify-center text-[#255243] shrink-0">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#16332C] font-serif truncate">
            Today&apos;s Priorities
          </h2>
        </div>

        <span className="text-xs text-[#6B857C] font-medium shrink-0">
          {completedCount} of {totalCount} completed
        </span>
      </div>

      {/* Task List */}
      <div className="pt-4 space-y-3.5">
        {!isLocalPreview ? (
          // Authenticated cloud tasks from Supabase
          tasks.length > 0 ? (
            tasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isMutating = mutatingTaskIds.has(task.id);
              const flagColor = getPriorityColor(task.priority, isCompleted);

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 group py-0.5"
                >
                  {/* Left: Custom Checkbox & Strikethrough Title */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task.id, task.status)}
                      disabled={isMutating}
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-[#2E7D32] border border-[#2E7D32] text-white shadow-2xs"
                          : "border-2 border-[#CBD5CB] hover:border-[#2E7D32] text-transparent"
                      } disabled:opacity-50`}
                      aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                    >
                      {isMutating ? (
                        <Loader2 className="w-3 h-3 text-[#2E7D32] animate-spin" />
                      ) : isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                      ) : null}
                    </button>

                    <span
                      onClick={() => onSelectFocusTask(task)}
                      className={`text-sm tracking-tight truncate cursor-pointer transition-colors ${
                        isCompleted
                          ? "line-through text-[#8C9B94]"
                          : "font-medium text-[#193B35] hover:text-emerald-700"
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  {/* Right: Priority Flag & Assessment Modal Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenRiskModal(task)}
                      className="p-1 rounded hover:bg-[#F2F5F0] transition cursor-pointer"
                      title={`Priority: ${task.priority} (Click for workload breakdown)`}
                    >
                      <Flag
                        className="w-4 h-4 fill-current transition-transform group-hover:scale-110"
                        style={{ color: flagColor }}
                      />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm text-[#6B857C]">No priority tasks scheduled for today.</p>
              <button
                type="button"
                onClick={onNewTaskClick}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#193B35] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add your first priority task</span>
              </button>
            </div>
          )
        ) : (
          // Default mockup tasks (Exact match to visual reference)
          localDefaultTasks.map((task) => {
            const isCompleted = task.completed;
            const isEditing = editingTaskId === task.id;
            const flagColor = isCompleted ? "#22C55E" : task.priorityColor;

            if (isEditing) {
              return (
                <form
                  key={task.id}
                  onSubmit={(e) => handleSaveEdit(task.id, e)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-[#F6F8F5] border border-[#D5E2D1] animate-in fade-in"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    className="flex-1 text-sm bg-transparent border-none text-[#193B35] focus:outline-none"
                    placeholder="Task title..."
                  />
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="text-xs bg-white border border-[#CBD5CB] rounded-md px-1.5 py-1 text-[#193B35]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <button
                    type="submit"
                    className="p-1 rounded-md bg-[#193B35] text-white hover:bg-[#122B27] cursor-pointer"
                    title="Save"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTaskId(null)}
                    className="p-1 rounded-md text-[#6B857C] hover:bg-black/5 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              );
            }

            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 group py-0.5"
              >
                {/* Left: Custom Checkbox & Title */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleDefaultTask(task.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      isCompleted
                        ? "bg-[#2E7D32] border border-[#2E7D32] text-white shadow-2xs"
                        : "border-2 border-[#CBD5CB] hover:border-[#2E7D32] text-transparent"
                    }`}
                    aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                  </button>

                  <span
                    onClick={() => handleToggleDefaultTask(task.id)}
                    className={`text-sm tracking-tight truncate cursor-pointer select-none transition-colors ${
                      isCompleted
                        ? "line-through text-[#8C9B94]"
                        : "font-medium text-[#193B35] hover:text-emerald-700"
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Right: Quick actions on hover + Priority Flag */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(task, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#6B857C] hover:text-[#193B35] hover:bg-[#EEF2EC] rounded cursor-pointer"
                    title="Edit task"
                    aria-label={`Edit ${task.title}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#6B857C] hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title="Delete task"
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div
                    className="p-1"
                    title={`Priority: ${task.priority}`}
                  >
                    <Flag
                      className="w-4 h-4 fill-current transition-transform group-hover:scale-110"
                      style={{ color: flagColor }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: + Add task or Inline Add Form */}
      <div className="pt-4 mt-2 border-t border-[#EEF2EC]">
        {isAddingTask ? (
          <form
            onSubmit={handleSaveNewTask}
            className="flex items-center gap-2 p-2 rounded-xl bg-[#F6F8F5] border border-[#D5E2D1] animate-in fade-in"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              placeholder="Enter new task..."
              className="flex-1 text-sm bg-transparent border-none text-[#193B35] placeholder:text-[#8C9E96] focus:outline-none"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="text-xs bg-white border border-[#CBD5CB] rounded-md px-1.5 py-1 text-[#193B35]"
            >
              <option value="low">Low (Green)</option>
              <option value="medium">Medium (Orange)</option>
              <option value="high">High (Red)</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1 rounded-md bg-[#193B35] text-white text-xs font-semibold hover:bg-[#122B27] cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingTask(false);
                setNewTitle("");
              }}
              className="p-1 rounded-md text-[#6B857C] hover:bg-black/5 cursor-pointer"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!isLocalPreview) {
                onNewTaskClick();
              } else {
                setIsAddingTask(true);
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#3D6355] hover:text-[#193B35] transition-colors cursor-pointer group"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] text-[#3D6355] group-hover:scale-110 transition-transform" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}
