-- ============================================================================
-- CHECK PRIVATE EVENTS
-- ============================================================================

-- Check if there's an is_private column
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name IN ('is_private', 'creator_id', 'creator_type')
ORDER BY column_name;

-- Show events with creator info
SELECT
    id,
    title,
    event_date,
    organizer_id,
    organizer_name,
    creator_id,
    is_private
FROM public.society_events
WHERE creator_id IS NOT NULL
ORDER BY event_date DESC
LIMIT 10;

-- Count private vs public events
SELECT
    CASE
        WHEN is_private = true THEN 'Private'
        WHEN is_private = false THEN 'Public'
        ELSE 'NULL'
    END as event_type,
    COUNT(*) as count
FROM public.society_events
GROUP BY is_private;

-- Show events breakdown by organizer
SELECT
    organizer_id,
    organizer_name,
    COUNT(*) as total,
    COUNT(CASE WHEN is_private = true THEN 1 END) as private_events,
    COUNT(CASE WHEN is_private = false THEN 1 END) as public_events
FROM public.society_events
GROUP BY organizer_id, organizer_name
ORDER BY total DESC;
