-- DIAGNOSTIC: Find out where the hell the Travellers Rest events went

-- 1. Show all societies with their UUIDs
SELECT
    id as uuid,
    organizer_id,
    society_name,
    created_at
FROM society_profiles
ORDER BY society_name;

-- 2. Show ALL event organizer_ids and how many events each has
SELECT
    organizer_id,
    COUNT(*) as event_count,
    MIN(title) as sample_event_title,
    MIN(event_date) as earliest_event
FROM society_events
GROUP BY organizer_id
ORDER BY event_count DESC;

-- 3. Show events that DON'T match any society (orphaned events)
SELECT
    se.id,
    se.title,
    se.event_date,
    se.organizer_id as event_organizer_uuid,
    'NO MATCHING SOCIETY' as status
FROM society_events se
LEFT JOIN society_profiles sp ON se.organizer_id = sp.id
WHERE sp.id IS NULL
ORDER BY se.event_date DESC
LIMIT 50;

-- 4. Show which society UUID the LINE user ID would map to (if it exists)
SELECT
    id as uuid,
    organizer_id,
    society_name
FROM society_profiles
WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- 5. Show Travellers Rest society info
SELECT
    id as uuid,
    organizer_id,
    society_name,
    society_logo
FROM society_profiles
WHERE organizer_id = 'trgg-pattaya';
