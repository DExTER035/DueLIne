"use client";

/**
 * progress-indicator.tsx - Clean Progress Indicator Component.
 */

import React from "react";

interface ProgressIndicatorProps {
  label: string;
  value: number; // 0 to 100
  sublabel?: string;
  className?: string;
}

export function ProgressIndicator({
  label,
  value,
  sublabel,
  className = "",
}: ProgressIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {label}
        </span>
        <span className="font-bold" style={{ color: "var(--brand-accent)" }}>
          {clamped}%
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--border-subtle)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: "var(--brand-primary)",
          }}
        />
      </div>
      {sublabel && (
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

