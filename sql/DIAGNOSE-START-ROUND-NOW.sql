-- =====================================================================
-- DIAGNOSE START ROUND - TELL ME EVERYTHING
-- =====================================================================
-- Run this ONE SQL file in Supabase SQL Editor
-- Copy ALL the output and paste it back
-- =====================================================================

-- Check 1: Does course_holes table exist and how many rows?
SELECT
    'course_holes table row count' as check_name,
    COUNT(*) as result
FROM course_holes;

-- Check 2: How many holes per tee marker?
SELECT
    'Holes by tee marker' as check_name,
    tee_marker,
    COUNT(*) as hole_count
FROM course_holes
GROUP BY tee_marker
ORDER BY tee_marker;

-- Check 3: Which courses have data?
SELECT
    'Courses with hole data' as check_name,
    course_id,
    COUNT(DISTINCT hole_number) as holes,
    COUNT(DISTINCT tee_marker) as tee_markers
FROM course_holes
GROUP BY course_id
ORDER BY course_id;

-- Check 4: RLS enabled?
SELECT
    'RLS Status' as check_name,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('course_holes', 'courses', 'scorecards', 'scorecard_holes');

-- Check 5: What RLS policies exist?
SELECT
    'RLS Policies' as check_name,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE
        WHEN qual = 'true'::text THEN 'ALLOW ALL'
        ELSE 'RESTRICTED'
    END as policy_type
FROM pg_policies
WHERE tablename IN ('course_holes', 'courses', 'scorecards', 'scorecard_holes')
ORDER BY tablename, policyname;

-- Check 6: Sample data from course_holes (first 5 rows)
SELECT
    'Sample course_holes data (first 5)' as check_name,
    course_id,
    hole_number,
    par,
    tee_marker,
    yardage
FROM course_holes
ORDER BY course_id, tee_marker, hole_number
LIMIT 5;

-- Check 7: Does courses table have data?
SELECT
    'Courses table row count' as check_name,
    COUNT(*) as result
FROM courses;

-- Check 8: Sample courses
SELECT
    'Sample courses (first 10)' as check_name,
    id,
    name
FROM courses
ORDER BY id
LIMIT 10;

-- Check 9: Test specific course that should work
SELECT
    'Pattana Golf white tees (should be 18 holes)' as check_name,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'pattana_golf'
  AND tee_marker = 'white';

-- Check 10: Test anon role access (THIS IS THE KEY TEST)
SET ROLE anon;
SELECT
    'TEST: Can anon role read course_holes?' as check_name,
    COUNT(*) as result
FROM course_holes;
RESET ROLE;

-- =====================================================================
-- SUMMARY
-- =====================================================================
DO $$
DECLARE
    hole_count INTEGER;
    anon_can_read BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO hole_count FROM course_holes;

    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE 'START ROUND DIAGNOSIS COMPLETE';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Total holes in database: %', hole_count;
    RAISE NOTICE '';

    IF hole_count = 0 THEN
        RAISE NOTICE '❌ PROBLEM: course_holes table is EMPTY';
        RAISE NOTICE '   Need to run: sql/add-all-scorecard-courses.sql';
    ELSIF hole_count < 100 THEN
        RAISE NOTICE '⚠️  WARNING: Only % holes found (expected 100+)', hole_count;
        RAISE NOTICE '   Some courses may be missing data';
    ELSE
        RAISE NOTICE '✅ course_holes has data (% holes)', hole_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Check the query results above for detailed diagnosis';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
END $$;
