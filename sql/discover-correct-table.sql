-- =====================================================
-- DISCOVER CORRECT TABLE NAME FOR ORGANIZER_ID
-- =====================================================
-- The "users" table doesn't exist, need to find the real table

-- 1. List ALL tables in the database
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check the ACTUAL foreign key constraint for society_events.organizer_id
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'society_events'
AND kcu.column_name = 'organizer_id';

-- 3. Check existing events to see what organizer_id values are currently used
SELECT DISTINCT organizer_id, COUNT(*) as event_count
FROM society_events
GROUP BY organizer_id
ORDER BY event_count DESC;

-- 4. Check society_profiles to see the relationship
SELECT
    id as society_uuid,
    organizer_id as organizer_text_id,
    society_name
FROM society_profiles
WHERE organizer_id = 'trgg-pattaya' OR society_name LIKE '%Travellers%';
