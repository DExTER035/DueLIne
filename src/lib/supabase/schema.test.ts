/**
 * schema.test.ts - Automated Verification of DueLine Stage 2A Database Foundation
 *
 * Verifies SQL schema consistency, foreign-key relationships, constraints,
 * indexes, triggers, and Row Level Security (RLS) policies statically and structurally.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getSupabaseConfig, assertSupabaseConfigured } from "./client.ts";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

describe("Stage 2A: Supabase Database Foundation", () => {
  const schemaSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0001_initial_schema.sql"),
    "utf-8"
  );
  const indexesSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0002_indexes_and_triggers.sql"),
    "utf-8"
  );
  const rlsSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0003_row_level_security.sql"),
    "utf-8"
  );
  const hardeningSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0004_ownership_and_timestamp_hardening.sql"),
    "utf-8"
  );
  const provisioningSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0005_profile_provisioning.sql"),
    "utf-8"
  );

  describe("1. Schema & Table Definitions (0001_initial_schema.sql)", () => {
    const requiredTables = [
      "public.profiles",
      "public.projects",
      "public.tasks",
      "public.milestones",
      "public.task_events",
    ];

    for (const table of requiredTables) {
      it(`defines table ${table} with CREATE TABLE IF NOT EXISTS`, () => {
        assert.ok(
          schemaSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
          `Missing table creation for ${table}`
        );
      });
    }

    it("enforces UUID primary keys across all tables", () => {
      assert.ok(schemaSql.includes("id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE"));
      assert.ok(schemaSql.includes("id UUID PRIMARY KEY DEFAULT gen_random_uuid()"));
    });

    it("enforces deliberate foreign key deletion cascading", () => {
      // profiles -> auth.users
      assert.ok(schemaSql.includes("REFERENCES auth.users(id) ON DELETE CASCADE"));
      // projects -> profiles
      assert.ok(schemaSql.includes("owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE"));
      // tasks -> projects & profiles
      assert.ok(schemaSql.includes("project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE"));
      // milestones -> projects & profiles
      assert.ok(schemaSql.includes("project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE"));
      // task_events -> tasks & profiles
      assert.ok(schemaSql.includes("task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE"));
    });

    it("enforces valid persona constraints on profiles", () => {
      assert.ok(
        schemaSql.includes("persona IN ('student', 'freelancer', 'indie_maker', 'other')"),
        "Missing persona check constraint"
      );
    });

    it("enforces valid project status constraints", () => {
      assert.ok(
        schemaSql.includes("status IN ('active', 'completed', 'archived', 'on_hold')"),
        "Missing project status check constraint"
      );
    });

    it("enforces valid task status and priority constraints", () => {
      assert.ok(
        schemaSql.includes("status IN ('todo', 'in_progress', 'completed', 'blocked')"),
        "Missing task status check constraint"
      );
      assert.ok(
        schemaSql.includes("priority IN ('low', 'medium', 'high', 'urgent')"),
        "Missing task priority check constraint"
      );
    });

    it("enforces non-negative estimated hours on tasks", () => {
      assert.ok(
        schemaSql.includes("estimated_hours >= 0.0"),
        "Missing non-negative check on estimated_hours"
      );
    });

    it("enforces valid milestone status and task event types", () => {
      assert.ok(
        schemaSql.includes("status IN ('pending', 'achieved', 'missed')"),
        "Missing milestone status check constraint"
      );
      assert.ok(
        schemaSql.includes("'status_changed'") &&
          schemaSql.includes("'priority_changed'") &&
          schemaSql.includes("'completed'"),
        "Missing task event types"
      );
    });
  });

  describe("2. Indexes and Triggers (0002_indexes_and_triggers.sql)", () => {
    it("enforces case-insensitive username uniqueness via functional index", () => {
      assert.ok(
        indexesSql.includes("CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower"),
        "Missing unique lower(username) index"
      );
      assert.ok(indexesSql.includes("lower(username)"));
    });

    it("covers foreign keys with dedicated indexes", () => {
      assert.ok(indexesSql.includes("idx_projects_owner_id"));
      assert.ok(indexesSql.includes("idx_tasks_project_id"));
      assert.ok(indexesSql.includes("idx_tasks_owner_id"));
      assert.ok(indexesSql.includes("idx_milestones_project_id"));
      assert.ok(indexesSql.includes("idx_milestones_owner_id"));
      assert.ok(indexesSql.includes("idx_task_events_task_id"));
      assert.ok(indexesSql.includes("idx_task_events_owner_id"));
    });

    it("indexes frequently queried filtering columns (status, due_date, target_date)", () => {
      assert.ok(indexesSql.includes("idx_tasks_status"));
      assert.ok(indexesSql.includes("idx_tasks_due_date"));
      assert.ok(indexesSql.includes("idx_projects_status"));
      assert.ok(indexesSql.includes("idx_milestones_target_date"));
    });

    it("configures updated_at trigger for profiles, projects, tasks, and milestones", () => {
      assert.ok(indexesSql.includes("fn_set_updated_at"));
      assert.ok(indexesSql.includes("trg_profiles_updated_at"));
      assert.ok(indexesSql.includes("trg_projects_updated_at"));
      assert.ok(indexesSql.includes("trg_tasks_updated_at"));
      assert.ok(indexesSql.includes("trg_milestones_updated_at"));
    });

    it("configures automatic task completed_at synchronization trigger", () => {
      assert.ok(indexesSql.includes("fn_sync_task_completed_at"));
      assert.ok(indexesSql.includes("trg_tasks_sync_completed_at"));
    });

    it("enforces cross-table project ownership integrity triggers", () => {
      assert.ok(indexesSql.includes("fn_validate_task_project_ownership"));
      assert.ok(indexesSql.includes("trg_tasks_validate_ownership"));
      assert.ok(indexesSql.includes("fn_validate_milestone_project_ownership"));
      assert.ok(indexesSql.includes("trg_milestones_validate_ownership"));
      assert.ok(indexesSql.includes("fn_validate_task_event_ownership"));
      assert.ok(indexesSql.includes("trg_task_events_validate_ownership"));
    });
  });

  describe("3. Row Level Security Policies (0003_row_level_security.sql)", () => {
    const tables = [
      "public.profiles",
      "public.projects",
      "public.tasks",
      "public.milestones",
      "public.task_events",
    ];

    for (const table of tables) {
      it(`enables and forces RLS on ${table}`, () => {
        assert.ok(
          rlsSql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`),
          `Missing ENABLE RLS on ${table}`
        );
        assert.ok(
          rlsSql.includes(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`),
          `Missing FORCE RLS on ${table}`
        );
      });
    }

    it("restricts profile access to matching auth.uid()", () => {
      assert.ok(rlsSql.includes("profiles_select_own"));
      assert.ok(rlsSql.includes("USING (id = auth.uid())"));
      assert.ok(rlsSql.includes("WITH CHECK (id = auth.uid())"));
      assert.ok(rlsSql.includes("profiles_delete_deny"));
    });

    it("restricts projects to owner_id = auth.uid() for all CRUD operations", () => {
      assert.ok(rlsSql.includes("projects_select_own"));
      assert.ok(rlsSql.includes("projects_insert_own"));
      assert.ok(rlsSql.includes("projects_update_own"));
      assert.ok(rlsSql.includes("projects_delete_own"));
      assert.ok(rlsSql.includes("USING (owner_id = auth.uid())"));
      assert.ok(rlsSql.includes("WITH CHECK (owner_id = auth.uid())"));
    });

    it("prevents cross-tenant task insertion into non-owned projects", () => {
      assert.ok(rlsSql.includes("tasks_insert_own"));
      assert.ok(
        rlsSql.includes("WHERE p.id = project_id AND p.owner_id = auth.uid()")
      );
    });

    it("prevents cross-tenant milestone insertion into non-owned projects", () => {
      assert.ok(rlsSql.includes("milestones_insert_own"));
      assert.ok(
        rlsSql.includes("WHERE p.id = project_id AND p.owner_id = auth.uid()")
      );
    });

    it("enforces immutable task event audit trail (UPDATE denied)", () => {
      assert.ok(rlsSql.includes("task_events_update_deny"));
      assert.ok(rlsSql.includes("USING (false)"));
    });
  });

  describe("4. TypeScript Integration Preparation", () => {
    it("reports unconfigured Supabase environment gracefully", () => {
      const config = getSupabaseConfig();
      assert.equal(config.isConfigured, false);
      assert.throws(() => assertSupabaseConfigured(), {
        message: /Supabase client is not yet configured/,
      });
    });
  });

  describe("5. Stage 2A.1 Hardening (0004_ownership_and_timestamp_hardening.sql)", () => {
    it("creates composite unique constraints on (id, owner_id)", () => {
      assert.ok(
        hardeningSql.includes("uq_projects_id_owner UNIQUE (id, owner_id)"),
        "Missing uq_projects_id_owner constraint"
      );
      assert.ok(
        hardeningSql.includes("uq_tasks_id_owner UNIQUE (id, owner_id)"),
        "Missing uq_tasks_id_owner constraint"
      );
    });

    it("enforces declarative composite foreign keys matching project and task owners", () => {
      assert.ok(
        hardeningSql.includes("fk_tasks_project_owner"),
        "Missing fk_tasks_project_owner"
      );
      assert.ok(
        hardeningSql.includes("FOREIGN KEY (project_id, owner_id)"),
        "Missing composite FK on tasks"
      );
      assert.ok(
        hardeningSql.includes("fk_milestones_project_owner"),
        "Missing fk_milestones_project_owner"
      );
      assert.ok(
        hardeningSql.includes("fk_task_events_task_owner"),
        "Missing fk_task_events_task_owner"
      );
    });

    it("retires procedural ownership validation triggers in favor of native FKs", () => {
      assert.ok(
        hardeningSql.includes("DROP TRIGGER IF EXISTS trg_tasks_validate_ownership"),
        "Should drop procedural task trigger"
      );
      assert.ok(
        hardeningSql.includes("DROP FUNCTION IF EXISTS public.fn_validate_task_project_ownership()"),
        "Should drop procedural task ownership function"
      );
    });

    it("updates timestamp defaults and trigger functions to use native now() and SECURITY INVOKER", () => {
      assert.ok(
        hardeningSql.includes("ALTER COLUMN created_at SET DEFAULT now()"),
        "Should set created_at to now()"
      );
      assert.ok(
        hardeningSql.includes("SECURITY INVOKER"),
        "Triggers should run as SECURITY INVOKER"
      );
      assert.ok(
        hardeningSql.includes("NEW.updated_at := now()"),
        "Trigger should assign now() to updated_at"
      );
    });
  });

  describe("6. Stage 2B Profile Provisioning (0005_profile_provisioning.sql)", () => {
    it("defines fn_handle_new_user as SECURITY DEFINER with empty search_path", () => {
      assert.ok(
        provisioningSql.includes("FUNCTION public.fn_handle_new_user()"),
        "Missing fn_handle_new_user definition"
      );
      assert.ok(
        provisioningSql.includes("SECURITY DEFINER"),
        "fn_handle_new_user must run as SECURITY DEFINER"
      );
      assert.ok(
        provisioningSql.includes("SET search_path = ''"),
        "fn_handle_new_user must lock search_path"
      );
    });

    it("attaches AFTER INSERT trigger on auth.users", () => {
      assert.ok(
        provisioningSql.includes("CREATE TRIGGER trg_on_auth_user_created"),
        "Missing trg_on_auth_user_created trigger"
      );
      assert.ok(
        provisioningSql.includes("AFTER INSERT ON auth.users"),
        "Trigger must fire AFTER INSERT ON auth.users"
      );
      assert.ok(
        provisioningSql.includes("EXECUTE FUNCTION public.fn_handle_new_user()"),
        "Trigger must invoke fn_handle_new_user"
      );
    });

    it("sanitizes user metadata and enforces NEW.id ownership", () => {
      assert.ok(
        provisioningSql.includes("NEW.raw_user_meta_data->>'username'"),
        "Must extract username from metadata"
      );
      assert.ok(
        provisioningSql.includes("regexp_replace(v_raw_username, '[^a-zA-Z0-9_]'"),
        "Must sanitize username characters"
      );
      assert.ok(
        provisioningSql.includes("VALUES (\n        NEW.id,") ||
          provisioningSql.includes("NEW.id,"),
        "Profile id must be strictly NEW.id"
      );
      assert.ok(
        provisioningSql.includes("ON CONFLICT (id) DO NOTHING"),
        "Must be idempotent on user id conflict"
      );
    });

    it("handles concurrent username collisions with deterministic UUID fallback", () => {
      assert.ok(
        provisioningSql.includes("EXCEPTION WHEN unique_violation THEN"),
        "Must handle unique_violation exception on concurrent registration"
      );
      assert.ok(
        provisioningSql.includes("'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16)"),
        "Must fall back to deterministic UUID-derived username"
      );
    });

    it("retires client-side profiles_insert_own policy", () => {
      assert.ok(
        provisioningSql.includes("DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;"),
        "Must drop client-side profiles_insert_own policy"
      );
    });
  });
});
