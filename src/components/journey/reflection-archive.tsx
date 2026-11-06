"use client";

/**
 * reflection-archive.tsx - Device-Local Reflection Journal & Archive for Journey.
 *
 * Implements:
 * - Device-local privacy boundary: stored strictly in browser localStorage, not cloud-synced.
 * - Composer for capturing today's private reflection.
 * - Reverse-chronological reflection archive.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Lock,
  HardDrive,
  Check,
  Calendar,
  PenLine,
  Quote,
} from "lucide-react";
import { formatIsoDate } from "@/lib/dashboard-calculations";
import type { LocalReflectionItem } from "@/hooks/use-journey-workspace";

interface ReflectionArchiveProps {
  reflections: LocalReflectionItem[];
  onSaveReflection: (text: string, targetDate?: string) => void;
}

export function ReflectionArchive({
  reflections,
  onSaveReflection,
}: ReflectionArchiveProps) {
  const [todayIso] = useState(() => formatIsoDate(new Date()));
  // Deterministic initial state prevents hydration mismatch between SSR and client
  const [todayInput, setTodayInput] = useState<string>("");
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      const existingToday = reflections.find((r) => r.date === todayIso);
      if (existingToday) {
        setTodayInput(existingToday.text);
      } else {
        try {
          const stored = localStorage.getItem(`dueline_daily_reflection_${todayIso}`);
          if (stored) {
            setTodayInput(stored);
          }
        } catch {}
      }
    }
  }, [reflections, todayIso]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleSaveToday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayInput.trim()) return;
    onSaveReflection(todayInput.trim(), todayIso);
    setSaveStatus("saved");
    setTimeout(() => {
      setSaveStatus("idle");
    }, 2000);
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#E4E8E1] bg-white p-5 sm:p-6 shadow-xs transition-all space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--brand-accent-soft)] text-[var(--brand-primary)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Daily Reflections
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
              <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Private Memory Layer</span>
              <span className="text-[var(--border-subtle)]">•</span>
              <span>{reflections.length} entry{reflections.length === 1 ? "" : "ies"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Device-Local Privacy Boundary Callout */}
      <div className="rounded-xl p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
          <HardDrive className="w-3.5 h-3.5 shrink-0" />
          <span>Stored on this device — Private & Offline</span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Reflections are kept in your browser&apos;s local storage. They are never sent to a cloud server or shared with any other user.
        </p>
      </div>

      {/* Today's Reflection Composer */}
      <form onSubmit={handleSaveToday} className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="today-reflection-input"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]"
          >
            <PenLine className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Today&apos;s Reflection ({todayIso})</span>
          </label>
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              Saved to device
            </span>
          )}
        </div>

        <textarea
          id="today-reflection-input"
          rows={3}
          value={todayInput}
          onChange={(e) => setTodayInput(e.target.value)}
          placeholder="Capture an insight, win, or lesson from today's work..."
          className="w-full p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!todayInput.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "#ffffff",
            }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Reflection</span>
          </button>
        </div>
      </form>

      {/* Archive List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Previous Reflections
          </h3>
          {reflections.length > 3 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-[var(--brand-primary)] hover:underline font-semibold"
            >
              {isExpanded ? "Show Fewer" : `View All (${reflections.length})`}
            </button>
          )}
        </div>

        {reflections.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-[var(--border-subtle)] text-center space-y-2">
            <Quote className="w-6 h-6 mx-auto text-[var(--text-muted)] opacity-50" />
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              No daily reflections recorded yet
            </p>
            <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
              Taking a minute each day to record your thoughts builds a lasting personal growth journal.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {(isExpanded ? reflections : reflections.slice(0, 3)).map((item) => (
              <div
                key={item.date}
                className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-2 transition-all"
              >
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                    <Calendar className="w-3 h-3 text-[var(--brand-primary)]" />
                    {item.formattedDate}
                  </span>
                  <span className="font-mono text-[10px]">{item.date}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
