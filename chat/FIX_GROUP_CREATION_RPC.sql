-- =====================================================================
-- FIX: Group creation using RPC (SECURITY DEFINER) - OPTION A
-- =====================================================================
-- This is the CLEANEST solution - bypasses RLS by using a secure function
-- that validates the creator and handles all inserts atomically.
-- =====================================================================

-- STEP 1: Create the RPC function for group creation
CREATE OR REPLACE FUNCTION create_group_room(p_title text, p_creator uuid, p_members uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room uuid;
  uid uuid;
BEGIN
  -- Only allow authenticated users to call on their own behalf
  IF p_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'creator must equal auth.uid()';
  END IF;

  -- Validate title
  IF p_title IS NULL OR LENGTH(TRIM(p_title)) < 2 THEN
    RAISE EXCEPTION 'Group title must be at least 2 characters';
  END IF;

  -- Create the group room
  INSERT INTO chat_rooms (type, title, created_by)
  VALUES ('group', p_title, p_creator)
  RETURNING id INTO v_room;

  -- Creator becomes admin immediately
  INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
  VALUES (v_room, p_creator, 'admin', 'approved', p_creator);

  -- Invite others as pending members
  IF array_length(p_members, 1) IS NOT NULL THEN
    FOREACH uid IN ARRAY p_members LOOP
      -- Skip if it's the creator (already added as admin)
      IF uid IS DISTINCT FROM p_creator THEN
        INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
        VALUES (v_room, uid, 'member', 'pending', p_creator)
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Return the room ID
  RETURN v_room;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_group_room(text, uuid, uuid[]) TO authenticated;

-- STEP 2: Add performance indexes (reduces backfill pressure)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON chat_messages (room_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created
  ON chat_messages (sender, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created
  ON chat_messages (created_at);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_user
  ON chat_room_members (room_id, user_id);

CREATE INDEX IF NOT EXISTS idx_room_members_room_user
  ON room_members (room_id, user_id);

-- STEP 3: Verify the function was created
SELECT
  'RPC Function Created' as status,
  proname as function_name,
  prosecdef as is_security_definer,
  CASE
    WHEN prosecdef THEN '✅ SECURITY DEFINER (bypasses RLS)'
    ELSE '❌ Not secure'
  END as security_mode
FROM pg_proc
WHERE proname = 'create_group_room';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Group creation RPC function created!';
  RAISE NOTICE '🔐 Function runs as SECURITY DEFINER (bypasses RLS)';
  RAISE NOTICE '📊 Performance indexes added for chat tables';
  RAISE NOTICE '🚀 Client should now call: .rpc("create_group_room", {...})';
END $$;
