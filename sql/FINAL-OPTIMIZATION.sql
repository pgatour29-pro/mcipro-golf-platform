-- ============================================================================
-- FINAL OPTIMIZATION: Clean up and optimize database after tee marker fix
-- ============================================================================
-- This script addresses performance issues introduced by previous fixes
-- Run this ONCE after deploying the index.html fix
-- ============================================================================

-- 1. VERIFY RLS STATUS (don't enable if already enabled to avoid table scans)
-- ============================================================================

DO $$
BEGIN
    -- Check if scorecards RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'scorecards'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on scorecards';
    ELSE
        RAISE NOTICE 'RLS already enabled on scorecards - skipping';
    END IF;

    -- Check if scorecard_holes RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'scorecard_holes'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE scorecard_holes ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on scorecard_holes';
    ELSE
        RAISE NOTICE 'RLS already enabled on scorecard_holes - skipping';
    END IF;

    -- Check if course_holes RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'course_holes'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on course_holes';
    ELSE
        RAISE NOTICE 'RLS already enabled on course_holes - skipping';
    END IF;
END $$;

-- 2. ENSURE ALL CRITICAL INDEXES EXIST (IF NOT EXISTS prevents errors)
-- ============================================================================

-- Course holes lookup (critical for Start Round)
CREATE INDEX IF NOT EXISTS idx_course_holes_lookup
ON course_holes(course_id, tee_marker, hole_number);

CREATE INDEX IF NOT EXISTS idx_course_holes_course_id
ON course_holes(course_id);

-- Courses table
CREATE INDEX IF NOT EXISTS idx_courses_id
ON courses(id);

-- Scorecards performance
CREATE INDEX IF NOT EXISTS idx_scorecards_player_id
ON scorecards(player_id);

CREATE INDEX IF NOT EXISTS idx_scorecards_event_id
ON scorecards(event_id);

CREATE INDEX IF NOT EXISTS idx_scorecards_group_id
ON scorecards(group_id);

CREATE INDEX IF NOT EXISTS idx_scorecards_player_event
ON scorecards(player_id, event_id);

-- Scorecard holes
CREATE INDEX IF NOT EXISTS idx_scorecard_holes_scorecard_id
ON scorecard_holes(scorecard_id);

-- Rounds table (for history)
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_id
ON rounds(golfer_id);

CREATE INDEX IF NOT EXISTS idx_rounds_completed_at
ON rounds(completed_at);

-- Round holes
CREATE INDEX IF NOT EXISTS idx_round_holes_round_id
ON round_holes(round_id);

-- 3. ANALYZE TABLES (update statistics for query planner)
-- ============================================================================
-- This is fast and should NOT cause delays

ANALYZE courses;
ANALYZE course_holes;
ANALYZE scorecards;
ANALYZE scorecard_holes;
ANALYZE rounds;
ANALYZE round_holes;

-- 4. VERIFY TEE MARKER DATA CONSISTENCY
-- ============================================================================

-- Check for courses with inconsistent tee marker data
SELECT
    course_id,
    COUNT(*) as total_holes,
    COUNT(DISTINCT tee_marker) as tee_count,
    array_agg(DISTINCT tee_marker) as tee_markers
FROM course_holes
GROUP BY course_id
ORDER BY course_id;

-- 5. CLEANUP: Remove duplicate or orphaned cache entries
-- ============================================================================
-- (This is handled by JavaScript clearOldCourseCaches() function)

-- 6. PERFORMANCE MONITORING QUERIES (for diagnostics)
-- ============================================================================

-- Check table sizes
SELECT
    schemaname,
    relname as tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE relname IN ('courses', 'course_holes', 'scorecards', 'scorecard_holes', 'rounds', 'round_holes')
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- Check index usage
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND relname IN ('courses', 'course_holes', 'scorecards', 'scorecard_holes')
ORDER BY relname, indexrelname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'OPTIMIZATION COMPLETE!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Applied:';
    RAISE NOTICE '  - RLS policies verified/enabled (no unnecessary table scans)';
    RAISE NOTICE '  - All critical indexes created (IF NOT EXISTS)';
    RAISE NOTICE '  - Table statistics updated (ANALYZE)';
    RAISE NOTICE '  - Performance monitoring queries executed';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Clear browser cache (handled by JavaScript)';
    RAISE NOTICE '  2. Test Start Round functionality';
    RAISE NOTICE '  3. Monitor console for performance logs';
    RAISE NOTICE '=================================================================';
END $$;
