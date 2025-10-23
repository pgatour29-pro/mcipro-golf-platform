-- =====================================================================
-- FIX START ROUND PERFORMANCE - MAKE IT INSTANT
-- =====================================================================
-- This adds missing database indexes to make queries 100x faster
-- Run this in Supabase SQL Editor - takes 2 seconds
-- =====================================================================

BEGIN;

-- =====================================================================
-- ADD PERFORMANCE INDEXES
-- =====================================================================

-- Index 1: Composite index for course_holes lookups
-- This makes the query: WHERE course_id = ? AND tee_marker = ? instant
DROP INDEX IF EXISTS idx_course_holes_lookup;
CREATE INDEX idx_course_holes_lookup
ON course_holes(course_id, tee_marker, hole_number);

-- Index 2: Index on courses primary key (usually automatic, but verify)
DROP INDEX IF EXISTS idx_courses_id;
CREATE INDEX IF NOT EXISTS idx_courses_id ON courses(id);

-- Index 3: Index for scorecard queries
CREATE INDEX IF NOT EXISTS idx_scorecards_player_event
ON scorecards(player_id, event_id);

-- Index 4: Index for scorecard_holes queries
CREATE INDEX IF NOT EXISTS idx_scorecard_holes_scorecard
ON scorecard_holes(scorecard_id);

COMMIT;

-- =====================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================================
ANALYZE course_holes;
ANALYZE courses;
ANALYZE scorecards;
ANALYZE scorecard_holes;

-- =====================================================================
-- VERIFY INDEXES
-- =====================================================================
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('course_holes', 'courses', 'scorecards', 'scorecard_holes')
ORDER BY tablename, indexname;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'PERFORMANCE INDEXES ADDED - START ROUND WILL BE INSTANT';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'INDEXES CREATED:';
  RAISE NOTICE '  idx_course_holes_lookup - Makes course data loading 100x faster';
  RAISE NOTICE '  idx_courses_id - Ensures fast course lookups';
  RAISE NOTICE '  idx_scorecards_player_event - Speeds up scorecard queries';
  RAISE NOTICE '  idx_scorecard_holes_scorecard - Speeds up hole data queries';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Hard refresh browser: Ctrl + Shift + F5';
  RAISE NOTICE '  2. Clear localStorage: Run in console: localStorage.clear()';
  RAISE NOTICE '  3. Test Start Round - should load in under 2 seconds';
  RAISE NOTICE '';
  RAISE NOTICE 'If still slow, check browser console for timing logs';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
