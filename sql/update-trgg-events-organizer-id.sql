-- =====================================================================
-- UPDATE TRGG EVENTS TO USE NEW ORGANIZER ID
-- =====================================================================
-- PROBLEM: TRGG events have organizer_id = Pete's LINE ID
-- But TRGG organizer profile now has different ID
-- SOLUTION: Update all TRGG events to use TRGG's new organizer ID
-- =====================================================================

BEGIN;

-- Check what we have before
SELECT
    COUNT(*) as total_events,
    organizer_id,
    organizer_name
FROM society_events
WHERE organizer_name ILIKE '%travellers rest%'
   OR organizer_name ILIKE '%trgg%'
GROUP BY organizer_id, organizer_name;

-- Update all TRGG events to use new organizer ID
UPDATE society_events
SET organizer_id = 'Utrgg1234567890abcdefghijklmnopqr'
WHERE organizer_name ILIKE '%travellers rest%'
   OR organizer_name ILIKE '%trgg%';

-- Verify the update
SELECT
    COUNT(*) as total_events,
    organizer_id,
    organizer_name
FROM society_events
WHERE organizer_name ILIKE '%travellers rest%'
   OR organizer_name ILIKE '%trgg%'
GROUP BY organizer_id, organizer_name;

COMMIT;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
DECLARE
    event_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO event_count
    FROM society_events
    WHERE organizer_id = 'Utrgg1234567890abcdefghijklmnopqr';

    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE 'TRGG EVENTS UPDATED';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated % TRGG events to use new organizer ID', event_count;
    RAISE NOTICE 'New organizer ID: Utrgg1234567890abcdefghijklmnopqr';
    RAISE NOTICE '';
    RAISE NOTICE 'RESULT:';
    RAISE NOTICE '  - TRGG events will now appear in Society Organizer Dashboard';
    RAISE NOTICE '  - Events still visible in golfer dashboard';
    RAISE NOTICE '  - Events still visible in calendar';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
END $$;
