-- =====================================================================
-- ADD PERFORMANCE INDEXES TO SPEED UP DATABASE QUERIES
-- =====================================================================
-- Date: 2025-10-23
-- Issue: Slow performance across app - login, start round, finish round
-- Solution: Add missing database indexes for faster queries
-- =====================================================================

BEGIN;

-- =====================================================================
-- COURSE_HOLES TABLE INDEXES
-- =====================================================================
-- Speed up course data loading (2-3 min delay on start round)
CREATE INDEX IF NOT EXISTS idx_course_holes_course_id ON course_holes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_holes_lookup ON course_holes(course_id, hole_number);

-- =====================================================================
-- ROUNDS TABLE INDEXES
-- =====================================================================
-- Speed up round history queries
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_id ON rounds(golfer_id);
CREATE INDEX IF NOT EXISTS idx_rounds_completed_at ON rounds(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_completed ON rounds(golfer_id, completed_at DESC);

-- =====================================================================
-- ROUND_HOLES TABLE INDEXES
-- =====================================================================
-- Speed up hole data queries
CREATE INDEX IF NOT EXISTS idx_round_holes_round_id ON round_holes(round_id);
CREATE INDEX IF NOT EXISTS idx_round_holes_lookup ON round_holes(round_id, hole_number);

-- =====================================================================
-- USER_PROFILES TABLE INDEXES
-- =====================================================================
-- Speed up profile lookups (already optimized with cache, but indexes help)
CREATE INDEX IF NOT EXISTS idx_user_profiles_line_user_id ON user_profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_society_id ON user_profiles(society_id) WHERE society_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- =====================================================================
-- COURSES TABLE INDEXES
-- =====================================================================
-- Speed up course lookups
CREATE INDEX IF NOT EXISTS idx_courses_id ON courses(id);

COMMIT;

-- =====================================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- =====================================================================
-- This helps PostgreSQL optimize query plans
ANALYZE courses;
ANALYZE course_holes;
ANALYZE rounds;
ANALYZE round_holes;
ANALYZE user_profiles;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Check all indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'course_holes', 'rounds', 'round_holes', 'user_profiles')
ORDER BY tablename, indexname;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'PERFORMANCE INDEXES ADDED TO ALL TABLES';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'INDEXES CREATED:';
  RAISE NOTICE '  ✅ course_holes: course_id, (course_id + hole_number)';
  RAISE NOTICE '  ✅ rounds: golfer_id, completed_at, (golfer_id + completed_at)';
  RAISE NOTICE '  ✅ round_holes: round_id, (round_id + hole_number)';
  RAISE NOTICE '  ✅ user_profiles: line_user_id, society_id, role';
  RAISE NOTICE '  ✅ courses: id';
  RAISE NOTICE '';
  RAISE NOTICE 'EXPECTED PERFORMANCE IMPROVEMENTS:';
  RAISE NOTICE '  🚀 Login: Faster profile lookups';
  RAISE NOTICE '  🚀 Start Round: Course data loads much faster (was 2-3 mins)';
  RAISE NOTICE '  🚀 Finish Round: Faster round saves';
  RAISE NOTICE '  🚀 Round History: Instant data loading';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Clear browser cache (service worker might interfere)';
  RAISE NOTICE '  2. Test login speed';
  RAISE NOTICE '  3. Test starting a round (should be much faster)';
  RAISE NOTICE '  4. Test saving a round';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
