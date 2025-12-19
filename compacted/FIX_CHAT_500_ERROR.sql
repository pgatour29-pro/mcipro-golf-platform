-- =====================================================================
-- FIX CHAT 500 ERROR - Simplify RLS Policies
-- =====================================================================
-- Run this in Supabase SQL Editor if chat_messages query returns 500

-- The 500 error is likely caused by complex RLS policies
-- Let's simplify them to ensure they work with anonymous auth

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;

-- 2. Create simplified policies that work with authenticated users
CREATE POLICY "chat_messages_select_simple"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is in room_members (for DMs)
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = chat_messages.room_id
        AND room_members.user_id = auth.uid()
    ) OR
    -- Allow if user is in chat_room_members with approved status (for groups)
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE chat_room_members.room_id = chat_messages.room_id
        AND chat_room_members.user_id = auth.uid()
        AND chat_room_members.status = 'approved'
    )
  );

CREATE POLICY "chat_messages_insert_simple"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be sender
    sender = auth.uid() AND (
      -- And must be in room_members (for DMs)
      EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = chat_messages.room_id
          AND room_members.user_id = auth.uid()
      ) OR
      -- Or in chat_room_members with approved status (for groups)
      EXISTS (
        SELECT 1 FROM chat_room_members
        WHERE chat_room_members.room_id = chat_messages.room_id
          AND chat_room_members.user_id = auth.uid()
          AND chat_room_members.status = 'approved'
      )
    )
  );

-- 3. Verify policies created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'chat_messages';

-- Expected output:
-- chat_messages | chat_messages_select_simple
-- chat_messages | chat_messages_insert_simple
