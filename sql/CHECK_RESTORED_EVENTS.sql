-- Check all restored events
SELECT
    id,
    title,
    event_date,
    start_time,
    max_participants,
    entry_fee,
    status,
    created_at
FROM society_events
WHERE event_date >= '2025-10-20'
  AND event_date <= '2025-11-30'
ORDER BY event_date;

-- Count by month
SELECT
    TO_CHAR(event_date, 'YYYY-MM') as month,
    COUNT(*) as event_count
FROM society_events
WHERE event_date >= '2025-10-20'
  AND event_date <= '2025-11-30'
GROUP BY TO_CHAR(event_date, 'YYYY-MM')
ORDER BY month;
