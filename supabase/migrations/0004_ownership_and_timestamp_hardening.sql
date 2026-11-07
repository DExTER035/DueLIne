-- =========================================================================
-- DueLine — Stage 2A.1: Database Security Review & Static Architecture Compatibility
-- Migration: 0004_ownership_and_timestamp_hardening.sql
-- Description: Hardens cross-table ownership integrity using declarative composite
--              foreign keys, removes procedural validation triggers in favor of
--              native relational constraints, standardizes timestamptz defaults
--              to now(), and sets trigger execution to SECURITY INVOKER.
-- =========================================================================

-- =========================================================================
-- 1. COMPOSITE UNIQUE CONSTRAINTS FOR DECLARATIVE OWNERSHIP
-- =========================================================================

-- Enable composite referencing on projects (id, owner_id)
ALTER TABLE public.projects 
ADD CONSTRAINT uq_projects_id_owner UNIQUE (id, owner_id);

-- Enable composite referencing on tasks (id, owner_id)
ALTER TABLE public.tasks 
ADD CONSTRAINT uq_tasks_id_owner UNIQUE (id, owner_id);

-- =========================================================================
-- 2. DECLARATIVE COMPOSITE FOREIGN KEYS
-- Mathematically prevents child records from pointing to another user's project/task.
-- =========================================================================

-- Tasks must belong to the project owner
ALTER TABLE public.tasks
ADD CONSTRAINT fk_tasks_project_owner 
FOREIGN KEY (project_id, owner_id) 
REFERENCES public.projects (id, owner_id) 
ON DELETE CASCADE;

-- Milestones must belong to the project owner
ALTER TABLE public.milestones
ADD CONSTRAINT fk_milestones_project_owner 
FOREIGN KEY (project_id, owner_id) 
REFERENCES public.projects (id, owner_id) 
ON DELETE CASCADE;

-- Task events must belong to the task owner
ALTER TABLE public.task_events
ADD CONSTRAINT fk_task_events_task_owner 
FOREIGN KEY (task_id, owner_id) 
REFERENCES public.tasks (id, owner_id) 
ON DELETE CASCADE;

-- =========================================================================
-- 3. RETIRE PROCEDURAL OWNERSHIP TRIGGERS
-- Native composite FKs eliminate the need for procedural subquery triggers.
-- =========================================================================

DROP TRIGGER IF EXISTS trg_tasks_validate_ownership ON public.tasks;
DROP TRIGGER IF EXISTS trg_milestones_validate_ownership ON public.milestones;
DROP TRIGGER IF EXISTS trg_task_events_validate_ownership ON public.task_events;

DROP FUNCTION IF EXISTS public.fn_validate_task_project_ownership();
DROP FUNCTION IF EXISTS public.fn_validate_milestone_project_ownership();
DROP FUNCTION IF EXISTS public.fn_validate_task_event_ownership();

-- =========================================================================
-- 4. STANDARDIZE TIMESTAMPTZ DEFAULTS & TRIGGER FUNCTIONS
-- Prefer native now() over timezone('utc'::text, now()) for TIMESTAMPTZ.
-- Use standard SECURITY INVOKER for in-memory timestamp functions.
-- =========================================================================

-- Update default expressions
ALTER TABLE public.profiles 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.projects 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.tasks 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.milestones 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.task_events 
ALTER COLUMN created_at SET DEFAULT now();

-- Update timestamp trigger function to SECURITY INVOKER with now()
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Update completed_at sync trigger function to SECURITY INVOKER with now()
CREATE OR REPLACE FUNCTION public.fn_sync_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status <> 'completed') THEN
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at := now();
        END IF;
    ELSIF NEW.status <> 'completed' AND (TG_OP = 'UPDATE' AND OLD.status = 'completed') THEN
        NEW.completed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

