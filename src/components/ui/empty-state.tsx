"use client";

/**
 * empty-state.tsx - Empty State Placeholder Component.
 */

import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {icon && (
        <div
          className="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs"
          style={{
            backgroundColor: "var(--bg-surface-subtle)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3
          className="text-base font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

