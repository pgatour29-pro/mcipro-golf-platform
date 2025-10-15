-- =====================================================================
-- DIAGNOSE: Check if old room exists and where
-- =====================================================================

-- Check if this specific room exists in chat_rooms
SELECT 'chat_rooms' as location, id, type, title, created_by, created_at
FROM chat_rooms
WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- Check if it exists in rooms table (old schema)
SELECT 'rooms' as location, id, created_at
FROM rooms
WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- Check if there's membership for this room
SELECT 'chat_room_members' as location, room_id, user_id, role, status
FROM chat_room_members
WHERE room_id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

-- List ALL rooms in chat_rooms (recent)
SELECT 'All chat_rooms' as label, id, type, title, created_at
FROM chat_rooms
ORDER BY created_at DESC
LIMIT 10;

-- Check current FK constraint
SELECT
  'Current FK' as label,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chat_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'room_id';
