-- ============================================================================
-- SIMPLE: DELETE ORA ORA GOLF
-- ============================================================================

BEGIN;

-- Show current societies
SELECT id, organizer_id, society_name FROM public.society_profiles ORDER BY society_name;

-- Delete Ora Ora Golf
DELETE FROM public.society_profiles WHERE society_name = 'Ora Ora Golf';

-- Show remaining societies
SELECT id, organizer_id, society_name FROM public.society_profiles ORDER BY society_name;

-- Count events by organizer_id for remaining societies
SELECT
    organizer_id,
    organizer_name,
    COUNT(*) as event_count
FROM public.society_events
GROUP BY organizer_id, organizer_name
ORDER BY event_count DESC;

COMMIT;
