-- ============================================================================
-- CHECK EVENTS BREAKDOWN
-- ============================================================================

-- Show all societies with their organizer_id
SELECT
    id,
    organizer_id,
    society_name
FROM public.society_profiles
ORDER BY society_name;

-- Show events grouped by organizer_id with details
SELECT
    organizer_id,
    organizer_name,
    COUNT(*) as event_count,
    MIN(date) as earliest_event,
    MAX(date) as latest_event
FROM public.society_events
GROUP BY organizer_id, organizer_name
ORDER BY event_count DESC;

-- Show sample events to see their organizer_id values
SELECT
    id,
    name,
    date,
    organizer_id,
    organizer_name,
    status
FROM public.society_events
ORDER BY date DESC
LIMIT 10;

-- Check if any events have NULL organizer_id
SELECT
    COUNT(*) as events_with_null_organizer_id
FROM public.society_events
WHERE organizer_id IS NULL;

-- Check total event count
SELECT COUNT(*) as total_events FROM public.society_events;
