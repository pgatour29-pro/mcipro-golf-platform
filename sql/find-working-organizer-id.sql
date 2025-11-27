-- =====================================================
-- FIND WORKING ORGANIZER_ID VALUES
-- =====================================================
-- Check what organizer_id values are CURRENTLY working in society_events
-- These must be valid according to the foreign key constraint

SELECT
    organizer_id,
    COUNT(*) as event_count,
    MIN(title) as sample_event,
    MIN(event_date) as earliest_date
FROM society_events
GROUP BY organizer_id
ORDER BY event_count DESC;
