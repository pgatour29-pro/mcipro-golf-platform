-- =====================================================================
-- DEBUG: Check where the group was created and why messages fail
-- =====================================================================

-- STEP 1: Check if room exists in chat_rooms (should be here)
SELECT 'chat_rooms' as table_name, id, type, title, created_by, created_at
FROM chat_rooms
WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- STEP 2: Check if room exists in rooms table (old schema?)
SELECT 'rooms' as table_name, id, kind, slug, created_at
FROM rooms
WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- STEP 3: Check all recent groups in chat_rooms
SELECT id, type, title, created_by, created_at
FROM chat_rooms
WHERE type = 'group'
ORDER BY created_at DESC
LIMIT 10;

-- STEP 4: Check all recent rooms in rooms table
SELECT id, kind, slug, created_at
FROM rooms
ORDER BY created_at DESC
LIMIT 10;

-- STEP 5: Check if create_group_room RPC exists and is correct
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'create_group_room';

-- STEP 6: Check chat_room_members for this room
SELECT room_id, user_id, role, status, invited_by, created_at
FROM chat_room_members
WHERE room_id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- STEP 7: List all tables that might store rooms
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%room%'
ORDER BY table_name;
