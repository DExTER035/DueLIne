"use client";

/**
 * /settings/page.tsx - Workspace Settings and Preferences.
 *
 * Implements theme controls (Light, Dark, System), user profile review,
 * and security indicators.
 */

import React from "react";
import { Sun, Moon, Laptop, ShieldCheck, User } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { useTheme, Theme } from "@/components/theme/theme-provider";
import { useAuth } from "@/components/auth/auth-provider";

export default function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();

  const THEME_OPTIONS: Array<{
    id: Theme;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "light",
      label: "Light Theme",
      desc: "Soft White and Ivory canvas with Deep Forest contrast",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Theme",
      desc: "Deep Forest Night background with Mist Green accents",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Match",
      desc: "Automatically adapts based on your operating system preferences",
      icon: Laptop,
    },
  ];

  return (
    <WorkspaceLayout>
      <div className="space-y-8 animate-in fade-in duration-200 max-w-4xl">
        <PageHeader
          heading="Workspace Settings"
          subheading="Configure your workspace appearance, profile information, and system preferences."
        />

        {/* Theme Preferences */}
        <div
          className="rounded-2xl border p-6 space-y-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <SectionHeader title="Appearance & Theme" />
          <p className="text-xs text-[var(--text-muted)] -mt-2">
            Select the visual theme for your DueLine workspace. Currently resolved as{" "}
            <strong className="text-[var(--text-primary)] font-semibold uppercase">
              {resolvedTheme}
            </strong>
            .
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer active:scale-[0.98] ${
                    isSelected
                      ? "ring-2 ring-[var(--brand-primary)] border-[var(--brand-primary)] shadow-xs"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? "var(--brand-accent-soft)"
                      : "var(--bg-surface-subtle)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <Icon
                      className={`w-5 h-5 ${
                        isSelected
                          ? "text-[var(--brand-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
                    )}
                  </div>
                  <div>
                    <p
                      className="text-xs font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {opt.label}
                    </p>
                    <p
                      className="text-[11px] leading-relaxed mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile & Security Information */}
        <div
          className="rounded-2xl border p-6 space-y-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <SectionHeader title="Account & Identity" />

          {isAuthenticated && user ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold tracking-wider">
                    Display Name
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] mt-1 block">
                    {(user.user_metadata?.display_name as string) || "Not set"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold tracking-wider">
                    Username
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] mt-1 block">
                    @{(user.user_metadata?.username as string) || "user"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold tracking-wider">
                  Email
                </span>
                <span className="font-semibold text-[var(--text-primary)] mt-1 block">
                  {user.email}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs">
              <User className="w-5 h-5 text-[var(--text-secondary)]" />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  Browsing as Guest
                </p>
                <p className="text-[var(--text-muted)]">
                  Sign in or create an account to persist your tasks and goals across devices.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-[var(--brand-accent)]" />
            <span>Database RLS Tenant Isolation active</span>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

