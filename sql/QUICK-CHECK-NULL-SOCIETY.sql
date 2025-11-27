-- Quick check: Are ALL existing events using NULL for society_id too?
SELECT
    COUNT(*) as total_events,
    COUNT(society_id) as events_with_society_id,
    COUNT(*) - COUNT(society_id) as events_with_null_society_id
FROM society_events;

-- Show sample events
SELECT
    title,
    event_date,
    society_id,
    organizer_id
FROM society_events
LIMIT 5;
