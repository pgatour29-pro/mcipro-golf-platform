-- Fix get_batch_unread_counts to match frontend expectations
-- The frontend passes p_user_id and p_last_read_map (localStorage data)

-- Drop incorrect version
DROP FUNCTION IF EXISTS public.get_batch_unread_counts(UUID[]);

-- Create function matching frontend signature
CREATE OR REPLACE FUNCTION public.get_batch_unread_counts(
    p_user_id UUID,
    p_last_read_map JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(total_unread BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total BIGINT := 0;
    v_room_id UUID;
    v_last_read TIMESTAMPTZ;
    v_count BIGINT;
BEGIN
    -- For each room the user is a member of
    FOR v_room_id IN
        SELECT room_id
        FROM public.chat_room_members
        WHERE user_id = p_user_id
          AND status = 'approved'
    LOOP
        -- Get last_read_at from database first, fallback to localStorage map
        SELECT last_read_at INTO v_last_read
        FROM public.chat_room_members
        WHERE room_id = v_room_id AND user_id = p_user_id;

        -- If no database timestamp, try localStorage map
        IF v_last_read IS NULL AND p_last_read_map ? v_room_id::text THEN
            BEGIN
                v_last_read := (p_last_read_map->>v_room_id::text)::timestamptz;
            EXCEPTION WHEN OTHERS THEN
                v_last_read := NULL;
            END;
        END IF;

        -- Count unread messages in this room
        IF v_last_read IS NULL THEN
            -- No read timestamp - count all messages not from user
            SELECT COUNT(*) INTO v_count
            FROM public.chat_messages
            WHERE room_id = v_room_id
              AND sender != p_user_id;
        ELSE
            -- Count messages after last read
            SELECT COUNT(*) INTO v_count
            FROM public.chat_messages
            WHERE room_id = v_room_id
              AND sender != p_user_id
              AND created_at > v_last_read;
        END IF;

        v_total := v_total + COALESCE(v_count, 0);
    END LOOP;

    RETURN QUERY SELECT v_total;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_batch_unread_counts(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_batch_unread_counts(UUID, JSONB) TO anon;

-- Verification
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_batch_unread_counts';
