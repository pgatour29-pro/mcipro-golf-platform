-- ============================================================================
-- CHECK WHAT WAS DELETED - Look for any traces of Pete's events
-- ============================================================================

-- Check if there's an audit log or deleted events table
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%audit%' OR table_name LIKE '%deleted%' OR table_name LIKE '%history%');

-- Check recent deletions if there's a deleted_at column
SELECT
    id,
    title,
    event_date,
    creator_id,
    is_private,
    deleted_at
FROM society_events
WHERE deleted_at IS NOT NULL
  AND creator_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY deleted_at DESC;

-- Check ALL events to see date range of what exists
SELECT
    '=== EVENTS DATE RANGE ===' AS section,
    MIN(event_date) as earliest_event,
    MAX(event_date) as latest_event,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_date >= '2025-11-01' AND event_date < '2026-01-01' THEN 1 END) as nov_dec_events
FROM society_events;

-- Check what was deleted by our script (if it's still in the date range)
SELECT
    '=== WHAT FIX-CLEAN-RESTORE.SQL DELETED ===' AS section,
    'All events between 2025-11-01 and 2026-01-01' as deleted_range,
    'This included ANY private events Pete created in Nov-Dec 2025' as impact;
