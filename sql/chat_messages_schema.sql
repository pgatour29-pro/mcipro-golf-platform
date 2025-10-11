-- =====================================================================
-- CHAT MESSAGES TABLE - REAL-TIME MESSAGING
-- =====================================================================
-- Purpose: Store chat messages between users
-- Date: 2025-10-11
-- =====================================================================

-- Drop table if it exists (clean start)
DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);
CREATE INDEX idx_chat_messages_room_timestamp ON public.chat_messages(room_id, timestamp DESC);

-- Add comments
COMMENT ON TABLE public.chat_messages IS 'Real-time chat messages between users';
COMMENT ON COLUMN public.chat_messages.room_id IS 'Chat room ID (e.g., dm_USER_ID for direct messages)';
COMMENT ON COLUMN public.chat_messages.sender_id IS 'LINE User ID of the sender';
COMMENT ON COLUMN public.chat_messages.message_type IS 'Message type: text, image, file, etc.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from rooms they're in
CREATE POLICY "Users can read their messages"
    ON public.chat_messages
    FOR SELECT
    USING (true);  -- For now, allow all authenticated users to read

-- Policy: Users can send messages
CREATE POLICY "Users can send messages"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (sender_id = current_setting('request.jwt.claims', true)::json->>'line_user_id');

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
    ON public.chat_messages
    FOR DELETE
    USING (sender_id = current_setting('request.jwt.claims', true)::json->>'line_user_id');

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Verify table was created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'chat_messages';

-- Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'chat_messages';

-- Check policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'chat_messages';

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify table was created successfully
-- 3. Test by sending a message in the app
-- 4. Check console for "[Chat] ✅ Message saved to Supabase"
-- =====================================================================
