-- Create RPC function for batch unread counts
-- This powers the unread badge feature in the chat system

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_batch_unread_counts(UUID[]);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_batch_unread_counts(
    room_ids UUID[]
)
RETURNS TABLE(room_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- For each room, count messages created after the user's last_read_at timestamp
    -- If no last_read_at exists, count all messages
    RETURN QUERY
    SELECT
        cm.room_id,
        COUNT(msg.id)::BIGINT as unread_count
    FROM UNNEST(room_ids) AS rid
    JOIN public.chat_room_members cm ON cm.room_id = rid
    LEFT JOIN public.chat_messages msg ON msg.room_id = cm.room_id
        AND msg.sender != auth.uid()  -- Don't count own messages
        AND (
            cm.last_read_at IS NULL
            OR msg.created_at > cm.last_read_at
        )
    WHERE cm.user_id = auth.uid()
    GROUP BY cm.room_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_batch_unread_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_batch_unread_counts(UUID[]) TO anon;

-- Add last_read_at column to chat_room_members if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'chat_room_members'
        AND column_name = 'last_read_at'
    ) THEN
        ALTER TABLE public.chat_room_members
        ADD COLUMN last_read_at TIMESTAMPTZ;

        RAISE NOTICE 'Added last_read_at column to chat_room_members';
    END IF;
END $$;

-- Add RLS policy to allow users to update their own last_read_at
DROP POLICY IF EXISTS chat_room_members_update_last_read ON public.chat_room_members;

CREATE POLICY chat_room_members_update_last_read ON public.chat_room_members
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verification
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_batch_unread_counts';
