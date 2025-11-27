-- Quick count of all events
SELECT COUNT(*) as total_events FROM society_events;

-- Count by month
SELECT
    DATE_TRUNC('month', event_date) as month,
    COUNT(*) as event_count
FROM society_events
GROUP BY DATE_TRUNC('month', event_date)
ORDER BY month DESC;
