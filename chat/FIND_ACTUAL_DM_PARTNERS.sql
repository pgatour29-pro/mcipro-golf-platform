-- =====================================================================
-- Find who Pete is actually chatting with in DMs
-- =====================================================================

-- 1. Find Pete's user ID first
WITH pete AS (
  SELECT id, email, raw_user_meta_data->>'display_name' as display_name
  FROM auth.users
  WHERE email ILIKE '%pete%'
    OR raw_user_meta_data->>'display_name' ILIKE '%pete%'
  LIMIT 1
)
-- 2. Find all DM rooms Pete is in
, pete_dm_rooms AS (
  SELECT DISTINCT cr.id as room_id, cr.title
  FROM chat_rooms cr
  JOIN chat_room_members crm ON crm.room_id = cr.id
  WHERE cr.type = 'dm'
    AND crm.user_id = (SELECT id FROM pete)
)
-- 3. Find the OTHER person in each DM
SELECT
  'DM Partners' as check_type,
  pdr.room_id,
  pdr.title as room_title,
  crm.user_id as partner_user_id,
  p.username as partner_username,
  p.display_name as partner_display_name,
  au.email as partner_email,
  au.raw_user_meta_data->>'display_name' as auth_display_name,
  CASE
    WHEN p.id IS NULL THEN '❌ NO PROFILE'
    ELSE '✅ Has Profile'
  END as profile_status
FROM pete_dm_rooms pdr
JOIN chat_room_members crm ON crm.room_id = pdr.room_id
LEFT JOIN profiles p ON p.id = crm.user_id
LEFT JOIN auth.users au ON au.id = crm.user_id
WHERE crm.user_id != (SELECT id FROM pete);

-- 4. Show ALL profiles (so we can see who exists)
SELECT
  'All Profiles' as check_type,
  id,
  username,
  display_name,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 25;
