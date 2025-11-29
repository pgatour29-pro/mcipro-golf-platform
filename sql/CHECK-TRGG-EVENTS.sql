-- Check if TRGG events were already in database
SELECT
    title,
    event_date,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as all_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM society_events
WHERE title LIKE '%TRGG%'
AND event_date >= '2025-11-01'
AND event_date < '2026-01-01'
GROUP BY title, event_date
HAVING COUNT(*) > 1
ORDER BY event_date, title
LIMIT 20;
