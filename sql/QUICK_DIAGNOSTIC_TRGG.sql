-- =====================================================================
-- QUICK DIAGNOSTIC FOR TRGG EVENTS ISSUE
-- =====================================================================
-- This will show us exactly why TRGG is showing 0 events
-- =====================================================================

-- 1. Show all society profiles
SELECT
    'All Society Profiles' AS section,
    id::text AS profile_uuid,
    organizer_id,
    society_name,
    created_at
FROM public.society_profiles
ORDER BY society_name;

-- 2. Show event counts by society_id (UUID)
SELECT
    'Event Counts by society_id UUID' AS section,
    COALESCE(society_id::text, 'NULL') AS society_uuid,
    COUNT(*) AS event_count
FROM public.society_events
GROUP BY society_id
ORDER BY event_count DESC;

-- 3. Show event counts by organizer_id (could be text or UUID)
SELECT
    'Event Counts by organizer_id' AS section,
    COALESCE(organizer_id, 'NULL') AS organizer_value,
    COUNT(*) AS event_count
FROM public.society_events
GROUP BY organizer_id
ORDER BY event_count DESC;

-- 4. Check if there's a TRGG profile
SELECT
    'TRGG Profile Check' AS section,
    id::text AS trgg_uuid,
    organizer_id AS trgg_organizer_id,
    society_name
FROM public.society_profiles
WHERE society_name ILIKE '%traveller%' OR organizer_id = 'trgg-pattaya';

-- 5. Show events that should belong to TRGG (by title)
SELECT
    'Events with TRGG in title' AS section,
    id::text,
    title,
    date,
    COALESCE(society_id::text, 'NULL') AS has_society_id,
    COALESCE(organizer_id, 'NULL') AS has_organizer_id
FROM public.society_events
WHERE title ILIKE '%TRGG%' OR title ILIKE '%Traveller%'
ORDER BY date DESC
LIMIT 10;

-- 6. Full event details for TRGG events
SELECT
    'TRGG Event Details (sample)' AS section,
    id::text AS event_id,
    title,
    date,
    society_id::text AS event_society_uuid,
    organizer_id AS event_organizer_value,
    organizer_name
FROM public.society_events
WHERE title ILIKE '%TRGG%'
ORDER BY date DESC
LIMIT 5;
