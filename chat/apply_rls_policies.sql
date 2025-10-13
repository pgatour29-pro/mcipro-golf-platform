-- Apply RLS policies for Chat Fix Kit
-- Run this in Supabase SQL Editor

-- Enable RLS on all chat tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ROOMS policies
DROP POLICY IF EXISTS "select rooms I am in" ON rooms;
CREATE POLICY "select rooms I am in" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.room_id = rooms.id AND cp.participant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert rooms" ON rooms;
CREATE POLICY "insert rooms" ON rooms
  FOR INSERT WITH CHECK (true);

-- CONVERSATION_PARTICIPANTS policies
DROP POLICY IF EXISTS "select my participation" ON conversation_participants;
CREATE POLICY "select my participation" ON conversation_participants
  FOR SELECT USING (participant_id = auth.uid());

DROP POLICY IF EXISTS "insert myself into room" ON conversation_participants;
CREATE POLICY "insert myself into room" ON conversation_participants
  FOR INSERT WITH CHECK (participant_id = auth.uid());

-- CHAT_MESSAGES policies
DROP POLICY IF EXISTS "select msgs in my rooms" ON chat_messages;
CREATE POLICY "select msgs in my rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.room_id = chat_messages.room_id
      AND cp.participant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert msgs as me in my rooms" ON chat_messages;
CREATE POLICY "insert msgs as me in my rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.room_id = chat_messages.room_id
      AND cp.participant_id = auth.uid()
    )
  );

-- Speed indexes
CREATE INDEX IF NOT EXISTS chat_messages_room_created_idx
  ON chat_messages (room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conv_part_participant_idx
  ON conversation_participants (participant_id);
