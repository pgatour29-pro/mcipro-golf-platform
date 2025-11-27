-- =====================================================
-- VERIFY EVENTS WERE INSERTED
-- =====================================================

-- 1. Count all events by month
SELECT
    DATE_TRUNC('month', event_date) as month,
    COUNT(*) as event_count
FROM society_events
GROUP BY DATE_TRUNC('month', event_date)
ORDER BY month;

-- 2. Show recent November/December events
SELECT
    id,
    title,
    event_date,
    start_time,
    organizer_id,
    status,
    created_at
FROM society_events
WHERE event_date >= '2025-11-01'
AND event_date < '2026-01-01'
ORDER BY event_date
LIMIT 20;

-- 3. Total count of events
SELECT COUNT(*) as total_events FROM society_events;

-- 4. Check if there's a society_id or similar field we should be using
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'society_events'
ORDER BY ordinal_position;
