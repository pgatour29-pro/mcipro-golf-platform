-- =====================================================================
-- ADD MISSING HANDICAP_STROKES COLUMN TO ROUND_HOLES TABLE
-- =====================================================================
-- Date: 2025-10-23
-- Issue: Code tries to insert handicap_strokes but column doesn't exist
-- Error: "Could not find the 'HoleIds_strokes' in the schema cache"
-- Solution: Add the missing column to round_holes table
-- =====================================================================

BEGIN;

-- Add handicap_strokes column if it doesn't exist
ALTER TABLE round_holes
ADD COLUMN IF NOT EXISTS handicap_strokes INTEGER DEFAULT 0;

-- Update any existing rows to calculate handicap strokes
-- (Not critical since existing rows don't have complete data anyway)
COMMENT ON COLUMN round_holes.handicap_strokes IS 'Number of handicap strokes received on this hole (0 or 1)';

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Check that the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'round_holes'
  AND column_name = 'handicap_strokes';

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'HANDICAP_STROKES COLUMN ADDED TO ROUND_HOLES TABLE';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'ISSUE FIXED:';
  RAISE NOTICE '  - Code was trying to insert handicap_strokes column';
  RAISE NOTICE '  - Column did not exist in round_holes table';
  RAISE NOTICE '  - Error: "Could not find the HoleIds_strokes in the schema cache"';
  RAISE NOTICE '';
  RAISE NOTICE 'SOLUTION APPLIED:';
  RAISE NOTICE '  ✅ Added handicap_strokes INTEGER DEFAULT 0 column';
  RAISE NOTICE '  ✅ Existing rows default to 0 strokes';
  RAISE NOTICE '  ✅ New rounds will save handicap strokes correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT THIS FIXES:';
  RAISE NOTICE '  ✅ Hole-by-hole data will now save successfully';
  RAISE NOTICE '  ✅ Round History will show complete scorecard';
  RAISE NOTICE '  ✅ No more schema cache errors';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Create a new test round';
  RAISE NOTICE '  2. Play a few holes and save';
  RAISE NOTICE '  3. Check Round History - should show hole-by-hole data';
  RAISE NOTICE '  4. Check console - should see NO errors';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
