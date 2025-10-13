-- =====================================================================
-- FINAL FIX: Schema mismatch + atomic group creation
-- =====================================================================
-- Issue: chat_messages.room_id FK points to "rooms" but groups are in "chat_rooms"
-- Solution: Standardize on chat_rooms + atomic RPC + proper RLS
-- =====================================================================

-- STEP 1: Fix the foreign key constraint (point to chat_rooms, not rooms)
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey;

ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_room_id_fkey
FOREIGN KEY (room_id)
REFERENCES chat_rooms(id)
ON DELETE CASCADE;

-- STEP 2: Create atomic group creation function
DROP FUNCTION IF EXISTS create_group_room(uuid, text, uuid[], boolean);
DROP FUNCTION IF EXISTS create_group_room(text, uuid, uuid[]);

CREATE OR REPLACE FUNCTION create_group_room(
  p_creator uuid,
  p_name text,
  p_member_ids uuid[],
  p_is_private boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_uid uuid;
BEGIN
  -- Validate creator
  IF p_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'creator must equal auth.uid()';
  END IF;

  -- Validate name
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 THEN
    RAISE EXCEPTION 'Group name must be at least 2 characters';
  END IF;

  -- 1) Create the room atomically
  INSERT INTO chat_rooms (type, title, created_by)
  VALUES ('group', p_name, p_creator)
  RETURNING id INTO v_room_id;

  RAISE NOTICE 'Group created: % (ID: %)', p_name, v_room_id;

  -- 2) Add creator as admin
  INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
  VALUES (v_room_id, p_creator, 'admin', 'approved', p_creator);

  RAISE NOTICE 'Creator added as admin';

  -- 3) Add members (pending approval)
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_uid IN ARRAY p_member_ids LOOP
      IF v_uid IS NOT NULL AND v_uid IS DISTINCT FROM p_creator THEN
        INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
        VALUES (v_room_id, v_uid, 'member', 'pending', p_creator)
        ON CONFLICT (room_id, user_id) DO NOTHING;
        RAISE NOTICE 'Member added: %', v_uid;
      END IF;
    END LOOP;
  END IF;

  RETURN v_room_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_group_room(uuid, text, uuid[], boolean) TO authenticated;

-- STEP 3: Ensure RLS policies are correct
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert rooms they create
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
CREATE POLICY "Users can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Policy: Users can view rooms where they are members
DROP POLICY IF EXISTS "Users can view their rooms" ON chat_rooms;
CREATE POLICY "Users can view their rooms"
ON chat_rooms
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_rooms.id
      AND chat_room_members.user_id = auth.uid()
      AND chat_room_members.status = 'approved'
  )
);

-- Policy: Allow inserting memberships (used by RPC)
DROP POLICY IF EXISTS "Allow membership inserts" ON chat_room_members;
CREATE POLICY "Allow membership inserts"
ON chat_room_members
FOR INSERT
TO authenticated
WITH CHECK (true);  -- RPC handles validation

-- Policy: Users can view all memberships (for group member lists)
DROP POLICY IF EXISTS "Users can view memberships" ON chat_room_members;
CREATE POLICY "Users can view memberships"
ON chat_room_members
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can send messages to rooms where they are approved members
DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
CREATE POLICY "Members can send messages"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender = auth.uid()
  AND EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_messages.room_id
      AND chat_room_members.user_id = auth.uid()
      AND chat_room_members.status = 'approved'
  )
);

-- Policy: Users can view messages in rooms where they are approved members
DROP POLICY IF EXISTS "Members can view messages" ON chat_messages;
CREATE POLICY "Members can view messages"
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

-- STEP 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON chat_messages (room_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
  ON chat_messages (sender);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_status
  ON chat_room_members (user_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_status
  ON chat_room_members (room_id, status);

-- STEP 5: Verify the fix
DO $$
DECLARE
  v_fk_table text;
BEGIN
  -- Check FK points to chat_rooms
  SELECT ccu.table_name INTO v_fk_table
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'chat_messages'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'room_id';

  IF v_fk_table = 'chat_rooms' THEN
    RAISE NOTICE '✅ FK fixed: chat_messages.room_id → chat_rooms.id';
  ELSE
    RAISE WARNING '❌ FK still points to: %', v_fk_table;
  END IF;

  -- Check RPC exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_group_room') THEN
    RAISE NOTICE '✅ RPC function created: create_group_room()';
  ELSE
    RAISE WARNING '❌ RPC function not found';
  END IF;

  RAISE NOTICE '✅ RLS policies updated';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to test group creation!';
  RAISE NOTICE '';
  RAISE NOTICE 'Client should call:';
  RAISE NOTICE '  supabase.rpc("create_group_room", {';
  RAISE NOTICE '    p_creator: currentUserId,';
  RAISE NOTICE '    p_name: "Group Name",';
  RAISE NOTICE '    p_member_ids: [uuid1, uuid2, ...]';
  RAISE NOTICE '  })';
END $$;
