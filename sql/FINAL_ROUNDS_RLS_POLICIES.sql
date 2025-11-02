-- =============================================================================
-- FINAL ROUNDS/ROUND_HOLES RLS POLICIES (Consolidated, Permissive)
-- -----------------------------------------------------------------------------
-- Purpose: Ensure Live Scorecard saves (INSERT) and returns rows (SELECT)
--          without 403 errors for both anon and authenticated roles, while we
--          align schema and claims for tighter ownership filtering later.
--
-- IMPORTANT SECURITY NOTE:
-- - These policies are intentionally permissive (USING/with CHECK = true) to
--   unblock functionality. This means any client with anon key can read/write
--   these tables. Use only temporarily in non-public environments.
-- - Follow-up hardening should restrict access to the owner using a consistent
--   identity column (e.g., supabase_user_id or golfer_id) and authenticated
--   sessions.
--
-- After deploying, run READ-ONLY diagnostics such as:
--   - CHECK_ROUNDS_TABLE_ISSUES.sql
--   - DIAGNOSE_LIVE_SCORING_ISSUE.sql
--   - SHOW_ROUNDS_COLUMNS.sql
-- to validate table existence/columns and then tighten policies.
-- =============================================================================

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for rounds
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rounds'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rounds', r.policyname);
  END LOOP;
END $$;

-- Drop existing policies for round_holes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'round_holes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.round_holes', r.policyname);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Permissive policies (TEMPORARY) to unblock client functionality
-- -----------------------------------------------------------------------------

-- rounds
CREATE POLICY rounds_select_all
  ON public.rounds FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY rounds_insert_all
  ON public.rounds FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY rounds_update_all
  ON public.rounds FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY rounds_delete_all
  ON public.rounds FOR DELETE
  TO anon, authenticated
  USING (true);

-- round_holes
CREATE POLICY round_holes_select_all
  ON public.round_holes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY round_holes_insert_all
  ON public.round_holes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY round_holes_update_all
  ON public.round_holes FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY round_holes_delete_all
  ON public.round_holes FOR DELETE
  TO anon, authenticated
  USING (true);

COMMIT;

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rounds', 'round_holes')
ORDER BY tablename, cmd, policyname;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'FINAL ROUNDS RLS (PERMISSIVE) DEPLOYED - TEMPORARY UNBLOCKER';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'WARNING: Policies allow anon+authenticated to SELECT/INSERT/UPDATE/DELETE all rows.';
  RAISE NOTICE 'Next: Align schema + auth and replace with owner-scoped policies.';
  RAISE NOTICE '';
END $$;

