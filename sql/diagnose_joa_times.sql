-- Quick diagnostic to see what's actually in the database for JOA events

-- Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name IN ('departure_time', 'start_time')
ORDER BY column_name;

-- Check actual JOA events data
SELECT
    event_date,
    title,
    departure_time,
    start_time,
    CASE
        WHEN departure_time IS NULL THEN '❌ NULL'
        ELSE '✅ ' || departure_time::text
    END as departure_status,
    CASE
        WHEN start_time IS NULL THEN '❌ NULL'
        ELSE '✅ ' || start_time::text
    END as start_status
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY event_date
LIMIT 5;

-- Count NULL times
SELECT
    COUNT(*) as total_events,
    COUNT(CASE WHEN departure_time IS NOT NULL THEN 1 END) as has_departure,
    COUNT(CASE WHEN start_time IS NOT NULL THEN 1 END) as has_start_time
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';
