"use client";

/**
 * theme-toggle.tsx - Accessible Theme Switcher Component.
 *
 * Provides quick toggle between Light, Dark, and System modes with Lucide icons.
 */

import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, Theme } from "@/components/theme/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleNext = () => {
    const cycle: Record<Theme, Theme> = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    setTheme(cycle[theme]);
  };

  return (
    <button
      onClick={handleNext}
      type="button"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 active:scale-95 ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
      title={`Current: ${theme} (resolved: ${resolvedTheme}). Click to cycle.`}
      aria-label={`Switch theme (currently ${theme})`}
    >
      {theme === "system" ? (
        <Laptop className="w-4 h-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="w-4 h-4 text-amber-300" />
      ) : (
        <Sun className="w-4 h-4 text-amber-600" />
      )}
    </button>
  );
}

