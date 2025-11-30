-- Find all Eastern Star events on Monday Dec 1st
SELECT
    id,
    title,
    event_date,
    organizer_name,
    organizer_id,
    created_at
FROM society_events
WHERE title ILIKE '%Eastern Star%'
  AND event_date = '2025-12-01'
ORDER BY created_at DESC;

-- If you see the duplicate, copy the ID and use this to delete:
-- DELETE FROM society_events WHERE id = 'paste-id-here';

-- OR delete all Eastern Star events on Dec 1st (if there should only be one):
DELETE FROM society_events
WHERE title ILIKE '%Eastern Star%'
  AND event_date = '2025-12-01';

-- Verify deletion
SELECT
    COUNT(*) as remaining_eastern_star_events,
    MIN(event_date) as earliest_date,
    MAX(event_date) as latest_date
FROM society_events
WHERE title ILIKE '%Eastern Star%';
