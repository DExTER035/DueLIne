"use client";

/**
 * section-header.tsx - Modular Section Header Component.
 */

import React from "react";

interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  count,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 mb-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <h2
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </h2>
        {count !== undefined && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full"
            style={{
              backgroundColor: "var(--brand-mist-soft)",
              color: "var(--text-secondary)",
            }}
          >
            {count}
          </span>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}

