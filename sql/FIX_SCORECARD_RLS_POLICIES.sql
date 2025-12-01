-- =============================================================================
-- FIX: Scorecard Saving - RLS Policies for 7 tables
-- =============================================================================
-- Date: 2025-12-01
-- Issue: Scores not saving during live rounds, round history failing
-- Root Cause: RLS policies blocking anon users from inserting/selecting tables
--
-- SYMPTOMS:
-- - 400 errors when saving scores during round
-- - "new row violates row-level security policy" errors
-- - Background save fails silently
-- - ✅ SAVED 0 ROUNDS SUCCESSFULLY
--
-- SOLUTION: Update RLS policies to allow anon role for all scorecard-related tables
-- Tables: scorecards, scores, handicap_history, rounds, round_holes,
--         society_events, society_handicaps
-- =============================================================================

BEGIN;

-- =============================================================================
-- SCORECARDS TABLE
-- =============================================================================

-- Enable RLS
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scorecards'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.scorecards', r.policyname);
  END LOOP;
END $$;

-- Create new permissive policies
CREATE POLICY "scorecards_select_all"
  ON public.scorecards FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "scorecards_insert_all"
  ON public.scorecards FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "scorecards_update_all"
  ON public.scorecards FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "scorecards_delete_all"
  ON public.scorecards FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- SCORES TABLE
-- =============================================================================

-- Enable RLS
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scores'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.scores', r.policyname);
  END LOOP;
END $$;

-- Create new permissive policies
CREATE POLICY "scores_select_all"
  ON public.scores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "scores_insert_all"
  ON public.scores FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "scores_update_all"
  ON public.scores FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "scores_delete_all"
  ON public.scores FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- HANDICAP_HISTORY TABLE
-- =============================================================================

-- Enable RLS
ALTER TABLE public.handicap_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'handicap_history'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.handicap_history', r.policyname);
  END LOOP;
END $$;

-- Create new permissive policies
CREATE POLICY "handicap_history_select_all"
  ON public.handicap_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "handicap_history_insert_all"
  ON public.handicap_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "handicap_history_update_all"
  ON public.handicap_history FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "handicap_history_delete_all"
  ON public.handicap_history FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- ROUNDS TABLE (ensure it's also fixed)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
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

-- Create new permissive policies
CREATE POLICY "rounds_select_all"
  ON public.rounds FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "rounds_insert_all"
  ON public.rounds FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "rounds_update_all"
  ON public.rounds FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "rounds_delete_all"
  ON public.rounds FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- ROUND_HOLES TABLE (ensure it's also fixed)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
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

-- Create new permissive policies
CREATE POLICY "round_holes_select_all"
  ON public.round_holes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "round_holes_insert_all"
  ON public.round_holes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "round_holes_update_all"
  ON public.round_holes FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "round_holes_delete_all"
  ON public.round_holes FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- SOCIETY_EVENTS TABLE (needed for querying organizer_id)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.society_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'society_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.society_events', r.policyname);
  END LOOP;
END $$;

-- Create new permissive policies
CREATE POLICY "society_events_select_all"
  ON public.society_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "society_events_insert_all"
  ON public.society_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "society_events_update_all"
  ON public.society_events FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "society_events_delete_all"
  ON public.society_events FOR DELETE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- SOCIETY_HANDICAPS TABLE (updated by triggers when rounds complete)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.society_handicaps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'society_handicaps'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.society_handicaps', r.policyname);
  END LOOP;
END $$;

-- Create new permissive policies
CREATE POLICY "society_handicaps_select_all"
  ON public.society_handicaps FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "society_handicaps_insert_all"
  ON public.society_handicaps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "society_handicaps_update_all"
  ON public.society_handicaps FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "society_handicaps_delete_all"
  ON public.society_handicaps FOR DELETE
  TO anon, authenticated
  USING (true);

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check all policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  roles::text,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('scorecards', 'scores', 'handicap_history', 'rounds', 'round_holes', 'society_events', 'society_handicaps')
ORDER BY tablename, cmd, policyname;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SCORECARD RLS POLICIES FIX DEPLOYED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED TABLES:';
  RAISE NOTICE '  ✅ scorecards - All operations allowed for anon';
  RAISE NOTICE '  ✅ scores - All operations allowed for anon';
  RAISE NOTICE '  ✅ handicap_history - All operations allowed for anon';
  RAISE NOTICE '  ✅ rounds - All operations allowed for anon';
  RAISE NOTICE '  ✅ round_holes - All operations allowed for anon';
  RAISE NOTICE '  ✅ society_events - All operations allowed for anon';
  RAISE NOTICE '  ✅ society_handicaps - All operations allowed for anon (triggers)';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT THIS FIXES:';
  RAISE NOTICE '  - Scores will save during live rounds (no more 400 errors)';
  RAISE NOTICE '  - Handicap history will update after rounds';
  RAISE NOTICE '  - Rounds will save to database successfully';
  RAISE NOTICE '  - Round history will populate correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Test: Start a new live round';
  RAISE NOTICE '  2. Enter scores for holes 1-18';
  RAISE NOTICE '  3. Complete round and verify no errors';
  RAISE NOTICE '  4. Check Round History tab';
  RAISE NOTICE '  5. Verify data in Supabase tables';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
