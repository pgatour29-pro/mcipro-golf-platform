# URGENT DIAGNOSTIC NEEDED

Please run this SQL query in your Supabase SQL editor to check the current state:

```sql
-- 1. Show all society profiles with their UUIDs
SELECT
    'All Society Profiles' AS section,
    id::text AS profile_uuid,
    organizer_id,
    society_name
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

-- 3. Show sample TRGG events
SELECT
    'TRGG Events Sample' AS section,
    id::text AS event_id,
    title,
    date,
    COALESCE(society_id::text, 'NULL') AS has_society_id,
    COALESCE(organizer_id, 'NULL') AS has_organizer_id
FROM public.society_events
WHERE title ILIKE '%TRGG%'
ORDER BY date DESC
LIMIT 5;
```

**What we need to know:**
1. What is the UUID of the TRGG society profile?
2. Do the TRGG events have `society_id` set to that UUID, or is it NULL?

If society_id is NULL for TRGG events, we need to run the fix script again.
