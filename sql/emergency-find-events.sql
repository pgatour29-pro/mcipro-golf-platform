-- EMERGENCY: Find ALL events in the database
-- Check if they were deleted or just orphaned

-- 1. Count TOTAL events in database
SELECT COUNT(*) as total_events_in_database
FROM society_events;

-- 2. Show ALL events (regardless of whether they link to a society)
SELECT
    id,
    title,
    event_date,
    organizer_id,
    created_at
FROM society_events
ORDER BY event_date DESC;

-- 3. Show orphaned events (events pointing to deleted societies)
SELECT
    se.id,
    se.title,
    se.event_date,
    se.organizer_id as points_to_deleted_uuid
FROM society_events se
LEFT JOIN society_profiles sp ON se.organizer_id = sp.id
WHERE sp.id IS NULL;

-- 4. Show what societies exist now
SELECT
    id as uuid,
    organizer_id,
    society_name
FROM society_profiles
ORDER BY society_name;
