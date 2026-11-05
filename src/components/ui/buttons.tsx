"use client";

/**
 * buttons.tsx - Accessible Button Primitives for DueLine.
 *
 * Implements Growth & Clarity styling with full keyboard accessibility,
 * focus rings, hover, active, and disabled states.
 */

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function PrimaryButton({
  children,
  icon,
  isLoading,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98] ${className}`}
      style={{
        backgroundColor: "var(--brand-primary)",
        color: "var(--bg-surface)",
      }}
      {...props}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}

export function SecondaryButton({
  children,
  icon,
  isLoading,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${className}`}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({
  children,
  isLoading,
  disabled,
  title,
  ariaLabel,
  className = "",
  ...props
}: ButtonProps & { ariaLabel?: string }) {
  return (
    <button
      disabled={disabled || isLoading}
      title={title}
      aria-label={ariaLabel || title}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${className}`}
      style={{
        color: "var(--text-secondary)",
      }}
      {...props}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        children
      )}
    </button>
  );
}

