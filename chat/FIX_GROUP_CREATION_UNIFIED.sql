-- =====================================================================
-- UNIFIED FIX FOR GROUP CHAT CREATION AND MESSAGING
-- =====================================================================
-- This script addresses all identified issues:
-- 1. Parameter order mismatch between JavaScript and SQL
-- 2. Members not being auto-approved
-- 3. Duplicate group prevention
-- 4. Error handling and atomicity
-- =====================================================================

-- STEP 1: Drop all existing variations of create_group_room
DROP FUNCTION IF EXISTS create_group_room(uuid, text, uuid[], boolean);
DROP FUNCTION IF EXISTS create_group_room(text, uuid, uuid[]);
DROP FUNCTION IF EXISTS create_group_room(uuid, boolean, uuid[], text);
DROP FUNCTION IF EXISTS create_group_room CASCADE;

-- STEP 2: Create unified create_group_room function
-- Parameter order matches JavaScript call:
--   p_creator, p_name, p_member_ids, p_is_private (alphabetical for named params)
CREATE OR REPLACE FUNCTION create_group_room(
  p_creator uuid,
  p_is_private boolean DEFAULT false,
  p_member_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_name text DEFAULT ''
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
  -- Validate: Only the authenticated user can create groups as themselves
  IF p_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: creator must be authenticated user';
  END IF;

  -- Validate: Group name must be at least 2 characters
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 THEN
    RAISE EXCEPTION 'Invalid name: group name must be at least 2 characters';
  END IF;

  -- Log for debugging
  RAISE NOTICE 'Creating group "%" for creator %', p_name, p_creator;

  -- ATOMIC TRANSACTION: Create room and add all members
  BEGIN
    -- Create the group room
    INSERT INTO chat_rooms (type, title, created_by)
    VALUES ('group', TRIM(p_name), p_creator)
    RETURNING id INTO v_room_id;

    RAISE NOTICE 'Group room created with ID: %', v_room_id;

    -- Add creator as admin with approved status
    INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
    VALUES (v_room_id, p_creator, 'admin', 'approved', p_creator);

    RAISE NOTICE 'Creator added as admin';

    -- Add all invited members with APPROVED status (not pending)
    -- This ensures they can immediately see and message in the group
    IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
      FOREACH v_uid IN ARRAY p_member_ids LOOP
        -- Skip if null or same as creator
        IF v_uid IS NOT NULL AND v_uid != p_creator THEN
          -- Insert with ON CONFLICT to prevent duplicates
          INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
          VALUES (v_room_id, v_uid, 'member', 'approved', p_creator)
          ON CONFLICT (room_id, user_id) DO NOTHING;

          RAISE NOTICE 'Added member % as approved', v_uid;
        END IF;
      END LOOP;
    END IF;

    RAISE NOTICE 'Group creation complete: % members added', COALESCE(array_length(p_member_ids, 1), 0);

    -- Return the room ID
    RETURN v_room_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error and re-raise
      RAISE NOTICE 'Error creating group: %', SQLERRM;
      RAISE;
  END;
END;
$$;

-- STEP 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION create_group_room(uuid, boolean, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group_room(uuid, boolean, uuid[], text) TO anon;

-- STEP 4: Fix foreign key constraint (ensure it points to chat_rooms)
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id)
  ON DELETE CASCADE;

-- STEP 5: Ensure primary key exists on chat_messages
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_pkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

-- STEP 6: Fix RLS policies for group creation and messaging
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS cr_insert_own ON public.chat_rooms;
DROP POLICY IF EXISTS cr_select_for_members ON public.chat_rooms;
DROP POLICY IF EXISTS crm_insert_by_creator ON public.chat_room_members;
DROP POLICY IF EXISTS crm_select_member ON public.chat_room_members;
DROP POLICY IF EXISTS cm_insert_member_sender ON public.chat_messages;
DROP POLICY IF EXISTS cm_select_member ON public.chat_messages;

-- Create unified RLS policies

-- chat_rooms: Users can insert rooms they create
CREATE POLICY cr_insert_own
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- chat_rooms: Users can select rooms where they are members
CREATE POLICY cr_select_for_members
  ON public.chat_rooms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members m
      WHERE m.room_id = chat_rooms.id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
    )
    OR created_by = auth.uid()
  );

-- chat_room_members: Group creator can add members during creation
-- (SECURITY DEFINER function bypasses this, but good to have)
CREATE POLICY crm_insert_by_creator
  ON public.chat_room_members FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if you're the creator
    EXISTS (
      SELECT 1 FROM public.chat_rooms r
      WHERE r.id = chat_room_members.room_id
        AND r.created_by = auth.uid()
    )
    OR
    -- Allow if you're adding yourself
    user_id = auth.uid()
  );

-- chat_room_members: Members can view other members in their rooms
CREATE POLICY crm_select_member
  ON public.chat_room_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members m
      WHERE m.room_id = chat_room_members.room_id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

-- chat_messages: Members can insert messages to approved rooms
CREATE POLICY cm_insert_member_sender
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_room_members m
      WHERE m.room_id = chat_messages.room_id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

-- chat_messages: Members can select messages from approved rooms
CREATE POLICY cm_select_member
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members m
      WHERE m.room_id = chat_messages.room_id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

-- STEP 7: Approve any existing pending members (one-time cleanup)
UPDATE chat_room_members
SET status = 'approved'
WHERE status = 'pending';

-- STEP 8: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON chat_messages (room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_status
  ON chat_room_members (room_id, status)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_chat_rooms_creator
  ON chat_rooms (created_by, created_at DESC);

-- STEP 9: Create a helper function to check for duplicate group names
CREATE OR REPLACE FUNCTION check_duplicate_group_name(
  p_name text,
  p_creator uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if a group with this exact name already exists
  -- (where the user is a member)
  SELECT EXISTS(
    SELECT 1
    FROM chat_rooms cr
    JOIN chat_room_members crm ON crm.room_id = cr.id
    WHERE cr.type = 'group'
      AND LOWER(TRIM(cr.title)) = LOWER(TRIM(p_name))
      AND crm.user_id = p_creator
      AND crm.status = 'approved'
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION check_duplicate_group_name(text, uuid) TO authenticated;

-- STEP 10: Verification queries
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ UNIFIED GROUP CHAT FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 RPC Function: create_group_room(p_creator, p_is_private, p_member_ids, p_name)';
  RAISE NOTICE '👥 Members: Auto-approved when added by creator';
  RAISE NOTICE '🔐 Security: SECURITY DEFINER bypasses RLS';
  RAISE NOTICE '⚡ Performance: Indexes added for faster queries';
  RAISE NOTICE '🔄 Cleanup: All pending members approved';
  RAISE NOTICE '';
  RAISE NOTICE 'JavaScript should call:';
  RAISE NOTICE '  supabase.rpc("create_group_room", {';
  RAISE NOTICE '    p_creator: userId,';
  RAISE NOTICE '    p_name: "Group Name",';
  RAISE NOTICE '    p_member_ids: [userId1, userId2, ...],';
  RAISE NOTICE '    p_is_private: false';
  RAISE NOTICE '  })';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Verify function exists
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE proname = 'create_group_room';
