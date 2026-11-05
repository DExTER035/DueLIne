"use client";

/**
 * mobile-navigation.tsx - Accessible Mobile Navigation Drawer & Bottom Bar.
 *
 * Provides:
 * 1. Slide-over drawer with full module navigation, settings, and branding.
 * 2. Bottom touch bar for rapid thumb-based switching between core modules.
 */

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Settings, ShieldCheck, Home, Target, BarChart2, BookOpen } from "lucide-react";
import { NAV_MODULES, type NavModule } from "@/lib/navigation";

const MODULE_ICONS: Record<NavModule["id"], React.ComponentType<{ className?: string }>> = {
  today: Home,
  goals: Target,
  journey: BarChart2,
  chapters: BookOpen,
};

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const pathname = usePathname();

  // Close drawer on path change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* 1. Slide-Over Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            className="relative w-4/5 max-w-xs h-full flex flex-col p-6 shadow-2xl z-10 animate-in slide-in-from-left duration-200"
            style={{
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  D
                </div>
                <div>
                  <h2 className="text-base font-extrabold leading-none">
                    DueLine
                  </h2>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">
                    Growth & Clarity
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center border text-[var(--text-secondary)] border-[var(--border-subtle)]"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 py-6 space-y-1.5 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-2">
                Primary Modules
              </p>
              {NAV_MODULES.map((item) => {
                const Icon = MODULE_ICONS[item.id];
                const isActive =
                  pathname === item.href ||
                  (item.href === "/today" && pathname === "/");

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3.5 px-3 py-3 rounded-xl text-xs font-semibold transition"
                    style={{
                      backgroundColor: isActive
                        ? "var(--brand-accent-soft)"
                        : "transparent",
                      color: isActive
                        ? "var(--brand-primary)"
                        : "var(--text-secondary)",
                    }}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <div>{item.label}</div>
                      <div className="text-[10px] font-normal text-[var(--text-muted)]">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-2">
                  System
                </p>
                <Link
                  href="/settings"
                  onClick={onClose}
                  className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings & Preferences</span>
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <ShieldCheck className="w-4 h-4 text-[var(--brand-accent)]" />
                <span>Protected by PostgreSQL RLS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fixed Mobile Bottom Bar (< md) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 w-full h-16 border-t z-30 px-2 flex items-center justify-between backdrop-blur-md"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "var(--border-subtle)",
        }}
        aria-label="Mobile Bottom Navigation"
      >
        {NAV_MODULES.map((item) => {
          const Icon = MODULE_ICONS[item.id];
          const isActive =
            pathname === item.href ||
            (item.href === "/today" && pathname === "/");

          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1 text-center transition-all active:scale-95"
              style={{
                color: isActive ? "#193B35" : "#6B857C",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? "bg-[#E8F3EB] text-[#193B35]" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#193B35]" : "text-[#6B857C]"}`} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? "font-bold text-[#193B35]" : "font-medium text-[#6B857C]"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
