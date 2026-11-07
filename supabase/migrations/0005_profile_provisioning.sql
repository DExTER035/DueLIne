-- =========================================================================
-- DueLine — Stage 2B & 2B.1: Supabase Authentication Foundation & Hardening
-- Migration: 0005_profile_provisioning.sql
-- Description: Automatic public.profiles row creation via auth.users trigger,
--              metadata sanitization, deterministic UUID collision fallback,
--              concurrent registration safety, and profile insertion security.
-- =========================================================================

-- Function: Automatically creates and populates public.profiles when an auth user registers.
-- Runs with SECURITY DEFINER and an empty search_path to prevent privilege escalation.
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_raw_username TEXT;
    v_clean_username TEXT;
    v_display_name TEXT;
    v_persona TEXT;
    v_avatar_url TEXT;
BEGIN
    -- 1. Extract and sanitize username
    v_raw_username := NEW.raw_user_meta_data->>'username';
    IF v_raw_username IS NOT NULL THEN
        -- Retain only alphanumeric and underscore characters
        v_clean_username := regexp_replace(v_raw_username, '[^a-zA-Z0-9_]', '', 'g');
    END IF;

    -- Enforce valid length constraints (3-30 chars); fallback to user_<id_prefix>
    IF v_clean_username IS NULL OR char_length(v_clean_username) < 3 THEN
        v_clean_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
    ELSIF char_length(v_clean_username) > 30 THEN
        v_clean_username := substr(v_clean_username, 1, 30);
    END IF;

    -- Check case-insensitive uniqueness against committed profiles
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE LOWER(username) = LOWER(v_clean_username)
          AND id <> NEW.id
    ) THEN
        v_clean_username := substr(v_clean_username, 1, 23) || '_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
    END IF;

    -- 2. Extract and sanitize display_name
    v_display_name := trim(COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
    IF char_length(v_display_name) = 0 THEN
        v_display_name := COALESCE(
            NULLIF(trim(split_part(NEW.email, '@', 1)), ''),
            v_clean_username
        );
    END IF;
    IF char_length(v_display_name) > 100 THEN
        v_display_name := substr(v_display_name, 1, 100);
    END IF;

    -- 3. Extract and validate persona
    v_persona := NEW.raw_user_meta_data->>'persona';
    IF v_persona NOT IN ('student', 'freelancer', 'indie_maker', 'other') THEN
        v_persona := 'other';
    END IF;

    -- 4. Extract optional avatar_url
    v_avatar_url := NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), '');

    -- 5. Insert profile row idempotently with concurrent collision handling.
    -- The primary key id is ALWAYS NEW.id (the newly created auth user's UUID).
    -- User-supplied metadata is never trusted for ownership or identity.
    -- If concurrent registrations attempt the same username or an unexpected
    -- unique index violation occurs, the exception block traps it and falls back
    -- to a deterministic UUID-derived username ('user_' || 16 chars = 21 chars,
    -- well within 3-30 character limits and guaranteed unique per user).
    BEGIN
        INSERT INTO public.profiles (
            id,
            username,
            display_name,
            avatar_url,
            persona,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            v_clean_username,
            v_display_name,
            v_avatar_url,
            v_persona,
            now(),
            now()
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
        -- Deterministic UUID-derived fallback to ensure signup never aborts
        v_clean_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
        INSERT INTO public.profiles (
            id,
            username,
            display_name,
            avatar_url,
            persona,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            v_clean_username,
            v_display_name,
            v_avatar_url,
            v_persona,
            now(),
            now()
        )
        ON CONFLICT (id) DO NOTHING;
    END;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_handle_new_user() IS
  'Trigger function provisioning public.profiles on new auth.users registration with sanitized metadata and concurrent collision recovery.';

-- Trigger: Fires immediately after a new user record is inserted into auth.users.
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_handle_new_user();

-- =========================================================================
-- 6. Profile INSERT RLS Review & Policy Hardening
-- =========================================================================
-- Architectural Decision:
-- With the trigger 'trg_on_auth_user_created' executing as SECURITY DEFINER,
-- profile provisioning is fully managed at the PostgreSQL engine level during auth registration.
-- Permitting direct client-side INSERT on public.profiles via PostgREST is redundant and introduces
-- potential race conditions or client-side tampering vectors.
-- Therefore, we drop the client-side INSERT policy 'profiles_insert_own'.
-- Authenticated users retain SELECT and UPDATE privileges on their own row only.

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
