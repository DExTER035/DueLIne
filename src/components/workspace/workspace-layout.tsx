"use client";

/**
 * workspace-layout.tsx - Main DueLine Workspace Shell Layout.
 *
 * Integrates:
 * - Hybrid navigation: Desktop collapsible sidebar + top navigation bar.
 * - Mobile responsive drawer + bottom quick module navigation.
 * - Preference persistence for sidebar collapse.
 * - Non-overlapping layout with accessible focus management.
 */

import React, { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TopNavigation } from "./top-navigation";
import { MobileNavigation } from "./mobile-navigation";

const SIDEBAR_STORAGE_KEY = "dueline_sidebar_collapsed";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Restore user's sidebar preference safely after initial hydration
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
        setIsSidebarCollapsed(true);
      }
    } catch {
      // Storage access blocked
    }
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage failures
      }
      return next;
    });
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row antialiased overflow-x-hidden"
      style={{
        backgroundColor: "var(--bg-app)",
        color: "var(--text-primary)",
      }}
    >
      {/* 1. Desktop Collapsible Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* 2. Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
        {/* Top Navigation */}
        <TopNavigation
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Dynamic Page Content with mobile bottom bar padding */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 md:px-8 py-3.5 sm:py-6 pb-24 md:pb-12 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation (Drawer & Fixed Bottom Bar) */}
      <MobileNavigation
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
}
