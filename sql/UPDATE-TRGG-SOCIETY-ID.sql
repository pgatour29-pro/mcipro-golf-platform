-- ============================================================================
-- UPDATE TRGG events to have the correct society_id
-- ============================================================================

BEGIN;

-- Update all TRGG events to have the correct society_id
UPDATE society_events
SET society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'
WHERE title LIKE 'TRGG%';

-- Verify the update
SELECT
    '=== UPDATED TRGG EVENTS ===' AS status,
    COUNT(*) as total_trgg_events,
    society_id
FROM society_events
WHERE title LIKE 'TRGG%'
GROUP BY society_id;

COMMIT;
