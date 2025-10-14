-- =====================================================================
-- COMPREHENSIVE GROUP CHAT DIAGNOSTIC
-- Run this in Supabase SQL Editor to diagnose group creation issues
-- =====================================================================

-- STEP 1: Check which version of create_group_room is deployed
SELECT
  'RPC Function Info' as check_type,
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_function_arguments(oid) as parameters,
  pg_get_functiondef(oid) as full_definition
FROM pg_proc
WHERE proname = 'create_group_room';

-- STEP 2: Check for parameter order mismatch
-- The JavaScript calls with: p_creator, p_name, p_member_ids, p_is_private
-- Check if SQL function expects the same order
SELECT
  'Parameter Analysis' as check_type,
  proname as function_name,
  string_agg(
    param_name || ' ' || param_type ||
    CASE WHEN param_default IS NOT NULL THEN ' DEFAULT ' || param_default ELSE '' END,
    ', ' ORDER BY param_ordinal
  ) as parameter_signature
FROM (
  SELECT
    proname,
    unnest(proargnames) as param_name,
    unnest(regexp_split_to_array(pg_get_function_arguments(oid), E',\\s*')) as param_type,
    unnest(proargdefaults) as param_default,
    generate_series(1, array_length(proargnames, 1)) as param_ordinal
  FROM pg_proc
  WHERE proname = 'create_group_room'
) sub
GROUP BY proname;

-- STEP 3: Check recent group creation attempts
SELECT
  'Recent Groups' as check_type,
  id,
  title,
  created_by,
  created_at,
  type
FROM chat_rooms
WHERE type = 'group'
ORDER BY created_at DESC
LIMIT 10;

-- STEP 4: Check members for recent groups
SELECT
  'Group Memberships' as check_type,
  crm.room_id,
  cr.title as group_name,
  crm.user_id,
  p.display_name as member_name,
  crm.role,
  crm.status,
  crm.invited_by,
  crm.created_at
FROM chat_room_members crm
JOIN chat_rooms cr ON cr.id = crm.room_id
LEFT JOIN profiles p ON p.id = crm.user_id
WHERE cr.type = 'group'
ORDER BY crm.created_at DESC
LIMIT 20;

-- STEP 5: Check for duplicate groups
SELECT
  'Duplicate Groups' as check_type,
  title,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at DESC) as room_ids,
  array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM chat_rooms
WHERE type = 'group'
GROUP BY title
HAVING COUNT(*) > 1;

-- STEP 6: Check for pending members (should be auto-approved)
SELECT
  'Pending Members' as check_type,
  crm.room_id,
  cr.title as group_name,
  crm.user_id,
  p.display_name as member_name,
  crm.status,
  crm.created_at
FROM chat_room_members crm
JOIN chat_rooms cr ON cr.id = crm.room_id
LEFT JOIN profiles p ON p.id = crm.user_id
WHERE crm.status = 'pending'
ORDER BY crm.created_at DESC
LIMIT 10;

-- STEP 7: Check RLS policies on chat_rooms
SELECT
  'RLS Policies - chat_rooms' as check_type,
  polname as policy_name,
  polcmd as command,
  CASE polpermissive
    WHEN true THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as policy_type,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'chat_rooms'::regclass;

-- STEP 8: Check RLS policies on chat_room_members
SELECT
  'RLS Policies - chat_room_members' as check_type,
  polname as policy_name,
  polcmd as command,
  CASE polpermissive
    WHEN true THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as policy_type,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'chat_room_members'::regclass;

-- STEP 9: Check foreign key constraints
SELECT
  'Foreign Keys' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('chat_messages', 'chat_room_members')
ORDER BY tc.table_name;

-- STEP 10: Summary
SELECT
  'Summary' as check_type,
  'Total groups' as metric,
  COUNT(*)::text as value
FROM chat_rooms WHERE type = 'group'
UNION ALL
SELECT
  'Summary',
  'Groups with pending members',
  COUNT(DISTINCT crm.room_id)::text
FROM chat_room_members crm
WHERE crm.status = 'pending'
UNION ALL
SELECT
  'Summary',
  'Total approved group members',
  COUNT(*)::text
FROM chat_room_members
WHERE status = 'approved'
UNION ALL
SELECT
  'Summary',
  'Duplicate group names',
  COUNT(*)::text
FROM (
  SELECT title
  FROM chat_rooms
  WHERE type = 'group'
  GROUP BY title
  HAVING COUNT(*) > 1
) dups;
