-- Check what society_id values exist in current events
SELECT
    society_id,
    COUNT(*) as event_count,
    MIN(title) as sample_event
FROM society_events
GROUP BY society_id
ORDER BY event_count DESC;

-- Also show a few example events to see their society_id
SELECT
    id,
    title,
    event_date,
    society_id,
    organizer_id
FROM society_events
ORDER BY event_date DESC
LIMIT 10;
