-- Find the correct organizer_id by checking existing events

-- 1. Check what organizer_ids exist in current events
SELECT DISTINCT organizer_id, COUNT(*) as event_count
FROM society_events
GROUP BY organizer_id;

-- 2. Find Pete's user UUID
SELECT id, line_user_id, username, email
FROM users
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- 3. Check the foreign key constraint
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
