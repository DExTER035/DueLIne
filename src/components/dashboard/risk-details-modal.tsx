"use client";

/**
 * risk-details-modal.tsx - Deterministic Risk Analysis Modal for DueLine Tasks.
 *
 * Displays full mathematical workload audit:
 * - Deadline date and calendar days remaining
 * - Available working-time calculation (days * 8.0h)
 * - Estimated working hours needed
 * - Workload ratio / buffer analysis
 * - Authoritative reason from src/lib/risk.ts
 */

import React from "react";
import {
  X,
  AlertTriangle,
  Clock,
  ShieldCheck,
  AlertOctagon,
  CheckCircle,
  HelpCircle,
  Calendar,
  Hourglass,
  Layers,
} from "lucide-react";
import type { TaskWithRisk } from "@/hooks/use-today-dashboard";
import type { RiskStatus } from "@/lib/risk";

interface RiskDetailsModalProps {
  task: TaskWithRisk | null;
  onClose: () => void;
}

export function RiskDetailsModal({ task, onClose }: RiskDetailsModalProps) {
  if (!task) return null;

  const { assessment, projectName, title, due_date, estimated_hours } = task;
  const status: RiskStatus = assessment.status;

  const getStatusBadge = () => {
    switch (status) {
      case "HIGH":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            HIGH RISK
          </div>
        );
      case "MEDIUM":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
            <Clock className="w-3.5 h-3.5" />
            MEDIUM RISK
          </div>
        );
      case "LOW":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
            <ShieldCheck className="w-3.5 h-3.5" />
            LOW RISK
          </div>
        );
      case "OVERDUE":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
            <AlertOctagon className="w-3.5 h-3.5" />
            OVERDUE
          </div>
        );
      case "COMPLETED":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--brand-accent-soft)] text-[var(--brand-primary)] border border-[var(--border-subtle)]">
            <CheckCircle className="w-3.5 h-3.5" />
            COMPLETED
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <HelpCircle className="w-3.5 h-3.5" />
            NO DEADLINE / INVALID
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              {projectName && (
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  · {projectName}
                </span>
              )}
            </div>
            <h2
              id="modal-title"
              className="text-lg font-bold text-[var(--text-primary)] leading-snug"
            >
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Explanation Box */}
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
            Deterministic Engine Diagnosis
          </p>
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {assessment.explanation}
          </p>
        </div>

        {/* Mathematical Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Target Deadline</span>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
              {due_date || "Not specified"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {assessment.remainingDays !== null
                ? assessment.remainingDays < 0
                  ? `${Math.abs(assessment.remainingDays)} days overdue`
                  : assessment.remainingDays === 0
                  ? "Due today"
                  : `${assessment.remainingDays} days remaining`
                : "No valid date"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Hourglass className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Estimated Hours</span>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
              {estimated_hours}h required
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Workload estimate
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Available Time</span>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
              {assessment.availableHours !== null ? `${assessment.availableHours}h available` : "N/A"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              8h per calendar day
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Layers className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Buffer Assessment</span>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
              {status === "HIGH"
                ? "Deficit"
                : status === "MEDIUM"
                ? "Tight (<20%)"
                : status === "LOW"
                ? "Safe (>20%)"
                : status === "OVERDUE"
                ? "Expired"
                : "Standard"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {status === "HIGH"
                ? "Work exceeds available time"
                : status === "MEDIUM"
                ? "Buffer is less than 20%"
                : status === "LOW"
                ? "Ample safety margin"
                : "Check parameters"}
            </p>
          </div>
        </div>

        {/* Actionable Advice */}
        {status === "HIGH" && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 space-y-1">
            <p className="font-bold">Recommended Mitigation:</p>
            <p>
              Break this task into smaller milestone increments or adjust the deadline forward to allow a sustainable 20% safety buffer.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-primary)] text-white hover:opacity-90 transition active:scale-95"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

