-- =====================================================================
-- Find Donald Lump's actual user ID
-- =====================================================================

-- 1. Search profiles for Donald Lump
SELECT
  '1. Profiles Search' as check_type,
  id,
  username,
  display_name,
  email
FROM public.profiles
WHERE
  display_name ILIKE '%donald%'
  OR display_name ILIKE '%lump%'
  OR username ILIKE '%donald%'
  OR username ILIKE '%lump%';

-- 2. Search auth.users for Donald Lump
SELECT
  '2. Auth Users Search' as check_type,
  u.id,
  u.email,
  u.raw_user_meta_data->>'display_name' as display_name,
  u.raw_user_meta_data->>'username' as username,
  u.raw_user_meta_data->>'name' as name
FROM auth.users u
WHERE
  u.email ILIKE '%donald%'
  OR u.email ILIKE '%lump%'
  OR u.raw_user_meta_data->>'display_name' ILIKE '%donald%'
  OR u.raw_user_meta_data->>'display_name' ILIKE '%lump%'
  OR u.raw_user_meta_data->>'name' ILIKE '%donald%'
  OR u.raw_user_meta_data->>'name' ILIKE '%lump%';

-- 3. Find users in chat_room_members with Pete
SELECT
  '3. Users in Chats with Pete' as check_type,
  crm.user_id,
  p.username,
  p.display_name,
  cr.type as room_type
FROM chat_room_members crm
JOIN chat_rooms cr ON cr.id = crm.room_id
JOIN chat_room_members pete ON pete.room_id = cr.id AND pete.user_id != crm.user_id
LEFT JOIN profiles p ON p.id = crm.user_id
WHERE cr.type = 'dm'
  AND crm.user_id != pete.user_id
ORDER BY cr.created_at DESC;

-- 4. Show ALL profiles (to see who's there)
SELECT
  '4. All Profiles' as check_type,
  id,
  username,
  display_name,
  email,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
