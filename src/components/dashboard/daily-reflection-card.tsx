"use client";

/**
 * daily-reflection-card.tsx - Daily Reflection Card matching DueLine Visual Reference Mockup.
 *
 * Implements:
 * - Header: Pencil icon and serif title "Daily Reflection"
 * - Crisp white card with light borders.
 * - Clean reflection textarea with placeholder: "What went well today? What did you learn?"
 * - Auto-saves securely in browser localStorage (strictly private, zero external exposure).
 */

import React, { useState, useEffect } from "react";
import { Pencil, Check } from "lucide-react";
import { formatIsoDate } from "@/lib/dashboard-calculations";

export function DailyReflectionCard() {
  const [todayIso] = useState(() => formatIsoDate(new Date()));
  const storageKey = `dueline_daily_reflection_${todayIso}`;

  const [reflectionText, setReflectionText] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setReflectionText(stored);
    } catch {
      // Storage access blocked
    }
  }, [storageKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReflectionText(val);
    try {
      localStorage.setItem(storageKey, val);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch {
      // Storage blocked
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E8E1] p-4 sm:p-6 md:p-7 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <Pencil className="w-4 h-4 text-[#193B35]" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#16332C] font-serif">
            Daily Reflection
          </h2>
        </div>

        {isSaved && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 animate-in fade-in">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
      </div>

      {/* Input box matching mockup */}
      <div>
        <textarea
          rows={3}
          value={reflectionText}
          onChange={handleChange}
          placeholder="What went well today? What did you learn?"
          className="w-full p-4 rounded-2xl border border-[#E4E8E1] bg-[#F9FAF8] text-sm text-[#193B35] placeholder:text-[#8C9E96] focus:outline-none focus:ring-1 focus:ring-emerald-600 transition resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
