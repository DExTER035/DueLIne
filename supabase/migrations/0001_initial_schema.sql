-- =========================================================================
-- DueLine — Stage 2A: Supabase Database Foundation
-- Migration: 0001_initial_schema.sql
-- Description: Core productivity schema (profiles, projects, tasks,
--              milestones, task_events) with UUID keys, deliberate deletion
--              behavior, check constraints, and referential integrity.
-- =========================================================================

-- Enable standard UUID and cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. PROFILES
-- Extends Supabase auth.users with public profile metadata and persona.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    persona TEXT CHECK (persona IN ('student', 'freelancer', 'indie_maker', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_profiles_username_length CHECK (char_length(trim(username)) >= 3 AND char_length(username) <= 30),
    CONSTRAINT chk_profiles_username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT chk_profiles_display_name_length CHECK (char_length(trim(display_name)) >= 1 AND char_length(display_name) <= 100)
);

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with productivity persona and display metadata.';

-- =========================================================================
-- 2. PROJECTS
-- Top-level workspaces owned by a user for organizing goals and deadlines.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_projects_name_length CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 100),
    CONSTRAINT chk_projects_date_order CHECK (start_date IS NULL OR target_date IS NULL OR start_date <= target_date)
);

COMMENT ON TABLE public.projects IS 'Goal workspaces owned by users to track projects and aggregate deadline progress.';

-- =========================================================================
-- 3. TASKS
-- Core actionable workload items associated with a project and an owner.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 1.00 CHECK (estimated_hours >= 0.0),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_tasks_title_length CHECK (char_length(trim(title)) >= 1 AND char_length(title) <= 200)
);

COMMENT ON TABLE public.tasks IS 'Individual tasks with deterministic workload hours, priority, and completion tracking.';

-- =========================================================================
-- 4. MILESTONES
-- Significant target checkpoints within a project.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'achieved', 'missed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_milestones_title_length CHECK (char_length(trim(title)) >= 1 AND char_length(title) <= 200)
);

COMMENT ON TABLE public.milestones IS 'Project milestone checkpoints marking critical delivery stages.';

-- =========================================================================
-- 5. TASK_EVENTS
-- Append-only audit and progress event log capturing task lifecycle changes.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'created',
        'status_changed',
        'priority_changed',
        'due_date_changed',
        'hours_updated',
        'completed',
        'uncompleted',
        'comment_added'
    )),
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.task_events IS 'Immutable activity stream recording status changes, completion, and task adjustments.';

