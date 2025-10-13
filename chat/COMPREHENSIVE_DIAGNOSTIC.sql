-- =====================================================================
-- COMPREHENSIVE DIAGNOSTIC: Find out where rooms are being created
-- =====================================================================

-- 1. Check if both tables exist
SELECT
  'Table exists' as check_type,
  table_name,
  CASE
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('rooms', 'chat_rooms')
ORDER BY table_name;

-- 2. Check current FK constraint on chat_messages
SELECT
  'Current FK' as check_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  CASE
    WHEN ccu.table_name = 'chat_rooms' THEN '✅ CORRECT (chat_rooms)'
    WHEN ccu.table_name = 'rooms' THEN '⚠️ WRONG (rooms)'
    ELSE '❌ UNKNOWN'
  END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chat_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'room_id';

-- 3. Check if the failing room exists anywhere
SELECT
  'Failing room in chat_rooms' as check_type,
  id,
  type,
  title,
  created_at,
  CASE
    WHEN id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status
FROM chat_rooms
WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b'
UNION ALL
SELECT
  'Failing room in rooms' as check_type,
  id,
  NULL as type,
  NULL as title,
  created_at,
  CASE
    WHEN id IS NOT NULL THEN '⚠️ FOUND (wrong table!)'
    ELSE '✅ NOT FOUND'
  END as status
FROM rooms
WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- 4. Count rooms in each table (last 24 hours)
SELECT
  'chat_rooms count (24h)' as check_type,
  COUNT(*) as count,
  MAX(created_at) as most_recent
FROM chat_rooms
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
  'rooms count (24h)' as check_type,
  COUNT(*) as count,
  MAX(created_at) as most_recent
FROM rooms
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 5. Check if create_group_room RPC exists and what it inserts into
SELECT
  'RPC function' as check_type,
  proname as function_name,
  prosecdef as is_security_definer,
  CASE
    WHEN prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ NOT SECURITY DEFINER'
  END as status,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'create_group_room';

-- 6. List recent rooms from chat_rooms (where they SHOULD be)
SELECT
  'Recent chat_rooms' as check_type,
  id,
  type,
  title,
  created_by,
  created_at
FROM chat_rooms
WHERE type = 'group'
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check membership for the failing room
SELECT
  'Membership for failing room' as check_type,
  room_id,
  user_id,
  role,
  status,
  CASE
    WHEN room_id IS NOT NULL THEN '⚠️ Membership exists but room missing'
    ELSE '✅ No orphan memberships'
  END as status
FROM chat_room_members
WHERE room_id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- 8. Recommendations
DO $$
DECLARE
  v_fk_table text;
  v_room_exists boolean;
BEGIN
  -- Check FK
  SELECT ccu.table_name INTO v_fk_table
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'chat_messages'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'room_id';

  -- Check if failing room exists
  SELECT EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b'
  ) INTO v_room_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  IF v_fk_table = 'chat_rooms' THEN
    RAISE NOTICE '✅ FK points to chat_rooms (CORRECT)';
  ELSIF v_fk_table = 'rooms' THEN
    RAISE NOTICE '❌ FK points to rooms (WRONG - needs fixing)';
    RAISE NOTICE '';
    RAISE NOTICE 'FIX: Run this SQL:';
    RAISE NOTICE 'ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_room_id_fkey;';
    RAISE NOTICE 'ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_room_id_fkey';
    RAISE NOTICE '  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;';
  ELSE
    RAISE NOTICE '⚠️ FK table unknown: %', v_fk_table;
  END IF;

  RAISE NOTICE '';

  IF NOT v_room_exists THEN
    RAISE NOTICE '❌ Failing room (0ac2b06f...) does NOT exist in chat_rooms';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUTION: Create a NEW group (the old one is orphaned)';
    RAISE NOTICE '  1. Hard refresh browser (Ctrl+Shift+R)';
    RAISE NOTICE '  2. Create a new group with a different name';
    RAISE NOTICE '  3. The new group will work correctly';
  ELSE
    RAISE NOTICE '✅ Room exists in chat_rooms';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
