-- Show ALL events on Monday Dec 1st to identify the duplicate
SELECT
    id,
    title,
    event_date,
    organizer_name,
    organizer_id,
    course_name,
    created_at
FROM society_events
WHERE event_date = '2025-12-01'
ORDER BY title, created_at;
