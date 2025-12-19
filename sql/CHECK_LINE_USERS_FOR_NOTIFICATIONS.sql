-- Check which LINE user IDs exist in the database
-- These are the users who would receive platform announcements

-- 1. Check user_profiles table
SELECT 'user_profiles' as source, line_user_id, name, display_name
FROM user_profiles
WHERE line_user_id IS NOT NULL
  AND line_user_id LIKE 'U%'
  AND LENGTH(line_user_id) = 33
ORDER BY name;

-- 2. Check society_members table
SELECT 'society_members' as source, golfer_id as line_user_id, s.name as society_name
FROM society_members sm
JOIN societies s ON s.id = sm.society_id
WHERE golfer_id IS NOT NULL
  AND golfer_id LIKE 'U%'
  AND LENGTH(golfer_id) = 33
ORDER BY golfer_id;

-- 3. Check event_registrations table
SELECT 'event_registrations' as source, player_id as line_user_id, e.title as event_title
FROM event_registrations er
JOIN events e ON e.id = er.event_id
WHERE player_id IS NOT NULL
  AND player_id LIKE 'U%'
  AND LENGTH(player_id) = 33
ORDER BY player_id;

-- 4. Specifically check for Pete Park's LINE ID
SELECT 'PETE CHECK - user_profiles' as check_type,
       line_user_id, name, display_name
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

SELECT 'PETE CHECK - society_members' as check_type,
       golfer_id, society_id
FROM society_members
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

SELECT 'PETE CHECK - event_registrations' as check_type,
       player_id, event_id
FROM event_registrations
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
