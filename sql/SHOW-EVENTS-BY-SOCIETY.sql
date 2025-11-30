-- ============================================================================
-- SHOW EVENTS BY SOCIETY
-- ============================================================================

-- Show which society each organizer_id belongs to
SELECT
    sp.society_name,
    sp.organizer_id,
    COUNT(se.id) as event_count
FROM public.society_profiles sp
LEFT JOIN public.society_events se ON se.organizer_id = sp.organizer_id
GROUP BY sp.society_name, sp.organizer_id
ORDER BY sp.society_name;

-- Show total
SELECT COUNT(*) as total_events FROM public.society_events;
