-- =========================================================================
-- DueLine — Stage 2A: Supabase Database Foundation
-- Migration: 0003_row_level_security.sql
-- Description: Strict tenant isolation using PostgreSQL Row Level Security (RLS).
--              Enforces auth.uid() ownership across all core tables,
--              preventing IDOR, cross-tenant leaks, and unauthorized reassignments.
-- =========================================================================

-- =========================================================================
-- 1. ENABLE & FORCE ROW LEVEL SECURITY
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones FORCE ROW LEVEL SECURITY;

ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. PROFILES POLICIES
-- =========================================================================

-- SELECT: Users can only view their own profile in Stage 2A
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- INSERT: Users can only create their own profile record (matching auth.uid())
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: Users can only update their own profile, cannot reassign id
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- DELETE: Direct client deletion is denied; cascade from auth.users only
DROP POLICY IF EXISTS profiles_delete_deny ON public.profiles;
CREATE POLICY profiles_delete_deny ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- =========================================================================
-- 3. PROJECTS POLICIES
-- =========================================================================

-- SELECT: Users can only view projects they own
DROP POLICY IF EXISTS projects_select_own ON public.projects;
CREATE POLICY projects_select_own ON public.projects
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- INSERT: Users can only create projects where they are the owner
DROP POLICY IF EXISTS projects_insert_own ON public.projects;
CREATE POLICY projects_insert_own ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Users can only update their own projects and cannot transfer owner_id
DROP POLICY IF EXISTS projects_update_own ON public.projects;
CREATE POLICY projects_update_own ON public.projects
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Users can only delete their own projects
DROP POLICY IF EXISTS projects_delete_own ON public.projects;
CREATE POLICY projects_delete_own ON public.projects
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =========================================================================
-- 4. TASKS POLICIES
-- =========================================================================

-- SELECT: Users can only view tasks they own
DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
CREATE POLICY tasks_select_own ON public.tasks
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- INSERT: Users can only create tasks for themselves in projects they own
DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
CREATE POLICY tasks_insert_own ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
);

-- UPDATE: Users can only update their own tasks in projects they own; owner_id is immutable
DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
CREATE POLICY tasks_update_own ON public.tasks
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
);

-- DELETE: Users can only delete their own tasks
DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
CREATE POLICY tasks_delete_own ON public.tasks
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =========================================================================
-- 5. MILESTONES POLICIES
-- =========================================================================

-- SELECT: Users can only view milestones they own
DROP POLICY IF EXISTS milestones_select_own ON public.milestones;
CREATE POLICY milestones_select_own ON public.milestones
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- INSERT: Users can only create milestones in projects they own
DROP POLICY IF EXISTS milestones_insert_own ON public.milestones;
CREATE POLICY milestones_insert_own ON public.milestones
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
);

-- UPDATE: Users can only update their own milestones in projects they own
DROP POLICY IF EXISTS milestones_update_own ON public.milestones;
CREATE POLICY milestones_update_own ON public.milestones
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
);

-- DELETE: Users can only delete their own milestones
DROP POLICY IF EXISTS milestones_delete_own ON public.milestones;
CREATE POLICY milestones_delete_own ON public.milestones
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =========================================================================
-- 6. TASK_EVENTS POLICIES
-- =========================================================================

-- SELECT: Users can only view events for tasks they own
DROP POLICY IF EXISTS task_events_select_own ON public.task_events;
CREATE POLICY task_events_select_own ON public.task_events
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- INSERT: Users can only log events for tasks they own
DROP POLICY IF EXISTS task_events_insert_own ON public.task_events;
CREATE POLICY task_events_insert_own ON public.task_events
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND t.owner_id = auth.uid()
    )
);

-- UPDATE: Task events are immutable audit records; updates are completely denied
DROP POLICY IF EXISTS task_events_update_deny ON public.task_events;
CREATE POLICY task_events_update_deny ON public.task_events
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- DELETE: Users can only delete their own task events (or automatically on task cascade)
DROP POLICY IF EXISTS task_events_delete_own ON public.task_events;
CREATE POLICY task_events_delete_own ON public.task_events
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

