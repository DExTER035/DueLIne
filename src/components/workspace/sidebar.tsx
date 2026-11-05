"use client";

/**
 * sidebar.tsx - Collapsible Desktop Workspace Sidebar matching DueLine Visual Reference.
 *
 * Implements primary navigation modules (Today, Goals, Journey, Chapters),
 * growth timeline landscape graphic, and user account pill (Alex ★ Premium).
 */

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  BarChart2,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Sparkles,
} from "lucide-react";
import { NAV_MODULES, type NavModule } from "@/lib/navigation";
import { useAuth } from "@/components/auth/auth-provider";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const MODULE_ICONS: Record<NavModule["id"], React.ComponentType<{ className?: string }>> = {
  today: Home,
  goals: Target,
  journey: BarChart2,
  chapters: BookOpen,
};

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const userName = user?.user_metadata?.display_name || (user?.email ? user.email.split("@")[0] : "Alex");

  return (
    <aside
      className={`hidden md:flex flex-col border-r h-screen sticky top-0 transition-all duration-200 ease-in-out z-30 select-none ${
        isCollapsed ? "w-20" : "w-64"
      }`}
      style={{
        backgroundColor: "#132B25",
        borderColor: "#1C3C34",
      }}
      aria-label="Desktop Workspace Sidebar"
    >
      {/* Brand Header */}
      <div
        className={`flex items-center h-20 px-6 transition-all ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link
          href="/today"
          className="flex items-center gap-3 group focus-visible:outline-none"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Leaf className="w-6 h-6 fill-emerald-400 text-emerald-400" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl tracking-tight text-white font-serif">
              DueLine
            </span>
          )}
        </Link>
      </div>

      {/* Primary Modules Navigation */}
      <div className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {NAV_MODULES.map((item) => {
          const Icon = MODULE_ICONS[item.id];
          const isActive =
            pathname === item.href ||
            (item.href === "/today" && (pathname === "/" || pathname === "/today"));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all group relative active:scale-[0.98] ${
                isCollapsed ? "justify-center px-0" : ""
              } ${
                isActive
                  ? "bg-[#214339] text-white border border-[#2B5448] shadow-xs"
                  : "text-[#9BB5A2] hover:text-white hover:bg-[#18362E]"
              }`}
              title={isCollapsed ? `${item.label} — ${item.description}` : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform ${
                  isActive ? "text-white" : "text-[#9BB5A2] group-hover:text-white"
                }`}
              />

              {!isCollapsed && (
                <span className="font-medium tracking-wide">{item.label}</span>
              )}

              {/* Collapsed Tooltip Flyout */}
              {isCollapsed && (
                <div
                  className="fixed left-20 ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border bg-[#1A372F] border-[#2A5246] text-white"
                >
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Landscape Timeline Graphic (Matching Visual Mockup) */}
      {!isCollapsed && (
        <div className="mx-4 mb-3 relative overflow-hidden rounded-2xl border border-[#1C3D34] bg-gradient-to-b from-[#16332C] to-[#0E221D] shadow-inner">
          <div className="relative h-28 w-full">
            <Image
              src="/assets/sidebar-forest.svg"
              alt="Misty Forest Growth Timeline"
              fill
              className="object-cover object-bottom opacity-85"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E221D]/80 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 right-3 flex items-center gap-1.5 text-xs text-[#D1E0D7] font-medium drop-shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Your growth in one timeline.</span>
            </div>
          </div>
        </div>
      )}

      {/* Secondary & Footer Area */}
      <div className="p-4 border-t border-[#1C3C34] space-y-3">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
            isCollapsed ? "justify-center px-0" : ""
          } ${
            pathname === "/settings"
              ? "bg-[#214339] text-white"
              : "text-[#9BB5A2] hover:text-white hover:bg-[#18362E]"
          }`}
          title={isCollapsed ? "Workspace Settings" : undefined}
        >
          <Settings className="w-4 h-4 shrink-0 text-[#9BB5A2] group-hover:text-white" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        {/* User Profile Pill (Alex ★ Premium) */}
        {!isCollapsed && (
          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#18362E]/60 border border-[#20453B]">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-emerald-500/40 shrink-0 shadow-xs">
                <Image
                  src="/assets/avatar-forest.svg"
                  alt={userName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {userName}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                  <span>★</span>
                  <span>Premium</span>
                </div>
              </div>
            </div>

            {/* Development / Offline Preview Status (Discreet & Consistent) */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#18362E]/40 text-[10px] text-[#8EAFA2] font-medium border border-[#20453B]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">Local Preview Mode</span>
            </div>
          </div>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={onToggleCollapse}
          type="button"
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-[#6E8E81] hover:text-white transition-all ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {!isCollapsed && <span className="text-[11px]">Collapse</span>}
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
