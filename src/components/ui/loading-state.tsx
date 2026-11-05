"use client";

/**
 * loading-state.tsx - Accessible Loading Skeleton and Spinner.
 */

import React from "react";

export function LoadingState({
  message = "Loading...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-12 text-center flex flex-col items-center justify-center space-y-4 ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
        style={{
          backgroundColor: "var(--brand-accent-soft)",
          color: "var(--brand-accent)",
        }}
      >
        <div className="loading loading-spinner loading-sm"></div>
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        {message}
      </p>
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-6 space-y-4 animate-pulse ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div
        className="h-4 w-1/3 rounded-md"
        style={{ backgroundColor: "var(--border-subtle)" }}
      />
      <div
        className="h-3 w-3/4 rounded-md"
        style={{ backgroundColor: "var(--bg-surface-subtle)" }}
      />
      <div
        className="h-2 w-full rounded-full"
        style={{ backgroundColor: "var(--border-subtle)" }}
      />
    </div>
  );
}

