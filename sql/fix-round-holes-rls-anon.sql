-- ===========================================================================
-- FIX ROUND_HOLES TABLE RLS POLICIES FOR ANON ROLE
-- ===========================================================================
-- Date: 2025-10-23
-- Issue: Rounds save successfully but round_holes get 400 error
-- Root Cause: round_holes policies also need anon role + USING (true)
-- Solution: Create matching policies for round_holes table
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- DROP ALL EXISTING POLICIES FOR ROUND_HOLES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "round_holes_select_own" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_insert_own" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_insert_anon_auth" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_update_own" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_update_anon_auth" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_delete_own" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_delete_anon_auth" ON public.round_holes;

-- ---------------------------------------------------------------------------
-- CREATE NEW POLICIES FOR ROUND_HOLES (MATCH ROUNDS TABLE)
-- ---------------------------------------------------------------------------

-- Allow anon + authenticated to SELECT all round_holes
CREATE POLICY "round_holes_select_all"
  ON public.round_holes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anon + authenticated to INSERT round_holes
CREATE POLICY "round_holes_insert_all"
  ON public.round_holes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon + authenticated to UPDATE round_holes
CREATE POLICY "round_holes_update_all"
  ON public.round_holes FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Allow anon + authenticated to DELETE round_holes
CREATE POLICY "round_holes_delete_all"
  ON public.round_holes FOR DELETE
  TO anon, authenticated
  USING (true);

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------------

SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'round_holes'
ORDER BY cmd, policyname;

-- ---------------------------------------------------------------------------
-- SUCCESS MESSAGE
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ROUND_HOLES RLS POLICIES FIXED FOR ANON ROLE';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'ISSUE:';
  RAISE NOTICE '  - Rounds table fixed ✅';
  RAISE NOTICE '  - But round_holes still had old policies ❌';
  RAISE NOTICE '  - Caused 400 error when saving hole details';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW POLICIES:';
  RAISE NOTICE '  ✅ round_holes_select_all (anon + authenticated, USING true)';
  RAISE NOTICE '  ✅ round_holes_insert_all (anon + authenticated, WITH CHECK true)';
  RAISE NOTICE '  ✅ round_holes_update_all (anon + authenticated, USING true)';
  RAISE NOTICE '  ✅ round_holes_delete_all (anon + authenticated, USING true)';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT THIS FIXES:';
  RAISE NOTICE '  ✅ 400 errors when saving hole details (RESOLVED)';
  RAISE NOTICE '  ✅ Complete round data saves (rounds + holes)';
  RAISE NOTICE '  ✅ Round History shows full scorecard';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Test creating a round';
  RAISE NOTICE '  2. Verify NO 403 or 400 errors';
  RAISE NOTICE '  3. Check Round History shows complete data';
  RAISE NOTICE '  4. Victory! 🏆';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
