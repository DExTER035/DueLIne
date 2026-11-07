-- =========================================================================
-- DueLine — Stage 2A: Supabase Database Foundation
-- Migration: 0002_indexes_and_triggers.sql
-- Description: Performance indexes, case-insensitive uniqueness,
--              automatic updated_at timestamps, completed_at synchronization,
--              and cross-table referential integrity triggers.
-- =========================================================================

-- =========================================================================
-- 1. INDEXES
-- Covering foreign keys, search boundaries, and frequent query filters.
-- =========================================================================

-- Profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles (lower(username));

CREATE INDEX IF NOT EXISTS idx_profiles_persona 
ON public.profiles (persona);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_owner_id 
ON public.projects (owner_id);

CREATE INDEX IF NOT EXISTS idx_projects_status 
ON public.projects (status);

CREATE INDEX IF NOT EXISTS idx_projects_target_date 
ON public.projects (target_date);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
ON public.tasks (project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_id 
ON public.tasks (owner_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status 
ON public.tasks (status);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
ON public.tasks (due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_status_due 
ON public.tasks (owner_id, status, due_date);

-- Milestones
CREATE INDEX IF NOT EXISTS idx_milestones_project_id 
ON public.milestones (project_id);

CREATE INDEX IF NOT EXISTS idx_milestones_owner_id 
ON public.milestones (owner_id);

CREATE INDEX IF NOT EXISTS idx_milestones_target_date 
ON public.milestones (target_date);

-- Task Events
CREATE INDEX IF NOT EXISTS idx_task_events_task_id 
ON public.task_events (task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_events_owner_id 
ON public.task_events (owner_id, created_at DESC);

-- =========================================================================
-- 2. TRIGGER FUNCTIONS
-- =========================================================================

-- Function: Automatically maintain updated_at on record mutation
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Function: Automatically synchronize completed_at with task status
CREATE OR REPLACE FUNCTION public.fn_sync_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Moving to completed status
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status <> 'completed') THEN
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at := timezone('utc'::text, now());
        END IF;
    -- Moving away from completed status
    ELSIF NEW.status <> 'completed' AND (TG_OP = 'UPDATE' AND OLD.status = 'completed') THEN
        NEW.completed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

-- Function: Validate that task owner_id matches parent project owner_id
CREATE OR REPLACE FUNCTION public.fn_validate_task_project_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_project_owner UUID;
BEGIN
    SELECT owner_id INTO v_project_owner
    FROM public.projects
    WHERE id = NEW.project_id;

    IF v_project_owner IS NULL THEN
        RAISE EXCEPTION 'Parent project % does not exist', NEW.project_id;
    END IF;

    IF v_project_owner <> NEW.owner_id THEN
        RAISE EXCEPTION 'Task owner_id (%) must match parent project owner_id (%)', NEW.owner_id, v_project_owner;
    END IF;

    RETURN NEW;
END;
$$;

-- Function: Validate that milestone owner_id matches parent project owner_id
CREATE OR REPLACE FUNCTION public.fn_validate_milestone_project_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_project_owner UUID;
BEGIN
    SELECT owner_id INTO v_project_owner
    FROM public.projects
    WHERE id = NEW.project_id;

    IF v_project_owner IS NULL THEN
        RAISE EXCEPTION 'Parent project % does not exist', NEW.project_id;
    END IF;

    IF v_project_owner <> NEW.owner_id THEN
        RAISE EXCEPTION 'Milestone owner_id (%) must match parent project owner_id (%)', NEW.owner_id, v_project_owner;
    END IF;

    RETURN NEW;
END;
$$;

-- Function: Validate that task_event owner_id matches parent task owner_id
CREATE OR REPLACE FUNCTION public.fn_validate_task_event_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_task_owner UUID;
BEGIN
    SELECT owner_id INTO v_task_owner
    FROM public.tasks
    WHERE id = NEW.task_id;

    IF v_task_owner IS NULL THEN
        RAISE EXCEPTION 'Parent task % does not exist', NEW.task_id;
    END IF;

    IF v_task_owner <> NEW.owner_id THEN
        RAISE EXCEPTION 'Task event owner_id (%) must match parent task owner_id (%)', NEW.owner_id, v_task_owner;
    END IF;

    RETURN NEW;
END;
$$;

-- =========================================================================
-- 3. TRIGGER ATTACHMENTS
-- =========================================================================

-- updated_at Triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_milestones_updated_at ON public.milestones;
CREATE TRIGGER trg_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_updated_at();

-- Task completed_at Synchronization Trigger
DROP TRIGGER IF EXISTS trg_tasks_sync_completed_at ON public.tasks;
CREATE TRIGGER trg_tasks_sync_completed_at
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_task_completed_at();

-- Cross-table Ownership Integrity Triggers
DROP TRIGGER IF EXISTS trg_tasks_validate_ownership ON public.tasks;
CREATE TRIGGER trg_tasks_validate_ownership
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_task_project_ownership();

DROP TRIGGER IF EXISTS trg_milestones_validate_ownership ON public.milestones;
CREATE TRIGGER trg_milestones_validate_ownership
BEFORE INSERT OR UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_milestone_project_ownership();

DROP TRIGGER IF EXISTS trg_task_events_validate_ownership ON public.task_events;
CREATE TRIGGER trg_task_events_validate_ownership
BEFORE INSERT OR UPDATE ON public.task_events
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_task_event_ownership();

