-- ================================================================
-- DIAGNOSTIC: Check what Travellers Rest data is on JOA dashboard
-- RUN THIS FIRST to identify the problem
-- ================================================================

-- Society UUIDs:
-- JOA: 72d8444a-56bf-4441-86f2-22087f0e6b27
-- TRGG (Travellers Rest): 17451cf3-f499-4aa3-83d7-c206149838c4

-- ================================================================
-- 1. CHECK SOCIETY_EVENTS TABLE
-- Find events that might be showing on JOA dashboard but are TRGG events
-- ================================================================

SELECT '=== EVENTS CHECK ===' as section;

-- Events with JOA society_id but TRGG title
SELECT 'Events with JOA society_id but TRGG title:' as check_type;
SELECT id, title, event_date, society_id, organizer_id, organizer_name
FROM society_events
WHERE society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
  AND (title ILIKE 'TRGG%' OR title ILIKE 'Travellers%')
ORDER BY event_date DESC
LIMIT 20;

-- Events with NULL society_id that might leak (TRGG events often have NULL)
SELECT 'Events with NULL society_id (may leak to other dashboards):' as check_type;
SELECT id, title, event_date, society_id, organizer_id, organizer_name
FROM society_events
WHERE society_id IS NULL
  AND (title ILIKE 'TRGG%' OR title ILIKE 'Travellers%')
ORDER BY event_date DESC
LIMIT 20;

-- Events that start with JOA Golf (should be JOA only)
SELECT 'Events with JOA Golf prefix:' as check_type;
SELECT id, title, event_date, society_id, organizer_id, organizer_name
FROM society_events
WHERE title ILIKE 'JOA Golf%'
ORDER BY event_date DESC
LIMIT 20;

-- ================================================================
-- 2. CHECK REGISTRATIONS
-- Find registrations for JOA events that might have TRGG data
-- ================================================================

SELECT '=== REGISTRATIONS CHECK ===' as section;

-- Count registrations per society event
SELECT 'Registrations count by event (JOA events only):' as check_type;
SELECT
    se.title,
    se.event_date,
    se.society_id,
    COUNT(er.id) as registration_count
FROM society_events se
LEFT JOIN event_registrations er ON er.event_id = se.id
WHERE se.society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
   OR se.title ILIKE 'JOA Golf%'
GROUP BY se.id, se.title, se.event_date, se.society_id
ORDER BY se.event_date DESC
LIMIT 20;

-- ================================================================
-- 3. CHECK SCORECARDS
-- Scorecards linked to society events
-- ================================================================

SELECT '=== SCORECARDS CHECK ===' as section;

-- Check if scorecards table has society_id column
SELECT 'Scorecard columns:' as check_type;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scorecards'
  AND table_schema = 'public';

-- ================================================================
-- 4. CHECK ROUNDS TABLE
-- Rounds might have society_id that's wrong
-- ================================================================

SELECT '=== ROUNDS CHECK ===' as section;

-- Rounds with society_id set
SELECT 'Rounds with society_id (looking for cross-contamination):' as check_type;
SELECT id, golfer_id, society_id, course_name, total_gross, created_at
FROM rounds
WHERE society_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- ================================================================
-- 5. CHECK SOCIETY_HANDICAPS
-- Handicaps associated with wrong society
-- ================================================================

SELECT '=== HANDICAPS CHECK ===' as section;

-- JOA handicaps
SELECT 'Handicaps for JOA society:' as check_type;
SELECT sh.golfer_id, sh.society_id, sh.handicap_index, sh.last_calculated_at,
       up.display_name
FROM society_handicaps sh
LEFT JOIN user_profiles up ON up.line_user_id = sh.golfer_id
WHERE sh.society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
ORDER BY sh.last_calculated_at DESC
LIMIT 20;

-- TRGG handicaps (for comparison)
SELECT 'Handicaps for TRGG society:' as check_type;
SELECT sh.golfer_id, sh.society_id, sh.handicap_index, sh.last_calculated_at,
       up.display_name
FROM society_handicaps sh
LEFT JOIN user_profiles up ON up.line_user_id = sh.golfer_id
WHERE sh.society_id = '17451cf3-f499-4aa3-83d7-c206149838c4'
ORDER BY sh.last_calculated_at DESC
LIMIT 20;

-- ================================================================
-- 6. SUMMARY COUNTS
-- ================================================================

SELECT '=== SUMMARY COUNTS ===' as section;

-- Events by society
SELECT 'Events count by society_id:' as check_type;
SELECT
    CASE
        WHEN society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27' THEN 'JOA'
        WHEN society_id = '17451cf3-f499-4aa3-83d7-c206149838c4' THEN 'TRGG'
        WHEN society_id IS NULL THEN 'NULL'
        ELSE 'OTHER: ' || society_id::text
    END as society,
    COUNT(*) as event_count
FROM society_events
GROUP BY society_id
ORDER BY event_count DESC;

-- Events by title prefix
SELECT 'Events count by title prefix:' as check_type;
SELECT
    CASE
        WHEN title ILIKE 'JOA Golf%' THEN 'JOA Golf'
        WHEN title ILIKE 'TRGG%' THEN 'TRGG'
        WHEN title ILIKE 'Travellers%' THEN 'Travellers'
        ELSE 'OTHER'
    END as prefix,
    COUNT(*) as event_count
FROM society_events
GROUP BY
    CASE
        WHEN title ILIKE 'JOA Golf%' THEN 'JOA Golf'
        WHEN title ILIKE 'TRGG%' THEN 'TRGG'
        WHEN title ILIKE 'Travellers%' THEN 'Travellers'
        ELSE 'OTHER'
    END
ORDER BY event_count DESC;

-- ================================================================
-- 7. FIND THE PROBLEM: TRGG events incorrectly in JOA
-- ================================================================

SELECT '=== THE PROBLEM: TRGG data showing on JOA ===' as section;

-- TRGG events that might show on JOA dashboard (wrong society_id)
SELECT 'CRITICAL: TRGG events with JOA society_id:' as check_type;
SELECT id, title, event_date, society_id, organizer_id
FROM society_events
WHERE society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
  AND (title ILIKE 'TRGG%' OR title ILIKE 'Travellers%');

-- Check if any TRGG events have organizer_id set to JOA
SELECT 'CRITICAL: TRGG events with JOA organizer_id:' as check_type;
SELECT id, title, event_date, society_id, organizer_id
FROM society_events
WHERE organizer_id = 'JOAGOLFPAT'
  AND (title ILIKE 'TRGG%' OR title ILIKE 'Travellers%');
