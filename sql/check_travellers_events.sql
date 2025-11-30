-- Check what events exist for Travellers Rest Golf Group
SELECT
    id,
    title,
    event_date,
    organizer_name,
    organizer_id,
    created_at
FROM society_events
WHERE organizer_name ILIKE '%traveller%'
   OR organizer_name ILIKE '%rest%'
ORDER BY event_date DESC
LIMIT 20;

-- Also check all distinct organizer names
SELECT DISTINCT organizer_name, COUNT(*) as event_count
FROM society_events
GROUP BY organizer_name
ORDER BY organizer_name;

-- Check society profiles
SELECT organizer_id, society_name
FROM society_profiles
WHERE society_name ILIKE '%traveller%';
