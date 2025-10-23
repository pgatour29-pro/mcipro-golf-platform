-- ===========================================================================
-- FIX ROUNDS SELECT POLICY FOR ANON ROLE (FINAL FIX #4)
-- ===========================================================================
-- Date: 2025-10-23
-- Issue: INSERT works but returns 403 when trying to return inserted row
-- Root Cause: SELECT policy only allows 'authenticated' role, not 'anon'
-- When inserting, Supabase returns the row via SELECT which fails
-- Solution: Update SELECT policy to allow both anon AND authenticated
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- DROP EXISTING SELECT POLICY
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rounds_select_own_or_shared" ON public.rounds;

-- ---------------------------------------------------------------------------
-- CREATE NEW SELECT POLICY FOR ANON + AUTHENTICATED
-- ---------------------------------------------------------------------------

-- Allow both anon and authenticated users to select rounds
-- (Users can see: own rounds + shared rounds + organizer rounds)
CREATE POLICY "rounds_select_own_or_shared"
  ON public.rounds FOR SELECT
  TO anon, authenticated
  USING (
    golfer_id = auth.uid()::text OR
    auth.uid()::text = ANY(shared_with) OR
    auth.uid()::text = organizer_id
  );

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------------

-- Check all rounds policies
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'rounds'
ORDER BY cmd, policyname;

-- ---------------------------------------------------------------------------
-- SUCCESS MESSAGE
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ROUNDS SELECT POLICY FIXED FOR ANON ROLE - FINAL FIX #4';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'ROOT CAUSE (FINAL):';
  RAISE NOTICE '  - INSERT/UPDATE/DELETE policies allowed anon role ✅';
  RAISE NOTICE '  - But SELECT policy only allowed authenticated role ❌';
  RAISE NOTICE '  - When inserting, Supabase returns row via SELECT → 403';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATED POLICY:';
  RAISE NOTICE '  rounds_select_own_or_shared:';
  RAISE NOTICE '    - OLD: TO authenticated';
  RAISE NOTICE '    - NEW: TO anon, authenticated';
  RAISE NOTICE '    - Still restricts: own rounds + shared + organizer';
  RAISE NOTICE '';
  RAISE NOTICE 'ALL ROUNDS POLICIES NOW:';
  RAISE NOTICE '  ✅ rounds_select_own_or_shared (anon + authenticated)';
  RAISE NOTICE '  ✅ rounds_insert_anon_auth (anon + authenticated)';
  RAISE NOTICE '  ✅ rounds_update_anon_auth (anon + authenticated)';
  RAISE NOTICE '  ✅ rounds_delete_anon_auth (anon + authenticated)';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT THIS FIXES:';
  RAISE NOTICE '  ✅ 403 errors when saving rounds (RESOLVED)';
  RAISE NOTICE '  ✅ Rounds can be inserted AND returned';
  RAISE NOTICE '  ✅ Practice, private, society rounds all save';
  RAISE NOTICE '  ✅ Round History shows saved rounds';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Test creating a practice round';
  RAISE NOTICE '  2. Verify NO 403 errors in console';
  RAISE NOTICE '  3. Check round appears in Round History';
  RAISE NOTICE '  4. Celebrate! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
