-- =====================================================================
-- COMPREHENSIVE FIX: Group creation + messaging
-- =====================================================================
-- Issues:
-- 1. Group creation might be blocked by RLS
-- 2. Messages failing with FK constraint (room doesn't exist)
-- 3. Need to ensure RPC has full privileges
-- =====================================================================

-- STEP 1: Drop and recreate the RPC with explicit RLS bypass
DROP FUNCTION IF EXISTS create_group_room(text, uuid, uuid[]);

CREATE OR REPLACE FUNCTION create_group_room(
  p_title text,
  p_creator uuid,
  p_members uuid[]
)
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

  RAISE NOTICE 'Creating group: %', p_title;

  -- Create the group room (SECURITY DEFINER bypasses RLS)
  INSERT INTO chat_rooms (type, title, created_by)
  VALUES ('group', p_title, p_creator)
  RETURNING id INTO v_room;

  RAISE NOTICE 'Group created with ID: %', v_room;

  -- Creator becomes admin immediately
  INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
  VALUES (v_room, p_creator, 'admin', 'approved', p_creator);

  RAISE NOTICE 'Admin membership created for creator';

  -- Invite others as pending members
  IF array_length(p_members, 1) IS NOT NULL THEN
    FOREACH uid IN ARRAY p_members LOOP
      -- Skip if it's the creator (already added as admin)
      IF uid IS DISTINCT FROM p_creator THEN
        INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
        VALUES (v_room, uid, 'member', 'pending', p_creator)
        ON CONFLICT (room_id, user_id) DO NOTHING;
        RAISE NOTICE 'Invited member: %', uid;
      END IF;
    END LOOP;
  END IF;

  -- Return the room ID
  RAISE NOTICE 'Group creation complete, returning ID: %', v_room;
  RETURN v_room;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_group_room(text, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group_room(text, uuid, uuid[]) TO anon;

-- STEP 2: Ensure RLS policies allow group creation
-- Enable RLS on chat_rooms if not already enabled
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might block inserts
DROP POLICY IF EXISTS "Users can create groups" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow group creation" ON chat_rooms;

-- Create simple, permissive policy for authenticated users
CREATE POLICY "Authenticated users can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow users to view their own rooms
DROP POLICY IF EXISTS "Users can view their rooms" ON chat_rooms;
CREATE POLICY "Users can view their rooms"
ON chat_rooms
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_rooms.id
      AND chat_room_members.user_id = auth.uid()
      AND chat_room_members.status = 'approved'
  )
);

-- STEP 3: Fix chat_room_members RLS
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can join as members" ON chat_room_members;
CREATE POLICY "Users can join as members"
ON chat_room_members
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow any authenticated user to be added

DROP POLICY IF EXISTS "Users can view memberships" ON chat_room_members;
CREATE POLICY "Users can view memberships"
ON chat_room_members
FOR SELECT
TO authenticated
USING (true); -- Allow viewing all memberships for now

-- STEP 4: Fix chat_messages RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;
CREATE POLICY "Users can send messages to their rooms"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_messages.room_id
      AND chat_room_members.user_id = auth.uid()
      AND chat_room_members.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
CREATE POLICY "Users can view messages in their rooms"
ON chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_messages.room_id
      AND chat_room_members.user_id = auth.uid()
      AND chat_room_members.status = 'approved'
  )
);

-- STEP 5: Verify foreign key is correct
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey;

ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_room_id_fkey
FOREIGN KEY (room_id)
REFERENCES chat_rooms(id)
ON DELETE CASCADE;

-- STEP 6: Clean up any orphaned data from failed attempts
-- (Optional - only run if you want to delete test groups)
/*
DELETE FROM chat_room_members WHERE room_id NOT IN (SELECT id FROM chat_rooms);
DELETE FROM chat_messages WHERE room_id NOT IN (SELECT id FROM chat_rooms);
*/

-- STEP 7: Test the RPC (replace with actual values)
/*
SELECT create_group_room(
  'Test Group',
  auth.uid(),
  ARRAY[]::uuid[]
);
*/

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Group creation RPC recreated with logging';
  RAISE NOTICE '✅ RLS policies updated (permissive for testing)';
  RAISE NOTICE '✅ Foreign key constraint verified';
  RAISE NOTICE '🚀 Try creating a group now - check server logs for debug output';
END $$;
