-- ============================================================================
-- DIAGNOSE WHY TRGG EVENTS NOT SHOWING ON DASHBOARD
-- ============================================================================

-- 1. Quick count - Are TRGG events in the database?
SELECT
    '=== QUICK CHECK ===' AS section,
    COUNT(*) as total_trgg_events
FROM society_events
WHERE title LIKE 'TRGG%';

-- 2. Show first 5 TRGG events if they exist
SELECT
    '=== SAMPLE TRGG EVENTS ===' AS section,
    id,
    title,
    event_date,
    organizer_id,
    society_id,
    status,
    format,
    is_private
FROM society_events
WHERE title LIKE 'TRGG%'
ORDER BY event_date
LIMIT 5;

-- 3. Test the EXACT query the dashboard uses
SELECT
    '=== DASHBOARD QUERY (case-insensitive ILIKE) ===' AS section,
    id,
    title,
    event_date,
    status
FROM society_events
WHERE title ILIKE 'TRGG%'
ORDER BY event_date
LIMIT 5;

-- 4. Check if there's a TRGG society profile with organizerId 'trgg-pattaya'
SELECT
    '=== TRGG SOCIETY PROFILE CHECK ===' AS section,
    id,
    organizer_id,
    society_name,
    society_logo
FROM society_profiles
WHERE organizer_id = 'trgg-pattaya';

-- 5. Final verdict
SELECT
    '=== VERDICT ===' AS section,
    CASE
        WHEN (SELECT COUNT(*) FROM society_events WHERE title LIKE 'TRGG%') = 0
            THEN 'NO TRGG EVENTS FOUND - Need to run FIX-CLEAN-RESTORE.sql'
        WHEN (SELECT COUNT(*) FROM society_events WHERE title LIKE 'TRGG%') > 0
            THEN 'TRGG EVENTS EXIST - Issue is frontend/query related'
        ELSE 'UNKNOWN'
    END as diagnosis;
