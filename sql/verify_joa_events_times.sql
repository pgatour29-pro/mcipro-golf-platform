-- Verify society_events table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name IN ('departure_time', 'start_time', 'member_fee', 'auto_waitlist')
ORDER BY column_name;

-- Check if JOA events have times
SELECT
    event_date,
    title,
    departure_time,
    start_time,
    member_fee
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY event_date
LIMIT 5;

-- Count events with NULL times
SELECT
    COUNT(*) as total_events,
    COUNT(departure_time) as has_departure_time,
    COUNT(start_time) as has_start_time
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';
