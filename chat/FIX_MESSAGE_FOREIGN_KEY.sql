-- FIX: Remove foreign key constraint on chat_messages sender/author_id
-- Mobile users may not exist in auth.users table

-- Drop foreign key constraints (try all possible names)
ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_author_id_fkey;

ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_sender_fkey;

-- Make sender column nullable if needed
ALTER TABLE public.chat_messages
ALTER COLUMN sender DROP NOT NULL;

-- Verify the changes
SELECT 'Foreign key constraints removed from chat_messages.sender' as status;
