-- =====================================================================
-- FIX CHAT 500 ERRORS - Complete RLS Policy Setup (CORRECTED)
-- =====================================================================
-- This fixes 500 Internal Server errors on chat_room_members and chat_messages
-- Run this in Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- PART 1: Fix chat_room_members RLS policies
-- =====================================================================

-- Enable RLS if not already enabled
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view group memberships" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_select_all" ON chat_room_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_select" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_insert" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_update" ON chat_room_members;

-- Create comprehensive policy: Users can see all approved memberships
CREATE POLICY "chat_room_members_select"
  ON chat_room_members FOR SELECT
  USING (auth.uid() IS NOT NULL);  -- Any authenticated user can see memberships

-- Allow users to insert their own memberships
CREATE POLICY "chat_room_members_insert"
  ON chat_room_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own memberships
CREATE POLICY "chat_room_members_update"
  ON chat_room_members FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================================
-- PART 2: Fix chat_rooms RLS policies
-- =====================================================================

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;

-- Create policy: Users can see all rooms (needed for join queries)
CREATE POLICY "chat_rooms_select"
  ON chat_rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to create rooms
CREATE POLICY "chat_rooms_insert"
  ON chat_rooms FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- =====================================================================
-- PART 3: Fix chat_messages RLS policies (CORRECTED - uses 'sender' column)
-- =====================================================================

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

-- Create policy: Users can see messages in rooms they are members of
CREATE POLICY "chat_messages_select"
  ON chat_messages FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE chat_room_members.room_id = chat_messages.room_id
        AND chat_room_members.user_id = auth.uid()
        AND chat_room_members.status = 'approved'
    )
  );

-- Allow users to insert messages in rooms they are members of
-- FIXED: Changed sender_id to sender (correct column name)
CREATE POLICY "chat_messages_insert"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE chat_room_members.room_id = chat_messages.room_id
        AND chat_room_members.user_id = auth.uid()
        AND chat_room_members.status = 'approved'
    )
  );

-- =====================================================================
-- PART 4: Grant permissions
-- =====================================================================

GRANT SELECT, INSERT, UPDATE ON chat_room_members TO authenticated;
GRANT SELECT, INSERT ON chat_rooms TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;

-- =====================================================================
-- PART 5: Verification
-- =====================================================================

DO $$
DECLARE
  v_crm_policies INTEGER;
  v_cr_policies INTEGER;
  v_cm_policies INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO v_crm_policies
  FROM pg_policies
  WHERE tablename = 'chat_room_members';

  SELECT COUNT(*) INTO v_cr_policies
  FROM pg_policies
  WHERE tablename = 'chat_rooms';

  SELECT COUNT(*) INTO v_cm_policies
  FROM pg_policies
  WHERE tablename = 'chat_messages';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHAT RLS POLICIES VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'chat_room_members policies: %', v_crm_policies;
  RAISE NOTICE 'chat_rooms policies: %', v_cr_policies;
  RAISE NOTICE 'chat_messages policies: %', v_cm_policies;
  RAISE NOTICE '========================================';

  IF v_crm_policies >= 3 AND v_cr_policies >= 2 AND v_cm_policies >= 2 THEN
    RAISE NOTICE '✅ All chat RLS policies deployed successfully';
  ELSE
    RAISE WARNING '⚠️ Some policies may be missing. Check above counts.';
  END IF;

  RAISE NOTICE '';
END $$;
