"use client";

/**
 * page-header.tsx - Standardized Page Header Component.
 *
 * Implements clean editorial typography for main module headings
 * with optional badge and action slot.
 */

import React from "react";

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  badge?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  heading,
  subheading,
  badge,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b transition-colors ${className}`}
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="space-y-1.5 max-w-2xl">
        <div className="flex items-center gap-2.5">
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {heading}
          </h1>
          {badge && (
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: "var(--brand-accent-soft)",
                borderColor: "var(--border-strong)",
                color: "var(--brand-accent)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subheading && (
          <p
            className="text-sm sm:text-base leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {subheading}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
}

