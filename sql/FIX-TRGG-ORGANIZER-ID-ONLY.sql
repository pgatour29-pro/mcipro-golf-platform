-- ============================================================================
-- FIX: Set TRGG events to have ONLY trgg-pattaya as organizer_id
-- This prevents them from showing in JOA and Ora Ora dashboards
-- ============================================================================

BEGIN;

-- Update all TRGG events to have the correct organizer_id
UPDATE society_events
SET organizer_id = 'trgg-pattaya'
WHERE title LIKE 'TRGG%';

-- Verify the fix
SELECT
    '=== TRGG EVENTS ORGANIZER CHECK ===' AS status,
    COUNT(*) as total_trgg_events,
    organizer_id
FROM society_events
WHERE title LIKE 'TRGG%'
GROUP BY organizer_id;

-- Show what each society should see
SELECT
    '=== EVENTS PER ORGANIZER ===' AS status,
    organizer_id,
    COUNT(*) as event_count
FROM society_events
GROUP BY organizer_id
ORDER BY organizer_id;

COMMIT;
