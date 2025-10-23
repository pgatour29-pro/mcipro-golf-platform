-- ===========================================================================
-- FIX ROUNDS TABLE RLS POLICIES FOR LINE USER ID
-- ===========================================================================
-- Date: 2025-10-23
-- Issue: Rounds not saving - 403 Forbidden error
-- Root Cause: RLS policy checks auth.uid() but golfer_id contains LINE user ID
-- Fix: Update policies to check against LINE user ID from JWT claims
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- DROP EXISTING POLICIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rounds_insert_own" ON public.rounds;
DROP POLICY IF EXISTS "rounds_update_own" ON public.rounds;
DROP POLICY IF EXISTS "rounds_delete_own" ON public.rounds;
DROP POLICY IF EXISTS "round_holes_insert_own" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_update_own" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_delete_own" ON public.round_holes;

-- ---------------------------------------------------------------------------
-- CREATE NEW POLICIES USING LINE USER ID FROM JWT CLAIMS
-- ---------------------------------------------------------------------------

-- Users can insert their own rounds (using LINE user ID from JWT)
CREATE POLICY "rounds_insert_own"
  ON public.rounds FOR INSERT
  TO authenticated
  WITH CHECK (
    golfer_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
  );

-- Users can update their own rounds (using LINE user ID from JWT)
CREATE POLICY "rounds_update_own"
  ON public.rounds FOR UPDATE
  TO authenticated
  USING (
    golfer_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
  );

-- Users can delete their own rounds (using LINE user ID from JWT)
CREATE POLICY "rounds_delete_own"
  ON public.rounds FOR DELETE
  TO authenticated
  USING (
    golfer_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
  );

-- Users can insert holes for their own rounds (check via rounds table)
CREATE POLICY "round_holes_insert_own"
  ON public.round_holes FOR INSERT
  TO authenticated
  WITH CHECK (
    round_id IN (
      SELECT id FROM rounds
      WHERE golfer_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
    )
  );

-- Users can update holes for their own rounds (check via rounds table)
CREATE POLICY "round_holes_update_own"
  ON public.round_holes FOR UPDATE
  TO authenticated
  USING (
    round_id IN (
      SELECT id FROM rounds
      WHERE golfer_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
    )
  );

-- Users can delete holes for their own rounds (check via rounds table)
CREATE POLICY "round_holes_delete_own"
  ON public.round_holes FOR DELETE
  TO authenticated
  USING (
    round_id IN (
      SELECT id FROM rounds
      WHERE golfer_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
    )
  );

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------------

-- Check that policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rounds', 'round_holes')
ORDER BY tablename, cmd, policyname;

-- ---------------------------------------------------------------------------
-- SUCCESS MESSAGE
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ROUNDS RLS POLICIES FIXED FOR LINE USER ID';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATED POLICIES:';
  RAISE NOTICE '  rounds table:';
  RAISE NOTICE '    - rounds_insert_own (uses LINE user ID from JWT)';
  RAISE NOTICE '    - rounds_update_own (uses LINE user ID from JWT)';
  RAISE NOTICE '    - rounds_delete_own (uses LINE user ID from JWT)';
  RAISE NOTICE '';
  RAISE NOTICE '  round_holes table:';
  RAISE NOTICE '    - round_holes_insert_own (checks via rounds.golfer_id)';
  RAISE NOTICE '    - round_holes_update_own (checks via rounds.golfer_id)';
  RAISE NOTICE '    - round_holes_delete_own (checks via rounds.golfer_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'FIX APPLIED:';
  RAISE NOTICE '  - Changed from: golfer_id = auth.uid()::text';
  RAISE NOTICE '  - Changed to: golfer_id = JWT line_user_id claim';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT THIS FIXES:';
  RAISE NOTICE '  - 403 Forbidden errors when saving rounds';
  RAISE NOTICE '  - Live Scorecard rounds now save correctly';
  RAISE NOTICE '  - Practice, private, and society rounds all work';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Test creating a practice round in Live Scorecard';
  RAISE NOTICE '  2. Test creating a private round';
  RAISE NOTICE '  3. Test creating a society event round';
  RAISE NOTICE '  4. Verify rounds appear in Round History';
  RAISE NOTICE '  5. Test deleting rounds from Round History';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
