"use client";

/**
 * focus-section.tsx - Focus Session Misty Forest Card matching Visual Reference Mockup.
 *
 * Implements:
 * - Atmospheric misty pine forest background (/assets/focus-forest.svg)
 * - Centered leaf header: "Focus Session"
 * - Large digital countdown timer: 25:00
 * - Deep evergreen pill button: "▶ Start Focus" / "❚❚ Pause"
 * - Frosted duration preset chips: "25 min", "50 min", "Custom"
 * - Connected to wall-clock useFocusTimer hook.
 */

import React from "react";
import Image from "next/image";
import { Play, Pause, Leaf, Check } from "lucide-react";
import { useFocusTimer } from "@/hooks/use-focus-timer";

interface FocusSectionProps {
  timer: ReturnType<typeof useFocusTimer>;
}

export function FocusSection({ timer }: FocusSectionProps) {
  const {
    taskTitle,
    formattedTime,
    isRunning,
    remainingSeconds,
    totalDurationSeconds,
    start,
    pause,
    setDurationMinutes,
  } = timer;

  const is25Min = totalDurationSeconds === 25 * 60;
  const is50Min = totalDurationSeconds === 50 * 60;
  const isCustom = !is25Min && !is50Min;

  const handleCustomClick = () => {
    const minsStr = prompt("Enter focus duration in minutes (1 to 120):", "15");
    if (!minsStr) return;
    const mins = parseInt(minsStr, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 120) {
      setDurationMinutes(mins);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D5E2D1] shadow-xs min-h-[290px] sm:min-h-[310px] flex flex-col justify-between p-5 sm:p-7 select-none transition-all">
      {/* Misty Forest Background Image */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/assets/focus-forest.svg"
          alt="Misty Forest Focus Scene"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Subtle radial center highlight to ensure crystal-clear text readability */}
        <div className="absolute inset-0 bg-radial from-white/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Top Header: Leaf + Focus Session */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-xs border border-white/40 dark:border-white/10 shadow-2xs">
          <Leaf className="w-4 h-4 text-[#193B35] fill-[#193B35]" />
          <span className="text-sm font-semibold tracking-wide text-[#193B35] dark:text-[#193B35]">
            Focus Session
          </span>
        </div>

        {taskTitle && (
          <p className="text-xs text-[#2A4D40] font-medium mt-1 truncate max-w-xs px-2">
            Task: {taskTitle}
          </p>
        )}
      </div>

      {/* Center: Large Digital Countdown Display */}
      <div className="relative z-10 flex flex-col items-center justify-center my-3">
        <div className="text-5xl sm:text-6xl font-bold tracking-tight text-[#16332C] font-mono drop-shadow-xs">
          {formattedTime}
        </div>
      </div>

      {/* Bottom Controls & Presets */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4">
        {/* Deep Forest Pill Button: ▶ Start Focus */}
        <button
          type="button"
          onClick={isRunning ? pause : start}
          className="px-7 py-2.5 rounded-full bg-[#16332C] hover:bg-[#0E221D] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Focus</span>
            </>
          ) : remainingSeconds === 0 ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Session Done</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Focus</span>
            </>
          )}
        </button>

        {/* Duration Preset Chips */}
        <div className="flex items-center justify-center gap-2">
          {/* 25 min */}
          <button
            type="button"
            onClick={() => setDurationMinutes(25)}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
              is25Min
                ? "bg-white text-[#16332C] font-bold shadow-xs border border-white"
                : "bg-white/60 hover:bg-white/80 text-[#244C3F] font-medium border border-white/50 backdrop-blur-xs"
            }`}
          >
            25 min
          </button>

          {/* 50 min */}
          <button
            type="button"
            onClick={() => setDurationMinutes(50)}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
              is50Min
                ? "bg-white text-[#16332C] font-bold shadow-xs border border-white"
                : "bg-white/60 hover:bg-white/80 text-[#244C3F] font-medium border border-white/50 backdrop-blur-xs"
            }`}
          >
            50 min
          </button>

          {/* Custom */}
          <button
            type="button"
            onClick={handleCustomClick}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
              isCustom
                ? "bg-white text-[#16332C] font-bold shadow-xs border border-white"
                : "bg-white/60 hover:bg-white/80 text-[#244C3F] font-medium border border-white/50 backdrop-blur-xs"
            }`}
          >
            {isCustom ? `${Math.round(totalDurationSeconds / 60)} min` : "Custom"}
          </button>
        </div>
      </div>
    </div>
  );
}
