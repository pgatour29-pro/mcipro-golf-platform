-- Delete the specific Eastern Star event by ID
DELETE FROM society_events
WHERE id = 'fb3fc553-4ff9-4e40-bc9f-14fbc147331d';

-- Verify it's gone
SELECT
    COUNT(*) as total_events_dec_1
FROM society_events
WHERE event_date = '2025-12-01';

-- Show remaining Dec 1st events
SELECT
    id,
    title,
    event_date,
    organizer_name
FROM society_events
WHERE event_date = '2025-12-01'
ORDER BY title;
