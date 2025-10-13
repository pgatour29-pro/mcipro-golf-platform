-- =====================================================================
-- VERIFY RLS POLICIES ARE CORRECTLY APPLIED
-- =====================================================================
-- Run this to check if all policies are in place
-- Date: 2025-10-13
-- =====================================================================

-- Check helper functions exist
SELECT
  'Helper Functions' as category,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN (
  'user_is_room_member',
  'user_is_group_member',
  'user_is_in_room',
  'user_is_group_admin'
)
ORDER BY proname;

-- Check RLS is enabled on tables
SELECT
  'RLS Status' as category,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('chat_rooms', 'room_members', 'chat_room_members', 'chat_messages')
ORDER BY tablename;

-- Check policies on chat_rooms
SELECT
  'chat_rooms Policies' as category,
  policyname,
  cmd as command,
  permissive,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'chat_rooms'
ORDER BY cmd, policyname;

-- Check policies on room_members
SELECT
  'room_members Policies' as category,
  policyname,
  cmd as command,
  permissive,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'room_members'
ORDER BY cmd, policyname;

-- Check policies on chat_room_members
SELECT
  'chat_room_members Policies' as category,
  policyname,
  cmd as command,
  permissive,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'chat_room_members'
ORDER BY cmd, policyname;

-- Check policies on chat_messages
SELECT
  'chat_messages Policies' as category,
  policyname,
  cmd as command,
  permissive,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;

-- Test: Check if current user is authenticated
SELECT
  'Authentication Test' as category,
  auth.uid() as current_user_id,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED'
    ELSE '✅ AUTHENTICATED'
  END as status;
