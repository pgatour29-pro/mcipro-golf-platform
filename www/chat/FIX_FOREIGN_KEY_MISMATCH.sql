-- =====================================================================
-- FIX: Foreign key mismatch - chat_messages references wrong table
-- =====================================================================
-- ISSUE: chat_messages.room_id has FK to "rooms" but groups are in "chat_rooms"
-- ERROR: "Key is not present in table \"rooms\""
-- =====================================================================

-- STEP 1: Check current foreign key constraint
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
WHERE tc.table_name = 'chat_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'room_id';

-- STEP 2: Drop the incorrect foreign key constraint
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey;

-- STEP 3: Add correct foreign key pointing to chat_rooms (not rooms)
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_room_id_fkey
FOREIGN KEY (room_id)
REFERENCES chat_rooms(id)
ON DELETE CASCADE;

-- STEP 4: Verify the fix
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
WHERE tc.table_name = 'chat_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'room_id';

-- STEP 5: Test by inserting a message into an existing group
-- (Run this AFTER creating a group via the UI)
/*
-- Get a test room ID from chat_rooms
SELECT id, title FROM chat_rooms WHERE type = 'group' LIMIT 1;

-- Try inserting a test message (replace UUID with actual room_id and sender)
INSERT INTO chat_messages (room_id, sender, content)
VALUES (
  'YOUR_ROOM_ID_HERE',
  auth.uid(),
  'Test message to verify FK fix'
);
*/

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraint fixed!';
  RAISE NOTICE '📊 chat_messages.room_id now references chat_rooms.id (not rooms.id)';
  RAISE NOTICE '🚀 Group chat messages should now work';
END $$;
