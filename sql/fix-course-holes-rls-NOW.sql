-- =====================================================================
-- FIX COURSE_HOLES TABLE RLS - STOP THE FREEZE
-- =====================================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "course_holes_select_all" ON course_holes;

-- Create permissive policy for anon role
CREATE POLICY "course_holes_select_all"
  ON course_holes FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'COURSE_HOLES TABLE FIXED - START ROUND WILL NOT FREEZE';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policy created for anon role access';
  RAISE NOTICE 'Start Round should work now without freezing';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
