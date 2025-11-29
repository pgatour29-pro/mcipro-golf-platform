-- ============================================================================
-- VERIFY TRGG EVENTS ARE IN DATABASE AND READY FOR DASHBOARD
-- ============================================================================

-- 1. Count TRGG events
SELECT
    '=== TRGG EVENTS COUNT ===' AS section,
    COUNT(*) as total_trgg_events,
    COUNT(CASE WHEN event_date >= '2025-11-01' AND event_date < '2025-12-01' THEN 1 END) as november_events,
    COUNT(CASE WHEN event_date >= '2025-12-01' AND event_date < '2026-01-01' THEN 1 END) as december_events
FROM society_events
WHERE title LIKE 'TRGG%';

-- 2. Show sample TRGG events
SELECT
    '=== SAMPLE TRGG EVENTS ===' AS section,
    id,
    title,
    event_date,
    organizer_id,
    society_id,
    status,
    created_at
FROM society_events
WHERE title LIKE 'TRGG%'
ORDER BY event_date
LIMIT 10;

-- 3. Check what organizerId TRGG events have
SELECT
    '=== TRGG ORGANIZER_ID VALUES ===' AS section,
    organizer_id,
    COUNT(*) as count
FROM society_events
WHERE title LIKE 'TRGG%'
GROUP BY organizer_id;

-- 4. Check if there's a TRGG society profile
SELECT
    '=== TRGG SOCIETY PROFILE ===' AS section,
    id,
    organizer_id,
    society_name,
    society_logo
FROM society_profiles
WHERE society_name LIKE '%Travellers%' OR organizer_id = 'trgg-pattaya';

-- 5. Test the query that the dashboard uses
SELECT
    '=== DASHBOARD QUERY TEST ===' AS section,
    id,
    title,
    event_date
FROM society_events
WHERE title ILIKE 'TRGG%'
ORDER BY event_date
LIMIT 5;
