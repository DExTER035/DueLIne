"use client";

/**
 * error-state.tsx - Accessible Error State Component.
 */

import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-2xl border p-8 text-center flex flex-col items-center justify-center space-y-4 ${className}`}
      style={{
        backgroundColor: "var(--status-high-bg)",
        borderColor: "var(--status-high-border)",
        color: "var(--status-high-text)",
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs opacity-90">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          className="btn btn-xs px-3 rounded-lg font-semibold border-none"
          style={{
            backgroundColor: "var(--status-high-text)",
            color: "var(--status-high-bg)",
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

