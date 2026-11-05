/**
 * navigation.ts - Central Navigation Definitions for DueLine Workspace Shell.
 *
 * Defines primary modules (Today, Goals, Journey, Chapters) and secondary paths.
 * Pure TypeScript module safely importable in both React components and Node test runners.
 */

export interface NavModule {
  id: "today" | "goals" | "journey" | "chapters";
  href: "/today" | "/goals" | "/journey" | "/chapters";
  label: string;
  description: string;
}

export const NAV_MODULES: NavModule[] = [
  {
    id: "today",
    href: "/today",
    label: "Today",
    description: "Daily execution & priorities",
  },
  {
    id: "goals",
    href: "/goals",
    label: "Goals",
    description: "Projects, milestones & ambitions",
  },
  {
    id: "journey",
    href: "/journey",
    label: "Journey",
    description: "Private evidence & progress story",
  },
  {
    id: "chapters",
    href: "/chapters",
    label: "Chapters",
    description: "Messages to your future self",
  },
];

