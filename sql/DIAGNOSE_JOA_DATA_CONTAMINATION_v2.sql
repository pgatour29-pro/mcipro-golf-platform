-- ================================================================
-- DIAGNOSTIC v2: Check what Travellers Rest data is on JOA dashboard
-- FIXED: Removed rounds.society_id reference
-- ================================================================

-- Society UUIDs:
-- JOA: 72d8444a-56bf-4441-86f2-22087f0e6b27
-- TRGG (Travellers Rest): 17451cf3-f499-4aa3-83d7-c206149838c4

-- ================================================================
-- 1. CHECK SOCIETY_EVENTS TABLE - Most likely source of contamination
-- ================================================================

-- Events with JOA society_id but TRGG title
SELECT 'PROBLEM CHECK 1: Events with JOA society_id but TRGG title' as check_type;
SELECT id, title, event_date, society_id, organizer_id, organizer_name
FROM society_events
WHERE society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
  AND (title ILIKE 'TRGG%' OR title ILIKE 'Travellers%')
ORDER BY event_date DESC;

-- Events that start with JOA Golf (should only be JOA)
SELECT 'JOA EVENTS: All events with JOA Golf prefix' as check_type;
SELECT id, title, event_date, society_id, organizer_id, organizer_name
FROM society_events
WHERE title ILIKE 'JOA Golf%'
ORDER BY event_date DESC
LIMIT 30;

-- ================================================================
-- 2. CHECK EVENT_RESULTS TABLE - This is where scoring data lives
-- ================================================================

SELECT 'EVENT_RESULTS COLUMNS:' as check_type;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'event_results'
  AND table_schema = 'public';

-- Event results that reference JOA events
SELECT 'EVENT RESULTS for JOA events:' as check_type;
SELECT er.id, er.event_id, er.player_name, er.gross_score, er.stableford_points, er.event_date,
       se.title as event_title, se.society_id
FROM event_results er
LEFT JOIN society_events se ON se.id = er.event_id
WHERE se.title ILIKE 'JOA Golf%'
   OR se.society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
ORDER BY er.event_date DESC
LIMIT 30;

-- CRITICAL: Check if TRGG results are linked to JOA events
SELECT 'PROBLEM CHECK 2: TRGG results on JOA events' as check_type;
SELECT er.id, er.event_id, er.player_name, er.gross_score, er.event_date,
       se.title as event_title, se.society_id
FROM event_results er
LEFT JOIN society_events se ON se.id = er.event_id
WHERE (se.title ILIKE 'JOA Golf%' OR se.society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27')
  AND er.event_id IN (
      SELECT id FROM society_events WHERE title ILIKE 'TRGG%' OR title ILIKE 'Travellers%'
  );

-- ================================================================
-- 3. CHECK SOCIETY_HANDICAPS - Wrong society associations
-- ================================================================

SELECT 'HANDICAPS: JOA society handicaps' as check_type;
SELECT sh.golfer_id, sh.society_id, sh.handicap_index, sh.rounds_count, sh.last_calculated_at,
       up.display_name
FROM society_handicaps sh
LEFT JOIN user_profiles up ON up.line_user_id = sh.golfer_id
WHERE sh.society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
ORDER BY sh.last_calculated_at DESC
LIMIT 20;

-- ================================================================
-- 4. SUMMARY COUNTS
-- ================================================================

SELECT 'SUMMARY: Events by society_id' as check_type;
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

SELECT 'SUMMARY: Events by title prefix' as check_type;
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
-- 5. THE REAL PROBLEM: Check event_results table structure
-- ================================================================

SELECT 'EVENT_RESULTS: Check for society_id column' as check_type;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'event_results'
  AND column_name IN ('society_id', 'organizer_id', 'society_name');

-- Check event_results that are NOT linked to any event
SELECT 'EVENT_RESULTS: Orphaned results (no matching event)' as check_type;
SELECT er.id, er.event_id, er.player_name, er.event_date, er.gross_score
FROM event_results er
LEFT JOIN society_events se ON se.id = er.event_id
WHERE se.id IS NULL
LIMIT 20;

-- ================================================================
-- 6. SCORECARDS table structure check
-- ================================================================

SELECT 'SCORECARDS COLUMNS:' as check_type;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scorecards'
  AND table_schema = 'public';

-- ================================================================
-- 7. List ALL JOA events to verify they are correct
-- ================================================================

SELECT 'ALL JOA EVENTS (by society_id and title):' as check_type;
SELECT id, title, event_date, society_id, organizer_id
FROM society_events
WHERE society_id = '72d8444a-56bf-4441-86f2-22087f0e6b27'
   OR title ILIKE 'JOA Golf%'
ORDER BY event_date DESC;
