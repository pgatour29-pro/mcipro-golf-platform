-- =====================================================================
-- DIAGNOSE: Check if Donald Lump (user ID 16) exists in profiles
-- Issue: User can't find "Donald Lump" in search, only sees "Pete"
-- =====================================================================

-- Check if user 16 exists in profiles
SELECT
  '1. Profile Check for User 16' as check_type,
  id,
  display_name,
  username,
  created_at
FROM auth.users
WHERE id = '16' OR CAST(id AS TEXT) LIKE '%16%';

-- Check all profiles (to see who exists)
SELECT
  '2. All Profiles' as check_type,
  id,
  display_name,
  username
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;

-- Check auth users (to see if Donald Lump is in auth but not profiles)
SELECT
  '3. All Auth Users' as check_type,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Check chat room members to find user 16
SELECT
  '4. User 16 in Chat Rooms' as check_type,
  crm.room_id,
  crm.user_id,
  crm.status,
  cr.title,
  cr.type
FROM public.chat_room_members crm
JOIN public.chat_rooms cr ON cr.id = crm.room_id
WHERE crm.user_id = '16' OR CAST(crm.user_id AS TEXT) LIKE '%16%';

-- Find all users in chat_room_members
SELECT
  '5. All Unique Users in Chat' as check_type,
  DISTINCT user_id,
  COUNT(*) as room_count
FROM public.chat_room_members
GROUP BY user_id
ORDER BY room_count DESC;
