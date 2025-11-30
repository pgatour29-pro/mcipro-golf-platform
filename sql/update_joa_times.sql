-- UPDATE existing JOA events with times instead of deleting/recreating

UPDATE society_events
SET
    departure_time = '09:00:00',
    start_time = '10:00:00'
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';

-- Verify the update
SELECT
    event_date,
    title,
    departure_time,
    start_time,
    CASE
        WHEN departure_time IS NOT NULL THEN '✅ HAS TIME'
        ELSE '❌ NULL'
    END as departure_check,
    CASE
        WHEN start_time IS NOT NULL THEN '✅ HAS TIME'
        ELSE '❌ NULL'
    END as start_check
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY event_date
LIMIT 5;

-- Count check
SELECT
    COUNT(*) as total,
    COUNT(departure_time) as has_departure,
    COUNT(start_time) as has_start
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';
